const MessageLog = require('../../models/MessageLog');
const consoleProvider = require('./providers/console.provider');
const whatsappCloudProvider = require('./providers/whatsappCloud.provider');
const twilioSmsProvider = require('./providers/twilioSms.provider');

const PROVIDERS = {
  console: consoleProvider,
  'whatsapp-cloud': whatsappCloudProvider,
  'twilio-sms': twilioSmsProvider,
};

/**
 * Channel-agnostic outbound messaging (WhatsApp / SMS).
 *
 * Provider is chosen via MESSAGING_PROVIDER env:
 *   console        — logs the message; default for local dev, no credentials
 *   whatsapp-cloud — Meta WhatsApp Cloud API (WHATSAPP_TOKEN, WHATSAPP_PHONE_ID)
 *   twilio-sms     — Twilio SMS REST API (TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM)
 *
 * Fire-and-forget: failures are logged to MessageLog, never thrown.
 */
async function sendMessage({ to, template, body, studentId }) {
  if (!to) return; // nothing to send to — silently skip

  const name = process.env.MESSAGING_PROVIDER || 'console';
  const provider = PROVIDERS[name] || consoleProvider;

  let status = 'sent';
  let error;
  try {
    const result = await provider.send({ to, body });
    if (result?.simulated) status = 'simulated';
  } catch (err) {
    status = 'failed';
    error = err.message;
    console.error(`[Messaging] ${name} send to ${to} failed:`, err.message);
  }

  await MessageLog.create({
    to,
    channel: provider.channel,
    template,
    body,
    status,
    error,
    student: studentId,
  }).catch((err) => console.error('[Messaging] log write failed:', err.message));
}

module.exports = { sendMessage };
