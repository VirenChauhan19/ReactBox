// ── PKCE helpers ──────────────────────────────────────────────────────────────
function generateRandomString(len = 64) {
  const arr = new Uint8Array(Math.ceil(len * 3 / 4))
  crypto.getRandomValues(arr)
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    .slice(0, len)
}

async function sha256Base64Url(plain) {
  const enc  = new TextEncoder().encode(plain)
  const hash = await crypto.subtle.digest('SHA-256', enc)
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// ── Whoop OAuth (PKCE — no client_secret needed for public clients) ────────────
const WHOOP_CLIENT_ID = import.meta.env.VITE_WHOOP_CLIENT_ID ?? ''
const WHOOP_AUTH_URL  = 'https://api.prod.whoop.com/oauth/oauth2/auth'
const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token'
const WHOOP_API_BASE  = 'https://api.prod.whoop.com/developer/v1'
const WHOOP_SCOPES    = 'offline read:recovery read:sleep read:body_measurement read:cycles'

export async function initiateWhoopAuth() {
  const verifier  = generateRandomString(64)
  const challenge = await sha256Base64Url(verifier)
  const state     = generateRandomString(16)
  const redirect  = `${window.location.origin}${window.location.pathname}`

  sessionStorage.setItem('whoop_verifier', verifier)
  sessionStorage.setItem('whoop_state', state)

  const params = new URLSearchParams({
    client_id:             WHOOP_CLIENT_ID,
    response_type:         'code',
    redirect_uri:          redirect,
    scope:                 WHOOP_SCOPES,
    state,
    code_challenge:        challenge,
    code_challenge_method: 'S256',
  })

  window.location.href = `${WHOOP_AUTH_URL}?${params}`
}

export async function exchangeWhoopCode(code, state) {
  const verifier   = sessionStorage.getItem('whoop_verifier')
  const savedState = sessionStorage.getItem('whoop_state')
  if (state && state !== savedState) throw new Error('OAuth state mismatch')

  const redirect = `${window.location.origin}${window.location.pathname}`

  const res = await fetch(WHOOP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      client_id:     WHOOP_CLIENT_ID,
      code,
      redirect_uri:  redirect,
      code_verifier: verifier ?? '',
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error_description ?? `Token exchange failed (${res.status})`)
  }

  sessionStorage.removeItem('whoop_verifier')
  sessionStorage.removeItem('whoop_state')

  return res.json() // { access_token, refresh_token, expires_in, token_type }
}

async function whoopGet(path, token) {
  const res = await fetch(`${WHOOP_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Whoop API error ${res.status} on ${path}`)
  return res.json()
}

export async function fetchWhoopData(accessToken) {
  const [recovery, sleep, cycles] = await Promise.allSettled([
    whoopGet('/recovery?limit=1', accessToken),
    whoopGet('/sleep?limit=1',    accessToken),
    whoopGet('/cycle?limit=1',    accessToken),
  ])

  const rec   = recovery.status  === 'fulfilled' ? recovery.value?.records?.[0]  : null
  const slp   = sleep.status     === 'fulfilled' ? sleep.value?.records?.[0]     : null
  const cycle = cycles.status    === 'fulfilled' ? cycles.value?.records?.[0]    : null

  const sleepMs = slp?.score?.total_in_bed_time_milli ?? null

  return {
    source:        'whoop',
    recoveryScore: rec?.score?.recovery_score                ?? null, // 0–100
    hrv:           rec?.score?.hrv_rmssd_milli               ?? null, // ms
    restingHR:     rec?.score?.resting_heart_rate            ?? null, // bpm
    sleepScore:    slp?.score?.sleep_performance_percentage  ?? null, // 0–100
    sleepDuration: sleepMs,                                           // ms
    strain:        cycle?.score?.strain                      ?? null, // 0–21
    fetchedAt:     new Date().toISOString(),
  }
}

