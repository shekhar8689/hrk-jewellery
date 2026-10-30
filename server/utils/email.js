/*
 * Sends email through Brevo's web API (free: 300 emails a day).
 * Render's free plan blocks normal SMTP email, so a web API is used.
 * Set on Render: BREVO_API_KEY and EMAIL_FROM ("HRK Jewellery <you@gmail.com>").
 * Without them, nothing is sent and { sent: false } is returned.
 */
const parseFrom = from => {
  const m = String(from || '').match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/)
  return m ? { name: m[1] || 'HRK Jewellery', email: m[2] } : { name: 'HRK Jewellery', email: String(from || '').trim() }
}

const emailReady = () => !!(process.env.BREVO_API_KEY && process.env.EMAIL_FROM)

async function sendEmail({ to, toName, subject, html, text }) {
  if (!emailReady()) return { sent: false, reason: 'not-configured' }
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: parseFrom(process.env.EMAIL_FROM), to: [{ email: to, ...(toName ? { name: toName } : {}) }], subject, htmlContent: html, textContent: text }),
    })
    if (!res.ok) { console.error('Email not sent: Brevo answered', res.status); return { sent: false, reason: 'provider-error' } }
    return { sent: true }
  } catch (err) {
    console.error('Email not sent:', err.message)
    return { sent: false, reason: 'network' }
  }
}

// The shop's website address (first FRONTEND_URL)
const siteUrl = () => ((process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0] || '').trim().replace(/\/+$/, '')

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

function resetEmail(name, link) {
  return {
    subject: 'Reset your HRK Jewellery password',
    text: `Hi ${name},\n\nTap this link to choose a new password (valid for 1 hour):\n${link}\n\nIf you didn't ask for this, ignore this email.\n\nHRK Jewellery`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#111">
<h2 style="font-weight:normal">HRK <span style="color:#c2662d">Jewellery</span></h2>
<p>Hi ${esc(name)},</p><p>Tap the button to choose a new password. The link works for 1 hour.</p>
<p><a href="${esc(link)}" style="display:inline-block;background:#c2662d;color:#fff;padding:12px 22px;text-decoration:none;border-radius:4px">Reset password</a></p>
<p style="font-size:12px;color:#666">Or copy this link: ${esc(link)}</p>
<p style="font-size:12px;color:#666">If you didn't ask for this, you can ignore this email.</p></div>`,
  }
}

module.exports = { sendEmail, emailReady, siteUrl, resetEmail }
