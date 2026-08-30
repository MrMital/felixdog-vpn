export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const email = url.searchParams.get('email');
  if (!email) return new Response(JSON.stringify({ error: 'no email' }), { status: 400 });

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 500 });
  }

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/app_users?email=eq.${encodeURIComponent(email)}&select=*`, {
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`
    }
  });
  const data = await res.json();
  if (!data || data.length === 0) {
    return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
  }
  const user = data[0];
  // возвращаем как старый бекенд - без пароля
  return new Response(JSON.stringify({
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
    is_sub_paid: user.is_sub_paid
  }), { headers: { 'Content-Type': 'application/json' } });
}
