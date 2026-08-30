export async function onRequestPost(context) {
  const { request, env } = context;
  const { email, avatar, name } = await request.json();

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 500 });
  }

  if (!email) return new Response(JSON.stringify({ error: 'no email' }), { status: 400 });

  const patchData = {};
  if (avatar) patchData.avatar = avatar;
  if (name) patchData.name = name;

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/app_users?email=eq.${encodeURIComponent(email)}`, {
    method: 'PATCH',
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(patchData)
  });

  if (!res.ok) {
    return new Response(JSON.stringify({ error: 'update failed' }), { status: 400 });
  }

  const data = await res.json();
  return new Response(JSON.stringify({ success: true, user: data[0] }), { headers: { 'Content-Type': 'application/json' } });
}
