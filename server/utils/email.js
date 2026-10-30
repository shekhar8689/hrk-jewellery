/*
 * Sends email in one of three ways (the first one that is set up is used):
 *  0. Resend (free: 100 emails a day) — set RESEND_API_KEY and EMAIL_FROM
 *     ("HRK Jewellery <orders@yourdomain.in>"). Needs your own domain verified
 *     at resend.com/domains; it can't send as a @gmail.com address.
 *  1. Your own Gmail, through a Google Apps Script web app (free, ~100 emails a day).
 *     Set on Render: GMAIL_SCRIPT_URL (the script's /exec address) and EMAIL_SECRET
 *     (same secret as in the script). See server/gmail-sender.gs. Used first when set.
 *  2. Brevo's web API (free: 300 emails a day) — needs your own domain as sender.
 * Render's free plan blocks normal SMTP email, so a web API is used.
 * Set on Render: BREVO_API_KEY and EMAIL_FROM ("HRK Jewellery <you@gmail.com>").
 * Without them, nothing is sent and { sent: false } is returned.
 */
const parseFrom = from => {
  const m = String(from || '').match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/)
  return m ? { name: m[1] || 'HRK Jewellery', email: m[2] } : { name: 'HRK Jewellery', email: String(from || '').trim() }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const resendMode = () => !!(process.env.RESEND_API_KEY || '').trim()
const gmailMode = () => !resendMode() && !!(process.env.GMAIL_SCRIPT_URL || '').trim()
const emailReady = () => resendMode() ? !!process.env.EMAIL_FROM
  : gmailMode() ? !!process.env.EMAIL_SECRET : !!(process.env.BREVO_API_KEY && process.env.EMAIL_FROM)

const FREE_MAIL = /@(gmail|googlemail|yahoo|outlook|hotmail|live|rediffmail|icloud)\./i
function resendProblem() {
  const key = process.env.RESEND_API_KEY.trim(), from = (process.env.EMAIL_FROM || '').trim()
  if (!key.startsWith('re_')) return 'RESEND_API_KEY doesn\'t look like a Resend key (it starts with re_). Copy it again from resend.com → API Keys.'
  if (!from) return 'EMAIL_FROM is missing on Render. Set it to an address on your domain, e.g. HRK Jewellery <orders@hrkjewellery.in>'
  const email = parseFrom(from).email
  if (!EMAIL_RE.test(email)) return 'EMAIL_FROM must look like: HRK Jewellery <orders@hrkjewellery.in>'
  if (FREE_MAIL.test(email)) return `Resend can't send as ${email}. Use an address on your own domain (e.g. orders@hrkjewellery.in) after verifying the domain at resend.com/domains.`
  return null
}

// What Resend's answer means, in plain words
function explainResend(status, body) {
  const msg = String(body?.message || '')
  if (/verify a domain|not verified|domain is not|testing emails/i.test(msg))
    return `Resend: verify your domain first (resend.com → Domains → add the DNS records it shows at your domain company, then wait until it says Verified). EMAIL_FROM must use that domain. (${msg})`
  if (status === 401 || /api key/i.test(msg) || body?.name === 'missing_api_key' || body?.name === 'invalid_api_key')
    return `Resend rejected RESEND_API_KEY (${msg || 'unauthorized'}). Create a new key at resend.com → API Keys and paste it on Render.`
  if (status === 429 || /quota|rate limit/i.test(msg)) return 'Resend daily limit reached (100 emails a day on the free plan). Try again tomorrow.'
  return `Resend answered ${status}: ${msg || 'unknown error'}`
}

async function sendViaResend({ to, toName, subject, html, text }) {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM.trim(), to: [to], subject, html, text }),
    })
    if (res.ok) return { sent: true }
    const body = await res.json().catch(() => ({}))
    const why = explainResend(res.status, body)
    console.error('Email not sent:', why)
    return { sent: false, problem: why }
  } catch (err) {
    console.error('Email not sent:', err.message)
    return { sent: false, problem: `Could not reach Resend: ${err.message}` }
  }
}

function gmailProblem() {
  const url = (process.env.GMAIL_SCRIPT_URL || '').trim(), secret = (process.env.EMAIL_SECRET || '').trim()
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url)) return 'GMAIL_SCRIPT_URL must be the Web app URL from Apps Script (Deploy → Manage deployments). It looks like https://script.google.com/macros/s/…/exec'
  if (secret.length < 8) return 'EMAIL_SECRET is missing or too short on Render. Use the same secret (8+ characters) that you typed in the script.'
  return null
}

// What the Apps Script answered, in plain words
function explainGmail(error) {
  const e = String(error || '')
  if (/secret/i.test(e)) return 'The script refused the secret. EMAIL_SECRET on Render must be exactly the same as SECRET in the script (then Deploy → New version).'
  if (/too many times|quota|limit/i.test(e)) return 'Gmail daily limit reached (about 100 emails a day). Try again tomorrow.'
  return `The Gmail script answered: ${e || 'unknown error'}`
}

async function sendViaGmail({ to, toName, subject, html, text }) {
  try {
    const res = await fetch(process.env.GMAIL_SCRIPT_URL.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ secret: process.env.EMAIL_SECRET.trim(), to, name: toName || '', subject, html, text }),
      redirect: 'follow',
    })
    const raw = await res.text()
    let body
    try { body = JSON.parse(raw) } catch {
      const why = 'The Gmail script sent back a web page instead of an answer. In Apps Script: Deploy → Manage deployments → edit → "Who has access" must be "Anyone", then Deploy, and copy the /exec URL again.'
      console.error('Email not sent:', why); return { sent: false, problem: why }
    }
    if (body && body.ok) return { sent: true }
    const why = explainGmail(body && body.error)
    console.error('Email not sent:', why)
    return { sent: false, problem: why }
  } catch (err) {
    console.error('Email not sent:', err.message)
    return { sent: false, problem: `Could not reach the Gmail script: ${err.message}` }
  }
}

// Plain-words explanation of why email can't be sent (null = settings look fine)
function settingsProblem() {
  if (resendMode()) return resendProblem()
  if (gmailMode()) return gmailProblem()
  const key = (process.env.BREVO_API_KEY || '').trim(), from = process.env.EMAIL_FROM || ''
  if (!key || !from) return 'Email is not set up on Render. Add RESEND_API_KEY and EMAIL_FROM (Resend, with your own domain), or GMAIL_SCRIPT_URL and EMAIL_SECRET (Gmail sender). Save and wait for Render to restart.'
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
  if (resendMode()) return sendViaResend({ to, toName, subject, html, text })
  if (gmailMode()) return sendViaGmail({ to, toName, subject, html, text })
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
