// Supabase Edge Function: proxy ClickUp API requests (bypasses CORS)
// Deploy: npx supabase functions deploy clickup-proxy --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, clickup-token',
}

const CLICKUP_BASE = 'https://api.clickup.com/api/v2'

interface ProxyRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  body?: unknown
  clickup_token?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify Supabase auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse proxy request
    const { method, path, body, clickup_token } = (await req.json()) as ProxyRequest

    // Get ClickUp token from body or header (body preferred)
    const clickupToken = clickup_token || req.headers.get('clickup-token')
    if (!clickupToken) {
      return new Response(JSON.stringify({ error: 'Missing ClickUp token' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Proxy to ClickUp API
    const clickupRes = await fetch(`${CLICKUP_BASE}${path}`, {
      method,
      headers: {
        Authorization: clickupToken,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const responseBody = await clickupRes.text()

    // Forward rate limit headers
    const headers: Record<string, string> = {
      ...corsHeaders,
      'Content-Type': 'application/json',
    }
    const rateLimit = clickupRes.headers.get('X-RateLimit-Remaining')
    if (rateLimit) headers['X-RateLimit-Remaining'] = rateLimit
    const retryAfter = clickupRes.headers.get('Retry-After')
    if (retryAfter) headers['Retry-After'] = retryAfter

    return new Response(responseBody, {
      status: clickupRes.status,
      headers,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
