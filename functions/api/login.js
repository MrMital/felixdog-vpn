export async function onRequestPost(context) {
  const { request, env } = context;
  const { email, password } = await request.json();

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 500 });
  }

  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'Email и пароль обязательны' }), { status: 400 });
  }

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/app_users?email=eq.${encodeURIComponent(email)}&password=eq.${encodeURIComponent(password)}&select=*`, {
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`
    }
  });
  const data = await res.json();
  if (!data || data.length === 0) {
    return new Response(JSON.stringify({ error: 'Неверный email или пароль' }), { status: 401 });
  }

  const user = data[0];
  return new Response(JSON.stringify({
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
    is_sub_paid: user.is_sub_paid
  }), { headers: { 'Content-Type': 'application/json' } });
}
