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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const emailReady = () => !!(process.env.BREVO_API_KEY && process.env.EMAIL_FROM)

// Plain-words explanation of why email can't be sent (null = settings look fine)
function settingsProblem() {
  const key = (process.env.BREVO_API_KEY || '').trim(), from = process.env.EMAIL_FROM || ''
  if (!key || !from) return 'BREVO_API_KEY and/or EMAIL_FROM are missing on Render (your server → Environment). Add both, save, and wait for Render to restart.'
  if (key.startsWith('xsmtpsib-')) return "BREVO_API_KEY is Brevo's SMTP key (starts with xsmtpsib-). Create an API key instead: Brevo → SMTP & API → API Keys → Generate (it starts with xkeysib-)."
  if (!EMAIL_RE.test(parseFrom(from).email)) return 'EMAIL_FROM must look like: HRK Jewellery <yourname@gmail.com>'
  return null
}

// What Brevo's answer means, in plain words
function explain(status, body) {
  const msg = String(body?.message || '')
  if (status === 401) return `Brevo rejected the API key (${msg || 'unauthorized'}). Copy the key again from Brevo → SMTP & API → API Keys and paste it into BREVO_API_KEY on Render.`
  if (/sender/i.test(msg)) return `The sender in EMAIL_FROM isn't verified in Brevo (${msg}). Brevo → Senders, Domains & Dedicated IPs → Senders → add and verify that exact email.`
  if (status === 403 || /activat|suspend|blocked/i.test(msg)) return `Your Brevo account is not activated for sending yet (${msg || 'permission denied'}). Check Brevo's emails to you, or contact Brevo support to activate transactional email.`
  if (status === 429) return 'Brevo daily limit reached (300 emails a day on the free plan). Try again tomorrow.'
  return `Brevo answered ${status}: ${msg || 'unknown error'}`
}

async function sendEmail({ to, toName, subject, html, text }) {
  const problem = settingsProblem()
  if (problem) { console.error('Email not sent:', problem); return { sent: false, problem } }
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY.trim(), 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: parseFrom(process.env.EMAIL_FROM), to: [{ email: to, ...(toName ? { name: toName } : {}) }], subject, htmlContent: html, textContent: text }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const why = explain(res.status, body)
      console.error('Email not sent:', why)
      return { sent: false, problem: why }
    }
    return { sent: true }
  } catch (err) {
    console.error('Email not sent:', err.message)
    return { sent: false, problem: `Could not reach Brevo: ${err.message}` }
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

module.exports = { sendEmail, emailReady, settingsProblem, siteUrl, resetEmail }
