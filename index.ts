import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing credentials' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { username, password } = await req.json();
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      return new Response(JSON.stringify({ error: 'Username and password required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Service role client: looks up the email for the given username without
    // exposing it to the client, then verifies the password via normal auth.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const uname = username.trim().toLowerCase().replace(/^@/, '');
    const { data: profile, error: pErr } = await admin
      .from('profiles')
      .select('id')
      .eq('username', uname)
      .maybeSingle();
    if (pErr || !profile) {
      return new Response(JSON.stringify({ error: 'No account found with that username' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // fetch the email for this user id from auth schema via admin API
    const { data: userData, error: uErr } = await admin.auth.admin.getUserById(profile.id);
    if (uErr || !userData?.user?.email) {
      return new Response(JSON.stringify({ error: 'Account lookup failed' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify password by signing in with the resolved email using a fresh
    // anon client, so Supabase handles rate limiting and validation.
    const anon = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data: signIn, error: sErr } = await anon.auth.signInWithPassword({
      email: userData.user.email,
      password,
    });
    if (sErr || !signIn.session) {
      return new Response(JSON.stringify({ error: sErr?.message ?? 'Invalid credentials' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return the session to the client so it can take over token refresh.
    return new Response(
      JSON.stringify({
        access_token: signIn.session.access_token,
        refresh_token: signIn.session.refresh_token,
        expires_in: signIn.session.expires_in,
        user: signIn.session.user,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
