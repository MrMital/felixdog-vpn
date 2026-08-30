export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { amount = 150, method = 'sbp', username = '', email = '' } = body;

    if (!env.YOOKASSA_SHOP_ID || !env.YOOKASSA_SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'YOOKASSA keys not set' }), { status: 500 });
    }

    const idempotenceKey = crypto.randomUUID();

    const yooPayload = {
      amount: { value: String(amount), currency: "RUB" },
      capture: true,
      confirmation: {
        type: "redirect",
        return_url: env.SITE_URL || "https://example.com"
      },
      description: `Felix VPN ${amount}₽ для ${username || email || 'гость'}`,
      metadata: { tg_username: username || '', email: email || '' }
    };

    const auth = btoa(`${env.YOOKASSA_SHOP_ID}:${env.YOOKASSA_SECRET_KEY}`);
    const yooRes = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotence-Key': idempotenceKey,
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify(yooPayload)
    });

    const yooData = await yooRes.json();
    if (!yooRes.ok) {
      return new Response(JSON.stringify({ error: yooData.description || 'YooKassa error', raw: yooData }), { status: 400 });
    }

    // Сохраняем в Supabase
    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY) {
      await fetch(`${env.SUPABASE_URL}/rest/v1/payments`, {
        method: 'POST',
        headers: {
          'apikey': env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          yookassa_id: yooData.id,
          amount,
          method,
          status: yooData.status,
          tg_username: username,
          email,
          confirmation_url: yooData.confirmation?.confirmation_url
        })
      });
    }

    return new Response(JSON.stringify({
      confirmation_url: yooData.confirmation?.confirmation_url,
      payment_id: yooData.id,
      status: yooData.status
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
