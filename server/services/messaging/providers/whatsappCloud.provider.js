/**
 * Meta WhatsApp Cloud API provider.
 * Requires: WHATSAPP_TOKEN, WHATSAPP_PHONE_ID (from Meta developer console).
 * `to` must be an E.164 number without the leading + (e.g. 919800000001).
 */
module.exports = {
  channel: 'whatsapp',
  async send({ to, body }) {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;
    if (!token || !phoneId) throw new Error('WHATSAPP_TOKEN / WHATSAPP_PHONE_ID not configured');

    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to.replace(/^\+/, ''),
        type: 'text',
        text: { body },
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`WhatsApp API ${res.status}: ${detail.slice(0, 200)}`);
    }
  },
};