// ── Google Fit API ────────────────────────────────────────────────────────────
export async function fetchGoogleFitData(accessToken) {
  const now    = Date.now()
  const dayAgo = now - 86_400_000
  const wkAgo  = now - 7 * 86_400_000

  async function aggregate(dataTypeName, startMs, endMs) {
    try {
      const res = await fetch(
        'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
        {
          method:  'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            aggregateBy:   [{ dataTypeName }],
            bucketByTime:  { durationMillis: endMs - startMs },
            startTimeMillis: startMs,
            endTimeMillis:   endMs,
          }),
        }
      )
      return res.ok ? res.json() : null
    } catch { return null }
  }

  const [hrData, sleepData] = await Promise.all([
    aggregate('com.google.heart_rate.bpm',  dayAgo, now),
    aggregate('com.google.sleep.segment',   wkAgo,  now),
  ])

  // Resting HR ≈ min HR recorded in last 24h
  const hrPoints  = hrData?.bucket?.[0]?.dataset?.[0]?.point ?? []
  const hrValues  = hrPoints.flatMap(p => p.value?.map(v => v.fpVal) ?? []).filter(Boolean)
  const restingHR = hrValues.length ? Math.round(Math.min(...hrValues)) : null

  // Sleep duration from last session
  const sleepPoints = sleepData?.bucket?.[0]?.dataset?.[0]?.point ?? []
  const sleepMs = sleepPoints.reduce((sum, p) => {
    const type = p.value?.[0]?.intVal
    if (type === 1 || type === 2 || type === 3) { // light / deep / REM
      return sum + Number((BigInt(p.endTimeNanos) - BigInt(p.startTimeNanos)) / 1_000_000n)
    }
    return sum
  }, 0)

  return {
    source:        'google-fit',
    recoveryScore: null,
    hrv:           null,
    restingHR,
    sleepScore:    null,
    sleepDuration: sleepMs || null,
    strain:        null,
    fetchedAt:     new Date().toISOString(),
  }
}

// ── Readiness score (0–100) ───────────────────────────────────────────────────
export function computeReadiness(bio) {
  if (!bio) return null

  // Whoop provides a direct recovery score — use it
  if (bio.recoveryScore !== null) return Math.round(bio.recoveryScore)

  // Estimate from sleep + resting HR
  let score = 60; let w = 1

  if (bio.sleepDuration !== null) {
    const hrs  = bio.sleepDuration / 3_600_000
    const s    = Math.max(0, Math.min(100, (hrs - 4) * 25)) // 4h→0, 8h→100
    score = (score * w + s * 2) / (w + 2); w += 2
  }
  if (bio.restingHR !== null) {
    const s = Math.max(0, Math.min(100, 150 - bio.restingHR * 1.25)) // 50bpm→100, 80bpm→0
    score = (score * w + s) / (w + 1); w += 1
  }

  return Math.round(score)
}

export function getStudyMode(readiness) {
  if (readiness === null) return null
  if (readiness >= 67) return 'peak'
  if (readiness >= 34) return 'review'
  return 'rest'
}

export const STUDY_MODE_META = {
  peak:   { label: 'Peak Focus',        color: '#3FB950', glow: '#3FB95040', icon: '⚡', short: 'Deep work zone — tackle the hardest material.' },
  review: { label: 'Review Mode',       color: '#E3B341', glow: '#E3B34140', icon: '📖', short: 'Good for consolidating existing knowledge.'    },
  rest:   { label: 'Rest Recommended',  color: '#F85149', glow: '#F8514940', icon: '😴', short: 'Your body needs recovery. Keep it light.'        },
}

// Suggest which assignments to focus on given readiness + assignment list
export function rankAssignments(assignments, mode) {
  if (!mode || !assignments?.length) return { now: [], later: [] }

  const urgencyWeight = { high: 3, medium: 2, low: 1 }
  const incomplete = assignments.filter(a => a.status !== 'completed')

  // Calculate cognitive demand score per assignment
  function demandScore(a) {
    return (urgencyWeight[a.urgency] ?? 1) + (a.weight ?? 0) / 20
  }

  const sorted = [...incomplete].sort((a, b) => demandScore(b) - demandScore(a))

  if (mode === 'peak') {
    return { now: sorted.slice(0, 2), later: sorted.slice(2) }
  } else if (mode === 'review') {
    // Reverse — tackle easier stuff first
    const easy = [...incomplete].sort((a, b) => demandScore(a) - demandScore(b))
    return { now: easy.slice(0, 1), later: easy.slice(1) }
  } else {
    // Rest — nothing demanding
    return { now: [], later: sorted }
  }
}

export function formatSleepDuration(ms) {
  if (!ms) return null
  const h = Math.floor(ms / 3_600_000)
  const m = Math.round((ms % 3_600_000) / 60_000)
  return `${h}h ${m}m`
}
