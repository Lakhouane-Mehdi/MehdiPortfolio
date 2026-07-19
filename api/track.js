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

// Daily-rotating salt — prevents cross-day tracking, makes session_hash non-reversible.
function dailySalt() {
  const today = new Date().toISOString().slice(0, 10)
  return crypto.createHash('sha256').update(today + (process.env.SALT_PEPPER || 'portfolio')).digest('hex')
}

function hashSession(ip, ua) {
  return crypto.createHash('sha256').update(dailySalt() + ip + ua).digest('hex')
}

function uaFamily(ua = '') {
  if (/bot|crawl|spider/i.test(ua)) return 'bot'
  if (/Firefox/i.test(ua)) return 'Firefox'
  if (/Edg/i.test(ua)) return 'Edge'
  if (/Chrome/i.test(ua)) return 'Chrome'
  if (/Safari/i.test(ua)) return 'Safari'
  return 'Other'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const { type, path, referrer, analytics } = body || {}

    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
    const ua = req.headers['user-agent'] || ''
    const country = req.headers['x-vercel-ip-country'] || null
    const family = uaFamily(ua)
    const session = hashSession(ip, ua)

    if (family === 'bot') return res.status(204).end()
    if (type !== 'consent' && type !== 'pageview') {
      return res.status(400).json({ error: 'unknown type' })
    }

    // Rate limit per session to keep scripted POSTs from flooding the tables.
    const table = type === 'consent' ? 'consent_log' : 'pageviews'
    const limit = type === 'consent' ? 10 : 60
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count } = await admin
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('session_hash', session)
      .gte('created_at', since)
    if ((count ?? 0) >= limit) return res.status(429).end()

    if (type === 'consent') {
      await admin.from('consent_log').insert({
        session_hash: session,
        analytics: !!analytics,
        version: CONSENT_VERSION,
        user_agent_family: family
      })
      return res.status(204).end()
    }

    if (type === 'pageview') {
      if (!path || typeof path !== 'string' || path.length > 500) {
        return res.status(400).json({ error: 'invalid path' })
      }
      await admin.from('pageviews').insert({
        path,
        referrer: (referrer || '').slice(0, 500) || null,
        country,
        user_agent_family: family,
        session_hash: session
      })
      return res.status(204).end()
    }
  } catch (err) {
    console.error('track error', err)
    return res.status(500).json({ error: 'server error' })
  }
}
