import { useEffect, useRef, useCallback } from 'react'

// ── Dark mode — star field ─────────────────────────────────────────────────────

const STAR_COLORS = ['#e0f2fe', '#e0e7ff', '#3b82f6', '#bfdbfe', '#c7d2fe', '#93c5fd']

const STAR_LAYERS = [
  { count: 110, sizeMin: 0.3,  sizeMax: 0.75, opMin: 0.08, opMax: 0.22, speedMin: 0.04, speedMax: 0.12, mouseInfluence: 0 },
  { count: 70,  sizeMin: 0.75, sizeMax: 1.4,  opMin: 0.22, opMax: 0.45, speedMin: 0.13, speedMax: 0.30, mouseInfluence: 0.25 },
  { count: 45,  sizeMin: 1.3,  sizeMax: 2.4,  opMin: 0.42, opMax: 0.68, speedMin: 0.28, speedMax: 0.58, mouseInfluence: 1.0 },
]

const REPULSE_RADIUS   = 130
const REPULSE_STRENGTH = 2.2

function makeStar(w, h, layerIdx) {
  const L     = STAR_LAYERS[layerIdx]
  const angle = rand(-0.35, 0.35)
  const speed = rand(L.speedMin, L.speedMax)
  return {
    x: rand(0, w), y: rand(0, h),
    ox: 0, oy: 0,
    size:       rand(L.sizeMin, L.sizeMax),
    baseOp:     rand(L.opMin, L.opMax),
    color:      STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
    vx:         Math.sin(angle) * speed,
    vy:         -Math.cos(angle) * speed,
    twinkle:    rand(0, Math.PI * 2),
    twinkleSpd: rand(0.006, 0.022),
    layer:      layerIdx,
  }
}

function initStars(w, h) {
  const particles = []
  STAR_LAYERS.forEach((L, li) => {
    for (let i = 0; i < L.count; i++) particles.push(makeStar(w, h, li))
  })
  return particles
}

function drawStars(ctx, particles, w, h, mx, my) {
  ctx.clearRect(0, 0, w, h)
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i]
    const L = STAR_LAYERS[p.layer]

    p.x += p.vx
    p.y += p.vy
    p.twinkle += p.twinkleSpd

    const op = p.baseOp * (0.75 + 0.25 * Math.sin(p.twinkle))

    if (L.mouseInfluence > 0) {
      const dx = p.x - mx, dy = p.y - my
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < REPULSE_RADIUS && dist > 0.1) {
        const force = ((REPULSE_RADIUS - dist) / REPULSE_RADIUS) * REPULSE_STRENGTH * L.mouseInfluence
        p.ox += (dx / dist) * force * 0.12
        p.oy += (dy / dist) * force * 0.12
      }
      p.ox *= 0.92; p.oy *= 0.92
    }

    if (p.y < -10) { p.y = h + 10; p.x = rand(0, w); p.ox = 0; p.oy = 0 }
    const rx = p.x + p.ox, ry = p.y + p.oy
    if (rx < -20)    p.x = w + 20
    if (rx > w + 20) p.x = -20

    const dx = p.x + p.ox, dy2 = p.y + p.oy

    if (p.layer === 2 && p.size > 1.5) {
      const grd = ctx.createRadialGradient(dx, dy2, 0, dx, dy2, p.size * 3.5)
      grd.addColorStop(0,   hexRgba(p.color, op))
      grd.addColorStop(0.4, hexRgba(p.color, op * 0.35))
      grd.addColorStop(1,   hexRgba(p.color, 0))
      ctx.beginPath(); ctx.arc(dx, dy2, p.size * 3.5, 0, Math.PI * 2)
      ctx.fillStyle = grd; ctx.fill()
    }
    ctx.beginPath(); ctx.arc(dx, dy2, p.size, 0, Math.PI * 2)
    ctx.fillStyle = hexRgba(p.color, op); ctx.fill()
  }
}

// ── Light mode — bokeh drift ───────────────────────────────────────────────────

const BOKEH_COLORS = [
  '#93c5fd', // sky blue
  '#c4b5fd', // lavender
  '#6ee7b7', // mint
  '#fcd34d', // warm yellow
  '#f9a8d4', // soft pink
  '#86efac', // light green
  '#a5f3fc', // cyan
  '#fdba74', // peach
]

// Three layers — background blurs, midground medium, foreground crisper
const BOKEH_LAYERS = [
  { count: 18, sizeMin: 18, sizeMax: 45, opMin: 0.06, opMax: 0.14, speedMin: 0.05, speedMax: 0.12, blurScale: 2.8, mouseInfluence: 0 },
  { count: 22, sizeMin: 8,  sizeMax: 22, opMin: 0.12, opMax: 0.22, speedMin: 0.10, speedMax: 0.22, blurScale: 2.0, mouseInfluence: 0.3 },
  { count: 28, sizeMin: 3,  sizeMax: 10, opMin: 0.20, opMax: 0.38, speedMin: 0.18, speedMax: 0.36, blurScale: 1.2, mouseInfluence: 0.9 },
]

const ATTRACT_RADIUS   = 160
const ATTRACT_STRENGTH = 1.6

