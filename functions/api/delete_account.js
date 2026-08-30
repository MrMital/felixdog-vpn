export async function onRequestPost(context) {
  const { request, env } = context;
  const { email, password } = await request.json();

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 500 });
  }

  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'Email и пароль обязательны' }), { status: 400 });
  }

  // проверяем пароль
  const checkRes = await fetch(`${env.SUPABASE_URL}/rest/v1/app_users?email=eq.${encodeURIComponent(email)}&password=eq.${encodeURIComponent(password)}&select=id`, {
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`
    }
  });
  const data = await checkRes.json();
  if (!data || data.length === 0) {
    return new Response(JSON.stringify({ error: 'Неверный пароль' }), { status: 401 });
  }

  const id = data[0].id;
  const delRes = await fetch(`${env.SUPABASE_URL}/rest/v1/app_users?id=eq.${id}`, {
    method: 'DELETE',
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`
    }
  });

  if (!delRes.ok) {
    return new Response(JSON.stringify({ error: 'Ошибка удаления' }), { status: 400 });
  }

  return new Response(JSON.stringify({ message: 'Аккаунт удален' }), { headers: { 'Content-Type': 'application/json' } });
}
