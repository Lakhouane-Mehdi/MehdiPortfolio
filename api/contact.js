// POST /api/contact
// Receives contact form submissions, stores in Supabase messages table.
// Honeypot field for spam, rate-limited by IP hash.

import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SALT_PEPPER = process.env.SALT_PEPPER || 'portfolio'

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
})

function hashIp(ip) {
  const today = new Date().toISOString().slice(0, 10)
  return crypto.createHash('sha256').update(today + SALT_PEPPER + ip).digest('hex')
}

function uaFamily(ua = '') {
  if (/bot|crawl|spider/i.test(ua)) return 'bot'
  if (/Firefox/i.test(ua)) return 'Firefox'
  if (/Edg/i.test(ua)) return 'Edge'
  if (/Chrome/i.test(ua)) return 'Chrome'
  if (/Safari/i.test(ua)) return 'Safari'
  return 'Other'
}

// Besides whitespace and a second "@", this rejects ? & # % < > " — characters
// that would let an address smuggle extra fields (e.g. a hidden BCC) into the
// admin's mailto: reply link.
const EMAIL_RE = /^[^\s@?&#%<>"]+@[^\s@?&#%<>"]+\.[^\s@?&#%<>"]+$/

function parseBody(body) {
  if (typeof body !== 'string') return body
  try { return JSON.parse(body) } catch { return null }
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const body = parseBody(req.body)
    const { website, consent } = body && typeof body === 'object' ? body : {}

    // Validate the trimmed values — that is what gets stored.
    const name = cleanString(body?.name)
    const email = cleanString(body?.email).toLowerCase()
    const message = cleanString(body?.message)

    if (website) return res.status(204).end()
    if (consent !== true) return res.status(400).json({ error: 'consent required' })
    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({ error: 'invalid name' })
    }
    if (email.length > 200 || !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'invalid email' })
    }
    if (message.length < 10 || message.length > 5000) {
      return res.status(400).json({ error: 'invalid message' })
    }

    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
    const ua = req.headers['user-agent'] || ''
    const country = req.headers['x-vercel-ip-country'] || null
    const family = uaFamily(ua)
    const ipHash = hashIp(ip)

    if (family === 'bot') return res.status(204).end()

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count, error: countError } = await admin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', since)

    // If the limit can't be checked, don't write — never fail open.
    if (countError || typeof count !== 'number') {
      console.error('contact rate-limit check failed', countError)
      return res.status(503).json({ error: 'temporarily unavailable' })
    }
    if (count >= 3) {
      return res.status(429).json({ error: 'too many messages, please wait' })
    }

    const { error } = await admin.from('messages').insert({
      name,
      email,
      message,
      country,
      user_agent_family: family,
      ip_hash: ipHash
    })

    if (error) {
      console.error('contact insert error', error)
      return res.status(500).json({ error: 'could not save message' })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('contact error', err)
    return res.status(500).json({ error: 'server error' })
  }
}
