export async function onRequestPost(context) {
  const { request, env } = context;
  const { name, email, password } = await request.json();

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 500 });
  }

  if (!email || !password || !name) {
    return new Response(JSON.stringify({ error: 'Заполните все поля' }), { status: 400 });
  }

  // проверка существует ли
  const checkRes = await fetch(`${env.SUPABASE_URL}/rest/v1/app_users?email=eq.${encodeURIComponent(email)}&select=id`, {
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`
    }
  });
  const existing = await checkRes.json();
  if (existing && existing.length > 0) {
    return new Response(JSON.stringify({ error: 'Email уже занят' }), { status: 400 });
  }

  // определяем роль - первый пользователь owner
  const countRes = await fetch(`${env.SUPABASE_URL}/rest/v1/app_users?select=id`, {
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Prefer': 'count=exact',
      'Range': '0-0'
    }
  });
  const countHeader = countRes.headers.get('content-range');
  let role = 'user';
  if (!countHeader || countHeader.startsWith('0-0/0') || countHeader.includes('/0')) role = 'owner';
  else {
    // если таблица пустая
    const list = await countRes.json().catch(()=>[]);
    if (!list || list.length === 0) role = 'owner';
  }

  const insertRes = await fetch(`${env.SUPABASE_URL}/rest/v1/app_users`, {
    method: 'POST',
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ name, email, password, role })
  });

  if (!insertRes.ok) {
    const errText = await insertRes.text();
    return new Response(JSON.stringify({ error: 'Ошибка регистрации: ' + errText }), { status: 400 });
  }

  const inserted = await insertRes.json();
  const user = inserted[0];
  return new Response(JSON.stringify({
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: user.role
  }), { headers: { 'Content-Type': 'application/json' } });
}
