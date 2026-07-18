const SUPPORTED = ['en', 'de']
const DEFAULT_LANG = 'en'
const STORAGE_KEY = 'site.lang'

const cache = {}

function pickInitialLang() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && SUPPORTED.includes(stored)) return stored
  } catch {}
  const htmlLang = document.documentElement.getAttribute('lang')
  if (htmlLang && SUPPORTED.includes(htmlLang.toLowerCase().slice(0, 2))) {
    return htmlLang.toLowerCase().slice(0, 2)
  }
  const nav = (navigator.language || '').toLowerCase().slice(0, 2)
  if (SUPPORTED.includes(nav)) return nav
  return DEFAULT_LANG
}

async function loadDict(lang) {
  if (cache[lang]) return cache[lang]
  const res = await fetch(`/translations/${lang}.json`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Failed to load translations for ${lang}`)
  const dict = await res.json()
  cache[lang] = dict
  return dict
}

function resolveKey(dict, key) {
  if (!key) return undefined
  return key.split('.').reduce((acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined), dict)
}

function applyTranslations(dict) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n')
    const value = resolveKey(dict, key)
    if (typeof value === 'string') el.textContent = value
  })

  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html')
    const value = resolveKey(dict, key)
    if (typeof value === 'string') el.innerHTML = value
  })

  document.querySelectorAll('[data-i18n-attr]').forEach(el => {
    const spec = el.getAttribute('data-i18n-attr') || ''
    spec.split(';').map(s => s.trim()).filter(Boolean).forEach(pair => {
      const [attr, key] = pair.split(':').map(s => s && s.trim())
      if (!attr || !key) return
      const value = resolveKey(dict, key)
      if (typeof value === 'string') el.setAttribute(attr, value)
    })
  })

  const titleKey = document.querySelector('meta[name="i18n-title"]')?.getAttribute('content')
  if (titleKey) {
    const v = resolveKey(dict, titleKey)
    if (typeof v === 'string') document.title = v
  }
}

export async function setLang(lang) {
  if (!SUPPORTED.includes(lang)) lang = DEFAULT_LANG
  try { localStorage.setItem(STORAGE_KEY, lang) } catch {}
  document.documentElement.setAttribute('lang', lang)
  const dict = await loadDict(lang)
  applyTranslations(dict)
  document.querySelectorAll('[data-lang-btn]').forEach(btn => {
    btn.setAttribute('aria-pressed', btn.getAttribute('data-lang-btn') === lang ? 'true' : 'false')
  })
  document.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang } }))
}

export function getLang() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && SUPPORTED.includes(stored)) return stored
  } catch {}
  return document.documentElement.getAttribute('lang') || DEFAULT_LANG
}

export function t(key, fallback = '') {
  const dict = cache[getLang()]
  const value = dict ? resolveKey(dict, key) : undefined
  return typeof value === 'string' ? value : fallback
}

export async function initI18n() {
  const lang = pickInitialLang()
  await setLang(lang)
  document.querySelectorAll('[data-lang-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-lang-btn')
      setLang(target)
    })
  })
}
