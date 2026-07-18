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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const { name, email, message, website, consent } = body || {}

    if (website) return res.status(204).end()
    if (!consent) return res.status(400).json({ error: 'consent required' })
    if (!name || typeof name !== 'string' || name.length < 2 || name.length > 100) {
      return res.status(400).json({ error: 'invalid name' })
    }
    if (!email || !EMAIL_RE.test(email) || email.length > 200) {
      return res.status(400).json({ error: 'invalid email' })
    }
    if (!message || typeof message !== 'string' || message.length < 10 || message.length > 5000) {
      return res.status(400).json({ error: 'invalid message' })
    }

    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
    const ua = req.headers['user-agent'] || ''
    const country = req.headers['x-vercel-ip-country'] || null
    const family = uaFamily(ua)
    const ipHash = hashIp(ip)

    if (family === 'bot') return res.status(204).end()

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count } = await admin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', since)

    if ((count ?? 0) >= 3) {
      return res.status(429).json({ error: 'too many messages, please wait' })
    }

    const { error } = await admin.from('messages').insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
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
