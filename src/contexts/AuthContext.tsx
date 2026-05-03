import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      currentUserIdRef.current = s?.user?.id ?? null;
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      // Si l'utilisateur change (login/logout), on invalide le token Railway
      // pour éviter qu'un ancien JWT périmé reste en cache
      const prevUserId = currentUserIdRef.current;
      const newUserId = s?.user?.id ?? null;
      if (prevUserId !== newUserId) {
        try {
          localStorage.removeItem("railway_jwt");
          localStorage.removeItem("railway_jwt_uid");
          localStorage.removeItem("railway_jwt_email");
          localStorage.removeItem("railway_jwt_version");
        } catch {}
      }
      currentUserIdRef.current = newUserId;
      setSession(s);
      setUser(s?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    try {
      localStorage.removeItem("railway_jwt");
      localStorage.removeItem("railway_jwt_uid");
      localStorage.removeItem("railway_jwt_email");
      localStorage.removeItem("railway_jwt_version");
    } catch {}
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
