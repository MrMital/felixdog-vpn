export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  let username = url.searchParams.get('username') || '';
  username = username.trim();
  if (username && !username.startsWith('@')) username = '@' + username;

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ paid: false, message: 'Supabase not configured' }), { status: 500 });
  }

  try {
    // 1. Проверяем bot_payments
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/bot_payments?tg_username=eq.${encodeURIComponent(username)}&select=*`, {
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`
      }
    });
    const data = await res.json();
    if (data && data.length > 0 && data[0].paid) {
      return new Response(JSON.stringify({ paid: true, username }), { headers: { 'Content-Type': 'application/json' } });
    }

    // 2. Проверяем платежи со статусом succeeded по username
    const res2 = await fetch(`${env.SUPABASE_URL}/rest/v1/payments?tg_username=eq.${encodeURIComponent(username)}&status=eq.succeeded&select=*`, {
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`
      }
    });
    const data2 = await res2.json();
    if (data2 && data2.length > 0) {
      return new Response(JSON.stringify({ paid: true, username, source: 'site_payment' }), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ paid: false, message: 'Оплата не найдена для ' + username + '. Убедитесь что оплатили через бота @FelixVpnbot_bot' }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ paid: false, error: e.message }), { status: 500 });
  }
}
