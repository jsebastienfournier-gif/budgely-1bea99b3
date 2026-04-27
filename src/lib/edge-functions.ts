import { supabase } from "@/integrations/supabase/client";

const parseFunctionResponse = (text: string) => {
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

const getFunctionErrorMessage = (payload: unknown, status: number) => {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof (payload as { error?: unknown }).error === "string"
  ) {
    return (payload as { error: string }).error;
  }

  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  return `Edge function returned ${status}`;
};

export const invokeAuthenticatedFunction = async <T>(
  functionName: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<T> => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    throw sessionError;
  }

  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new Error("Session expirée. Veuillez vous reconnecter.");
  }

  const headers: Record<string, string> = {
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${accessToken}`,
    ...(extraHeaders || {}),
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`,
    {
      method: "POST",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    },
  );

  const responseText = await response.text();
  const payload = parseFunctionResponse(responseText);

  if (!response.ok) {
    throw new Error(getFunctionErrorMessage(payload, response.status));
  }

  return payload as T;
};