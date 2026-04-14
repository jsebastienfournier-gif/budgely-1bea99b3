const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RAILWAY_BASE = 'https://budgely-backend-production.up.railway.app'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const action = url.searchParams.get('action') // "init" or "transactions"
  const userId = url.searchParams.get('user_id')

  if (!userId || !action) {
    return new Response(JSON.stringify({ error: 'Missing action or user_id' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let targetUrl: string
  if (action === 'init') {
    targetUrl = `${RAILWAY_BASE}/powens/init?user_id=${encodeURIComponent(userId)}`
  } else if (action === 'transactions') {
    targetUrl = `${RAILWAY_BASE}/powens/transactions?user_id=${encodeURIComponent(userId)}`
  } else {
    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const res = await fetch(targetUrl)
    const data = await res.json()
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