function makeBokeh(w, h, layerIdx) {
  const L     = BOKEH_LAYERS[layerIdx]
  const angle = rand(0, Math.PI * 2)
  const speed = rand(L.speedMin, L.speedMax)
  return {
    x: rand(0, w), y: rand(0, h),
    ox: 0, oy: 0,
    size:       rand(L.sizeMin, L.sizeMax),
    baseOp:     rand(L.opMin, L.opMax),
    color:      BOKEH_COLORS[Math.floor(Math.random() * BOKEH_COLORS.length)],
    vx:         Math.cos(angle) * speed * 0.4,
    vy:         -Math.abs(Math.sin(angle)) * speed, // mostly upward
    wander:     rand(0, Math.PI * 2),
    wanderSpd:  rand(0.004, 0.012),
    pulse:      rand(0, Math.PI * 2),
    pulseSpd:   rand(0.008, 0.018),
    blurScale:  L.blurScale,
    layer:      layerIdx,
  }
}

function initBokeh(w, h) {
  const particles = []
  BOKEH_LAYERS.forEach((L, li) => {
    for (let i = 0; i < L.count; i++) particles.push(makeBokeh(w, h, li))
  })
  return particles
}

function drawBokeh(ctx, particles, w, h, mx, my) {
  ctx.clearRect(0, 0, w, h)

  for (let i = 0; i < particles.length; i++) {
    const p  = particles[i]
    const L  = BOKEH_LAYERS[p.layer]

    // Organic wander
    p.wander += p.wanderSpd
    p.pulse  += p.pulseSpd
    p.x += p.vx + Math.cos(p.wander) * 0.18
    p.y += p.vy + Math.sin(p.wander * 0.7) * 0.12

    // Pulsing size
    const sizeNow = p.size * (0.88 + 0.12 * Math.sin(p.pulse))
    const op      = p.baseOp * (0.80 + 0.20 * Math.sin(p.pulse * 1.3))

    // Mouse ATTRACTION — particles gently drift toward cursor
    if (L.mouseInfluence > 0 && mx > -999) {
      const dx   = mx - p.x
      const dy   = my - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < ATTRACT_RADIUS && dist > 1) {
        const force = ((ATTRACT_RADIUS - dist) / ATTRACT_RADIUS) * ATTRACT_STRENGTH * L.mouseInfluence
        p.ox += (dx / dist) * force * 0.06
        p.oy += (dy / dist) * force * 0.06
      }
      p.ox *= 0.94; p.oy *= 0.94
    }

    // Wrap
    if (p.y < -60) { p.y = h + 60; p.x = rand(0, w); p.ox = 0; p.oy = 0 }
    const rx = p.x + p.ox, ry = p.y + p.oy
    if (rx < -60)    p.x = w + 60
    if (rx > w + 60) p.x = -60

    const drawX = p.x + p.ox
    const drawY = p.y + p.oy
    const glowR = sizeNow * p.blurScale

    // Soft bokeh glow — multiple gradient rings
    const grd = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, glowR)
    grd.addColorStop(0,    hexRgba(p.color, op * 0.90))
    grd.addColorStop(0.25, hexRgba(p.color, op * 0.60))
    grd.addColorStop(0.55, hexRgba(p.color, op * 0.22))
    grd.addColorStop(0.80, hexRgba(p.color, op * 0.06))
    grd.addColorStop(1,    hexRgba(p.color, 0))
    ctx.beginPath()
    ctx.arc(drawX, drawY, glowR, 0, Math.PI * 2)
    ctx.fillStyle = grd
    ctx.fill()

    // Crisp inner core (foreground layer only)
    if (p.layer === 2) {
      ctx.beginPath()
      ctx.arc(drawX, drawY, sizeNow * 0.45, 0, Math.PI * 2)
      ctx.fillStyle = hexRgba(p.color, Math.min(op * 1.6, 0.55))
      ctx.fill()
    }
  }
}

// ── Shared utilities ──────────────────────────────────────────────────────────

function rand(a, b) { return a + Math.random() * (b - a) }

const _cache = {}
function hexRgba(hex, alpha) {
  const a   = +alpha.toFixed(3)
  const key = hex + a
  if (_cache[key]) return _cache[key]
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const v = `rgba(${r},${g},${b},${a})`
  if (Object.keys(_cache).length < 600) _cache[key] = v
  return v
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ParticleCanvas({ style, theme = 'dark' }) {
  const canvasRef  = useRef(null)
  const mouseRef   = useRef({ x: -9999, y: -9999 })
  const rafRef     = useRef(null)
  const stateRef   = useRef(null)
  const themeRef   = useRef(theme)

  useEffect(() => { themeRef.current = theme }, [theme])

  const init = useCallback((canvas) => {
    const w = canvas.width
    const h = canvas.height
    stateRef.current = {
      dark:  { particles: initStars(w, h), w, h },
      light: { particles: initBokeh(w, h), w, h },
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      init(canvas)
    }
    resize()

    const onMouse = (e) => { mouseRef.current = { x: e.clientX, y: e.clientY } }
    const onLeave = () => { mouseRef.current = { x: -9999, y: -9999 } }
    window.addEventListener('mousemove', onMouse, { passive: true })
    window.addEventListener('mouseleave', onLeave)
    window.addEventListener('resize', resize)

    const draw = () => {
      const state = stateRef.current
      if (!state) { rafRef.current = requestAnimationFrame(draw); return }

      const isDark = themeRef.current !== 'light'
      const { particles, w, h } = isDark ? state.dark : state.light
      const { x: mx, y: my } = mouseRef.current

      if (isDark) drawStars(ctx, particles, w, h, mx, my)
      else        drawBokeh(ctx, particles, w, h, mx, my)

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('mousemove', onMouse)
      window.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('resize', resize)
    }
  }, [init])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      'absolute',
        inset:         0,
        width:         '100%',
        height:        '100%',
        pointerEvents: 'none',
        zIndex:        0,
        ...style,
      }}
    />
  )
}
