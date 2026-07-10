/** Dev provider: prints the message instead of sending it. */
module.exports = {
  channel: 'console',
  async send({ to, body }) {
    console.log(`[Messaging:console] → ${to}\n${body}`);
    return { simulated: true };
  },
};
