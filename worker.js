export default {
  async fetch(request, env) {

    // Allow CORS for your domain
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const data = await request.json();
      const { first, last, email, company, topic, message } = data;

      // Basic validation
      if (!email || !message) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Send via Resend
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Ventari Kontaktformular <onboarding@resend.dev>',
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
                  <td style="padding: 8px 0; font-weight: 600;">${first} ${last}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">E-Mail</td>
                  <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #4a8cff;">${email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Unternehmen</td>
                  <td style="padding: 8px 0;">${company || '–'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Thema</td>
                  <td style="padding: 8px 0;">${topic || '–'}</td>
                </tr>
              </table>

              <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />

              <p style="color: #666; margin-bottom: 8px;">Nachricht</p>
              <p style="background: #f9f9f9; padding: 16px; border-radius: 6px; line-height: 1.7;">${message.replace(/\n/g, '<br/>')}</p>

              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
              <p style="color: #aaa; font-size: 12px;">Gesendet über ventari.eu – direkt antworten um den Absender zu erreichen.</p>
            </div>
          `,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error('Resend error:', err);
        return new Response(JSON.stringify({ error: 'Failed to send email' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (err) {
      console.error('Worker error:', err);
      return new Response(JSON.stringify({ error: 'Server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
