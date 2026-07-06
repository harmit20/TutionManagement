/**
 * Twilio SMS provider (plain REST — no SDK dependency).
 * Requires: TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM.
 */
module.exports = {
  channel: 'sms',
  async send({ to, body }) {
    const sid = process.env.TWILIO_SID;
    const token = process.env.TWILIO_TOKEN;
    const from = process.env.TWILIO_FROM;
    if (!sid || !token || !from) throw new Error('TWILIO_SID / TWILIO_TOKEN / TWILIO_FROM not configured');

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Twilio API ${res.status}: ${detail.slice(0, 200)}`);
    }
  },
};
