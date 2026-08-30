export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const payment_id = url.searchParams.get('payment_id');

  if (!payment_id) return new Response(JSON.stringify({ error: 'no payment_id' }), { status: 400 });

  try {
    if (!env.YOOKASSA_SHOP_ID || !env.YOOKASSA_SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'YOOKASSA keys missing' }), { status: 500 });
    }
    const auth = btoa(`${env.YOOKASSA_SHOP_ID}:${env.YOOKASSA_SECRET_KEY}`);
    const yooRes = await fetch(`https://api.yookassa.ru/v3/payments/${payment_id}`, {
      headers: { 'Authorization': `Basic ${auth}` }
    });
    const yooData = await yooRes.json();
    if (!yooRes.ok) return new Response(JSON.stringify({ error: yooData.description }), { status: 400 });

    if (yooData.status === 'succeeded' && env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY) {
      await fetch(`${env.SUPABASE_URL}/rest/v1/payments?yookassa_id=eq.${payment_id}`, {
        method: 'PATCH',
        headers: {
          'apikey': env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'succeeded' })
      });

      const email = yooData.metadata?.email;
      if (email) {
        await fetch(`${env.SUPABASE_URL}/rest/v1/app_users?email=eq.${encodeURIComponent(email)}`, {
          method: 'PATCH',
          headers: {
            'apikey': env.SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ is_sub_paid: true, tg_username: yooData.metadata?.tg_username || null })
        });
      }
    }

    return new Response(JSON.stringify({ status: yooData.status, paid: yooData.status === 'succeeded', raw: yooData }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
