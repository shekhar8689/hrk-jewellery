/**
 * HRK Jewellery — sends password-reset emails from YOUR Gmail.
 *
 * 1. Open https://script.google.com while signed in to the shop's Gmail → New project.
 * 2. Delete what's there, paste this whole file, and change SECRET below to your own
 *    long secret (letters and numbers, 8+ characters). Save.
 * 3. Deploy → New deployment → type "Web app" → Execute as: Me → Who has access: Anyone → Deploy.
 *    Allow the permissions Google asks for (Advanced → Go to project → Allow).
 * 4. Copy the Web app URL (ends with /exec).
 * 5. On Render → your server → Environment, add:
 *      GMAIL_SCRIPT_URL = that URL
 *      EMAIL_SECRET     = the same secret as below
 */
const SECRET = 'CHANGE-ME-to-a-long-secret'

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents)
    if (!d.secret || d.secret !== SECRET) return reply({ ok: false, error: 'wrong secret' })
    if (!d.to || !d.subject) return reply({ ok: false, error: 'missing to or subject' })
    MailApp.sendEmail({
      to: d.to,
      subject: d.subject,
      body: d.text || '',
      htmlBody: d.html || d.text || '',
      name: 'HRK Jewellery',
    })
    return reply({ ok: true })
  } catch (err) {
    return reply({ ok: false, error: String(err && err.message || err) })
  }
}

// Lets you check the URL in a browser: it should say "HRK email sender is working"
function doGet() { return ContentService.createTextOutput('HRK email sender is working') }

function reply(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON) }
