export default {
  async fetch(request, env) {
    const allowedOrigins = new Set([
      'https://ventari.eu',
      'https://www.ventari.eu',
    ]);

    const origin = request.headers.get('Origin');
    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : 'https://ventari.eu',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const contentType = request.headers.get('Content-Type') || '';
      const wantsHtml = (request.headers.get('Accept') || '').includes('text/html') && !contentType.includes('application/json');
      if (
        !contentType.includes('application/json') &&
        !contentType.includes('application/x-www-form-urlencoded') &&
        !contentType.includes('multipart/form-data')
      ) {
        return json({ error: 'Unsupported content type' }, 415, corsHeaders);
      }

      const data = contentType.includes('application/json')
        ? await request.json()
        : Object.fromEntries(await request.formData());
      const first = cleanText(data.first, 80);
      const last = cleanText(data.last, 80);
      const email = cleanText(data.email, 160);
      const company = cleanText(data.company, 120);
      const topic = cleanText(data.topic, 120);
      const message = cleanText(data.message, 3000, true);

      if (!email || !message || !isEmail(email)) {
        if (wantsHtml) {
          return htmlMessage('Anfrage nicht gesendet', 'Bitte geben Sie eine gültige E-Mail-Adresse und eine Nachricht ein.', 400);
        }
        return json({ error: 'Missing or invalid required fields' }, 400, corsHeaders);
      }

      // Send via Resend
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Ventari Kontaktformular <kontakt@ventari.eu>',
          to: ['hello@ventari.eu', 'danielbaran1995@gmail.com'],
          reply_to: email,
          subject: `Neue Anfrage von ${first} ${last} – ${company}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4a8cff; margin-bottom: 4px;">Neue Anfrage über ventari.eu</h2>
              <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />

              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; width: 140px;">Name</td>
                  <td style="padding: 8px 0; font-weight: 600;">${escapeHtml(first)} ${escapeHtml(last)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">E-Mail</td>
                  <td style="padding: 8px 0;"><a href="mailto:${escapeHtml(email)}" style="color: #4a8cff;">${escapeHtml(email)}</a></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Unternehmen</td>
                  <td style="padding: 8px 0;">${escapeHtml(company || '–')}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Thema</td>
                  <td style="padding: 8px 0;">${escapeHtml(topic || '–')}</td>
                </tr>
              </table>

              <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />

              <p style="color: #666; margin-bottom: 8px;">Nachricht</p>
              <p style="background: #f9f9f9; padding: 16px; border-radius: 6px; line-height: 1.7;">${escapeHtml(message).replace(/\n/g, '<br/>')}</p>

              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
              <p style="color: #aaa; font-size: 12px;">Gesendet über ventari.eu – direkt antworten um den Absender zu erreichen.</p>
            </div>
          `,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error('Resend error:', err);
        if (wantsHtml) {
          return htmlMessage('Anfrage nicht gesendet', 'Der Mailversand ist fehlgeschlagen. Bitte versuchen Sie es später erneut oder schreiben Sie direkt an hello@ventari.eu.', 500);
        }
        return json({ error: 'Failed to send email' }, 500, corsHeaders);
      }

      if (wantsHtml) {
        return htmlMessage('Anfrage gesendet', 'Vielen Dank. Wir melden uns innerhalb von 24 Stunden bei Ihnen.', 200);
      }
      return json({ success: true }, 200, corsHeaders);

    } catch (err) {
      console.error('Worker error:', err);
      const acceptsHtml = (request.headers.get('Accept') || '').includes('text/html');
      if (acceptsHtml) {
        return htmlMessage('Anfrage nicht gesendet', 'Es ist ein Serverfehler aufgetreten. Bitte versuchen Sie es später erneut oder schreiben Sie direkt an hello@ventari.eu.', 500);
      }
      return json({ error: 'Server error' }, 500, corsHeaders);
    }
  },
};

function json(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function cleanText(value, maxLength, allowMultiline = false) {
  const text = String(value || '').trim().slice(0, maxLength);
  return allowMultiline ? text.replace(/\r/g, '') : text.replace(/[\r\n\t]+/g, ' ');
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function htmlMessage(title, message, status) {
  return new Response(`<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} | Ventari</title>
  <style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#07080f;color:#f4f6fb;font-family:Arial,sans-serif;line-height:1.6}
    main{width:min(560px,calc(100% - 2rem));padding:2rem;border:1px solid rgba(74,140,255,.2);background:#0c0e18;border-radius:10px}
    h1{font-size:1.8rem;margin:0 0 1rem;color:#4a8cff}
    p{color:#c2c8df;margin:0 0 1.5rem}
    a{color:#4a8cff}
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(message)}</p>
    <a href="https://ventari.eu/#contact">Zurueck zur Website</a>
  </main>
</body>
</html>`, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Cache-Control': 'no-store',
    },
  });
}
