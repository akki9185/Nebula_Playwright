const { ImapFlow } = require('imapflow');

/**
 * Poll Gmail via IMAP for a message matching the given subject, sent after a specific date.
 * Retries up to `maxAttempts` times with `delayMs` between attempts.
 *
 * @param {object}  opts
 * @param {string}  opts.emailAddress    Gmail address used to authenticate via IMAP
 * @param {string}  opts.appPassword     16-character Google App Password
 * @param {string}  opts.subjectQuery    Subject line to search for
 * @param {string}  [opts.to]            Filter by recipient address (e.g. the registered sub-address)
 * @param {Date}    [opts.since]         Only match emails received after this date (defaults to last 5 mins)
 * @param {number}  [opts.maxAttempts]   Maximum number of poll attempts (default: 10)
 * @param {number}  [opts.delayMs]       Milliseconds to wait between attempts (default: 6000)
 * @returns {Promise<string>}            Raw MIME source of the matched email, or empty string
 */
async function pollGmailForMessage({
  emailAddress,
  appPassword,
  subjectQuery,
  to,
  since = new Date(Date.now() - 5 * 60 * 1000),
  maxAttempts = 10,
  delayMs = 6000,
}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[Gmail] Polling attempt #${attempt}/${maxAttempts} for subject: "${subjectQuery}"${to ? ' to: ' + to : ''}`);

    const client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: { user: emailAddress, pass: appPassword },
      logger: false,
    });

    try {
      await client.connect();
      const lock = await client.getMailboxLock('[Gmail]/All Mail');

      try {
        const searchCriteria = { subject: subjectQuery, since, unseen: true };
        if (to) {
          searchCriteria.to = to;
        }
        const uids = await client.search(searchCriteria);

        if (uids.length > 0) {
          // Traverse from newest UID; fetch internalDate + source in one call
          for (let i = uids.length - 1; i >= 0; i--) {
            const uid = uids[i];
            const message = await client.fetchOne(uid, { internalDate: true, source: true });
            if (message && message.internalDate && message.internalDate >= since) {
              // Mark as seen so subsequent tests don't pick up this same email
              await client.messageFlagsAdd({ uid }, ['\\Seen']);
              console.log(`[Gmail] ✓ Message found on attempt #${attempt}`);
              return message.source.toString();
            }
          }
        }
        console.log(`[Gmail] No message yet, retrying in ${delayMs / 1000}s...`);
      } finally {
        lock.release();
        await client.logout();
      }
    } catch (err) {
      console.error(`[Gmail] IMAP error on attempt #${attempt}: ${err.message}`);
      try { await client.logout(); } catch (_) {}
    }

    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  console.error(`[Gmail] ✗ Message not found after ${maxAttempts} attempts for subject: "${subjectQuery}"`);
  return '';
}

module.exports = { pollGmailForMessage };
