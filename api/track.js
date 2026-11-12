// Vercel serverless function: POST /api/track
// Receives pageview events from the browser (only if analytics consent granted).
// Uses service_role key to insert into RLS-protected tables.

import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const CONSENT_VERSION = process.env.CONSENT_VERSION || '2026-04-15'

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
})

// Only real pages are recorded — anything else would let a script fill the
// dashboard with made-up paths.
const ALLOWED_PATHS = new Set([
  '/',
  '/index.html',
  '/screenshots.html',
  '/impressum.html',
  '/datenschutz.html'
])

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

// Daily-rotating salt — prevents cross-day tracking, makes session_hash non-reversible.
function dailySalt() {
  const today = new Date().toISOString().slice(0, 10)
  return sha256(today + (process.env.SALT_PEPPER || 'portfolio'))
}

// session_hash is "<ip part>:<ip+ua part>".
// The whole value identifies a visitor (IP + browser) for the unique count.
// The first part depends on the IP alone, so the rate limit can't be dodged
// by sending a different User-Agent with every request.
function sessionHashes(ip, ua) {
  const salt = dailySalt()
  const ipKey = sha256(salt + ip).slice(0, 32)
  return { ipKey, session: `${ipKey}:${sha256(salt + ip + ua).slice(0, 32)}` }
}

function uaFamily(ua = '') {
  if (/bot|crawl|spider/i.test(ua)) return 'bot'
  if (/Firefox/i.test(ua)) return 'Firefox'
  if (/Edg/i.test(ua)) return 'Edge'
  if (/Chrome/i.test(ua)) return 'Chrome'
  if (/Safari/i.test(ua)) return 'Safari'
  return 'Other'
}

function parseBody(body) {
  if (typeof body !== 'string') return body
  try { return JSON.parse(body) } catch { return null }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = parseBody(req.body)
    const { type, path, referrer, analytics } = body && typeof body === 'object' ? body : {}

    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
    const ua = req.headers['user-agent'] || ''
    const country = req.headers['x-vercel-ip-country'] || null
    const family = uaFamily(ua)
    const { ipKey, session } = sessionHashes(ip, ua)

    if (family === 'bot') return res.status(204).end()
    if (type !== 'consent' && type !== 'pageview') {
      return res.status(400).json({ error: 'unknown type' })
    }
    if (type === 'pageview' && !ALLOWED_PATHS.has(path)) {
      return res.status(400).json({ error: 'invalid path' })
    }

    // Rate limit per IP to keep scripted POSTs from flooding the tables.
    const table = type === 'consent' ? 'consent_log' : 'pageviews'
    const limit = type === 'consent' ? 10 : 60
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count, error: countError } = await admin
      .from(table)
      .select('*', { count: 'exact', head: true })
      .like('session_hash', `${ipKey}:%`)
      .gte('created_at', since)
    // If the limit can't be checked, don't write — never fail open.
    if (countError || typeof count !== 'number') {
      console.error('track rate-limit check failed', countError)
      return res.status(503).json({ error: 'temporarily unavailable' })
    }
    if (count >= limit) return res.status(429).end()

    const row = type === 'consent'
      ? {
          session_hash: session,
          analytics: analytics === true,
          version: CONSENT_VERSION,
          user_agent_family: family
        }
      : {
          path,
          referrer: typeof referrer === 'string' ? referrer.slice(0, 500) || null : null,
          country,
          user_agent_family: family,
          session_hash: session
        }

    const { error: insertError } = await admin.from(table).insert(row)
    if (insertError) {
      console.error('track insert error', insertError)
      return res.status(500).json({ error: 'could not save' })
    }
    return res.status(204).end()
  } catch (err) {
    console.error('track error', err)
    return res.status(500).json({ error: 'server error' })
  }
}
