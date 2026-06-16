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
      if (!contentType.includes('application/json')) {
        return json({ error: 'Unsupported content type' }, 415, corsHeaders);
      }

      const data = await request.json();
      const first = cleanText(data.first, 80);
      const last = cleanText(data.last, 80);
      const email = cleanText(data.email, 160);
      const company = cleanText(data.company, 120);
      const topic = cleanText(data.topic, 120);
      const message = cleanText(data.message, 3000, true);

      if (!email || !message || !isEmail(email)) {
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
        return json({ error: 'Failed to send email' }, 500, corsHeaders);
      }

      return json({ success: true }, 200, corsHeaders);

    } catch (err) {
      console.error('Worker error:', err);
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
