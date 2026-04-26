import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Shared localStorage hook ─────────────────────────────────────────────────
function useLS(key, init) {
  const [v, setV] = useState(() => {
    try { const s = localStorage.getItem(key); return s !== null ? JSON.parse(s) : init }
    catch { return init }
  })
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)) } catch {} }, [key, v])
  return [v, setV]
}

// ─── Pomodoro Timer ───────────────────────────────────────────────────────────
const POMO_DEFAULTS = { work: 25, short: 5, long: 15 }
const POMO_META     = {
  work:  { label: 'Focus',       color: '#58A6FF' },
  short: { label: 'Short Break', color: '#3FB950' },
  long:  { label: 'Long Break',  color: '#BC8CFF' },
}
const RING_R = 54
const RING_C = 2 * Math.PI * RING_R

function PomodoroTimer() {
  const [mode,       setMode]    = useLS('scc_pomo_mode', 'work')
  const [customMins, setCustMin] = useLS('scc_pomo_mins', { work: 25, short: 5, long: 15 })
  const [sessions,   setSess]    = useLS('scc_pomo_sess', 0)
  const [secsLeft,   setSecsL]   = useState(() => (customMins[mode] || POMO_DEFAULTS[mode]) * 60)
  const [running,    setRunning] = useState(false)
  const [showSet,    setShowSet] = useState(false)
  const modeRef = useRef(mode)

  // Reset when mode changes
  useEffect(() => {
    modeRef.current = mode
    setSecsL((customMins[mode] || POMO_DEFAULTS[mode]) * 60)
    setRunning(false)
  }, [mode])

  // Countdown
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setSecsL(s => {
        if (s <= 1) {
          setRunning(false)
          if (modeRef.current === 'work') setSess(n => n + 1)
          try {
            if (Notification.permission === 'granted')
              new Notification(
                modeRef.current === 'work' ? '🎉 Focus session complete!' : '⏰ Break over!',
                { body: modeRef.current === 'work' ? 'Time for a break.' : 'Back to focus mode.' }
              )
          } catch {}
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running])

  const totalSecs  = (customMins[mode] || POMO_DEFAULTS[mode]) * 60
  const pct        = secsLeft / totalSecs
  const ringOffset = RING_C * (1 - pct)
  const { label, color } = POMO_META[mode]
  const showHours = secsLeft >= 3600
  const hh = String(Math.floor(secsLeft / 3600)).padStart(2, '0')
  const mm = String(Math.floor((secsLeft % 3600) / 60)).padStart(2, '0')
  const ss = String(secsLeft % 60).padStart(2, '0')

  return (
    <div style={s.card}>
      {/* Header */}
      <div style={s.cardHeader}>
        <span style={s.cardTitle}>⏱ Pomodoro</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            🍅 {sessions}
          </span>
          <IconBtn onClick={() => setShowSet(v => !v)} title="Settings">⚙</IconBtn>
        </div>
      </div>

      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
        {Object.entries(POMO_META).map(([k, m]) => (
          <button key={k} onClick={() => setMode(k)} style={{
            flex: 1, padding: '6px 4px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 600,
            border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .18s',
            backgroundColor: mode === k ? m.color + '22' : 'var(--bg-elevated)',
            color: mode === k ? m.color : 'var(--text-muted)',
            outline: mode === k ? `1.5px solid ${m.color}55` : 'none',
          }}>{m.label}</button>
        ))}
      </div>

      {/* Ring */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '18px 0 12px' }}>
        <div style={{ position: 'relative', width: 130, height: 130 }}>
          <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="65" cy="65" r={RING_R} fill="none" stroke="var(--bg-elevated)" strokeWidth="9" />
            <circle cx="65" cy="65" r={RING_R} fill="none"
              stroke={color} strokeWidth="9" strokeLinecap="round"
              strokeDasharray={RING_C} strokeDashoffset={ringOffset}
              style={{
                transition: running ? 'stroke-dashoffset 1s linear' : 'stroke-dashoffset .35s ease',
                filter: `drop-shadow(0 0 8px ${color}99)`,
              }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: showHours ? '1.45rem' : '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {showHours ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`}
            </span>
            <span style={{ fontSize: '0.6rem', color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>
              {label}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center' }}>
        <button
          onClick={() => { if (!running && Notification.permission === 'default') Notification.requestPermission(); setRunning(v => !v) }}
          style={{
            padding: '10px 28px', borderRadius: '24px', border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontWeight: 700, fontSize: '0.88rem',
            backgroundColor: running ? '#F85149' : color,
            color: '#fff', transition: 'all .18s',
            boxShadow: running ? '0 4px 20px #F8514944' : `0 4px 20px ${color}55`,
          }}
        >
          {running ? '⏸ Pause' : '▶ Start'}
        </button>
        <button
          onClick={() => { setRunning(false); setSecsL((customMins[mode] || POMO_DEFAULTS[mode]) * 60) }}
          style={s.iconBtn} title="Reset"
        >↺</button>
      </div>

      {/* Settings drawer */}
      {showSet && (
        <div style={{ marginTop: '14px', padding: '12px', backgroundColor: 'var(--bg-elevated)', borderRadius: '10px', border: '1px solid var(--border)' }} className="animate-slideDown">
          <p style={{ margin: '0 0 10px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Duration
          </p>
          {Object.entries(POMO_META).map(([k, m]) => {
            const totalM = customMins[k] || POMO_DEFAULTS[k]
            const hrs  = Math.floor(totalM / 60)
            const mins = totalM % 60
            function setHM(h, mn) {
              const total = Math.max(1, Math.min(600, h * 60 + mn))
              setCustMin(p => ({ ...p, [k]: total }))
            }
            return (
              <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)', minWidth: '80px' }}>{m.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {/* Hours */}
                  <button onClick={() => setHM(hrs, mins - 1)} style={s.stepBtn}>−</button>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <input
                      type="number" min={0} max={9}
                      value={hrs}
                      onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v)) setHM(Math.min(9, Math.max(0, v)), mins) }}
                      style={{ width: '36px', textAlign: 'center', fontWeight: 700, fontSize: '0.85rem', color: m.color, backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '6px', padding: '3px 2px', fontFamily: 'inherit', outline: 'none' }}
                    />
                    <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: '1px' }}>h</span>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem', alignSelf: 'flex-start', marginTop: '4px' }}>:</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <input
                      type="number" min={0} max={59}
                      value={mins}
                      onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v)) setHM(hrs, Math.min(59, Math.max(0, v))) }}
                      style={{ width: '36px', textAlign: 'center', fontWeight: 700, fontSize: '0.85rem', color: m.color, backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '6px', padding: '3px 2px', fontFamily: 'inherit', outline: 'none' }}
                    />
                    <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: '1px' }}>m</span>
                  </div>
                  <button onClick={() => setHM(hrs, mins + 1)} style={s.stepBtn}>+</button>
                </div>
              </div>
            )
          })}
          <button onClick={() => setSess(0)} style={{ width: '100%', marginTop: '6px', padding: '6px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-muted)', fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit' }}>
            Reset Session Count
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Todo Widget ──────────────────────────────────────────────────────────────
const PRIO_EMOJI  = { none: '○', high: '🔴', medium: '🟡', low: '🟢' }
const PRIO_NEXT   = { none: 'high', high: 'medium', medium: 'low', low: 'none' }
const PRIO_ORDER  = { high: 0, medium: 1, low: 2, none: 3 }

function TodoWidget() {
  const [todos,  setTodos]  = useLS('scc_todos', [])
  const [input,  setInput]  = useState('')
  const [filter, setFilter] = useState('active')
  const inputRef = useRef(null)

  function addTodo() {
    const t = input.trim(); if (!t) return
    setTodos(prev => [{ id: `t-${Date.now()}`, text: t, done: false, priority: 'none' }, ...prev])
    setInput('')
    inputRef.current?.focus()
  }

  const visible = todos
    .filter(t => filter === 'all' ? true : filter === 'done' ? t.done : !t.done)
    .sort((a, b) => (PRIO_ORDER[a.priority] ?? 3) - (PRIO_ORDER[b.priority] ?? 3))

  const doneCount = todos.filter(t => t.done).length
  const total     = todos.length

  return (
    <div style={{ ...s.card, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={s.cardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={s.cardTitle}>✅ Tasks</span>
          {total > 0 && (
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-elevated)', padding: '2px 7px', borderRadius: '10px' }}>
              {doneCount}/{total}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '3px' }}>
          {['active', 'all', 'done'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '3px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: '0.68rem', fontWeight: 600, transition: 'all .15s',
              backgroundColor: filter === f ? '#58A6FF22' : 'transparent',
              color: filter === f ? '#58A6FF' : 'var(--text-muted)',
            }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
          ))}
        </div>
      </div>

      {/* Progress */}
      {total > 0 && (
        <div style={{ height: '3px', backgroundColor: 'var(--bg-elevated)', borderRadius: '2px', marginBottom: '12px', overflow: 'hidden' }}>
          <div style={{ height: '100%', backgroundColor: '#3FB950', borderRadius: '2px', width: `${(doneCount / total) * 100}%`, transition: 'width .4s cubic-bezier(.16,1,.3,1)' }} />
        </div>
      )}

      {/* Input */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTodo()}
          placeholder="Add a task…" style={s.textInput} />
        <button onClick={addTodo} disabled={!input.trim()} style={{
          padding: '8px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
          backgroundColor: '#58A6FF', color: '#fff', fontWeight: 700, fontSize: '1rem',
          opacity: input.trim() ? 1 : 0.4, transition: 'opacity .15s', fontFamily: 'inherit',
        }}>+</button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {visible.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.78rem', opacity: 0.7 }}>
            {filter === 'done' ? '🎉 No completed tasks' : '📝 No tasks — add one!'}
          </div>
        )}
        {visible.map((todo, i) => (
          <TodoRow key={todo.id} todo={todo} i={i}
            onToggle={() => setTodos(p => p.map(t => t.id === todo.id ? { ...t, done: !t.done } : t))}
            onPriority={() => setTodos(p => p.map(t => t.id === todo.id ? { ...t, priority: PRIO_NEXT[t.priority || 'none'] } : t))}
            onDelete={() => setTodos(p => p.filter(t => t.id !== todo.id))}
          />
        ))}
      </div>

      {doneCount > 0 && (
        <button onClick={() => setTodos(p => p.filter(t => !t.done))} style={{ ...s.ghostBtn, marginTop: '8px', width: '100%', color: '#F85149' }}>
          Clear {doneCount} completed
        </button>
      )}
    </div>
  )
}

function TodoRow({ todo, i, onToggle, onPriority, onDelete }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 8px',
        borderRadius: '8px', marginBottom: '3px', transition: 'background-color .12s',
        backgroundColor: hov ? 'var(--bg-elevated)' : 'transparent',
        animation: 'slideUp .2s ease both',
        animationDelay: `${Math.min(i, 8) * 25}ms`,
        animationFillMode: 'both',
      }}
    >
      <button onClick={onToggle} style={{
        width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
        border: `2px solid ${todo.done ? '#3FB950' : 'var(--border)'}`,
        backgroundColor: todo.done ? '#3FB950' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: '0.62rem', transition: 'all .15s', fontWeight: 700,
      }}>{todo.done ? '✓' : ''}</button>

      <button onClick={onPriority} title="Priority" style={{
        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        fontSize: '0.72rem', flexShrink: 0, opacity: todo.priority === 'none' ? 0.3 : 1,
        transition: 'opacity .15s',
      }}>{PRIO_EMOJI[todo.priority || 'none']}</button>

      <span style={{
        flex: 1, fontSize: '0.83rem', lineHeight: 1.4, wordBreak: 'break-word',
        color: todo.done ? 'var(--text-muted)' : 'var(--text-primary)',
        textDecoration: todo.done ? 'line-through' : 'none',
        transition: 'all .2s',
      }}>{todo.text}</span>

      {hov && (
        <button onClick={onDelete} style={{ background: 'none', border: 'none', color: '#F85149', cursor: 'pointer', fontSize: '1rem', padding: '0 2px', flexShrink: 0, opacity: 0.8 }} title="Delete">×</button>
      )}
    </div>
  )
}

// ─── Bookmarks ────────────────────────────────────────────────────────────────
const DEFAULT_LINKS = [
  { id: 'bm-1', emoji: '🎓', label: 'Blackboard',   url: 'https://scad.blackboard.com'    },
  { id: 'bm-2', emoji: '📁', label: 'Google Drive', url: 'https://drive.google.com'       },
  { id: 'bm-3', emoji: '📦', label: 'Dropbox',      url: 'https://dropbox.com'            },
  { id: 'bm-4', emoji: '▶',  label: 'YouTube',      url: 'https://youtube.com'            },
  { id: 'bm-5', emoji: '🏫', label: 'MySCAD',       url: 'https://my.scad.edu'            },
  { id: 'bm-6', emoji: '💻', label: 'GitHub',       url: 'https://github.com'             },
]

function BookmarksWidget() {
  const [links,    setLinks]    = useLS('scc_bookmarks', DEFAULT_LINKS)
  const [adding,   setAdding]   = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newUrl,   setNewUrl]   = useState('')
  const [newEmoji, setNewEmoji] = useState('🔗')

  function save() {
    if (!newLabel.trim() || !newUrl.trim()) return
    let url = newUrl.trim()
    if (!/^https?:\/\//.test(url)) url = 'https://' + url
    setLinks(p => [...p, { id: `bm-${Date.now()}`, emoji: newEmoji, label: newLabel.trim(), url }])
    setNewLabel(''); setNewUrl(''); setNewEmoji('🔗'); setAdding(false)
  }

  return (
    <div style={s.card}>
      <div style={s.cardHeader}>
        <span style={s.cardTitle}>🔗 Quick Links</span>
        <button onClick={() => setAdding(v => !v)} style={s.ghostBtn}>
          {adding ? '✕ Cancel' : '+ Add'}
        </button>
      </div>

      {adding && (
        <div style={{ marginBottom: '12px', padding: '10px', backgroundColor: 'var(--bg-elevated)', borderRadius: '10px' }} className="animate-slideDown">
          <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
            <input value={newEmoji} onChange={e => setNewEmoji(e.target.value)} maxLength={2}
              style={{ ...s.textInput, width: '44px', textAlign: 'center', fontSize: '1.1rem', padding: '6px' }} placeholder="🔗" />
            <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
              style={{ ...s.textInput, flex: 1 }} placeholder="Label" />
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input value={newUrl} onChange={e => setNewUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && save()}
              style={{ ...s.textInput, flex: 1 }} placeholder="https://..." />
            <button onClick={save} disabled={!newLabel.trim() || !newUrl.trim()} style={{
              padding: '6px 14px', borderRadius: '8px', border: 'none', backgroundColor: '#58A6FF',
              color: '#fff', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit',
              opacity: newLabel.trim() && newUrl.trim() ? 1 : 0.4, transition: 'opacity .15s',
            }}>Save</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: '8px' }}>
        {links.map(link => <LinkChip key={link.id} link={link} onDelete={() => setLinks(p => p.filter(l => l.id !== link.id))} />)}
      </div>
    </div>
  )
}

function LinkChip({ link, onDelete }) {
  const [hov, setHov] = useState(false)
  return (
    <div style={{ position: 'relative' }} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <a href={link.url} target="_blank" rel="noopener noreferrer" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
        padding: '10px 6px', borderRadius: '10px', textDecoration: 'none', cursor: 'pointer',
        backgroundColor: hov ? 'var(--bg-elevated)' : 'var(--bg-elevated)55',
        border: `1.5px solid ${hov ? 'var(--border)' : 'transparent'}`,
        transition: 'all .15s', transform: hov ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hov ? '0 4px 16px rgba(0,0,0,0.3)' : 'none',
      }}>
        <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{link.emoji}</span>
        <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60px' }}>
          {link.label}
        </span>
      </a>
      {hov && (
        <button onClick={e => { e.preventDefault(); onDelete() }} style={{
          position: 'absolute', top: '-5px', right: '-5px', width: '18px', height: '18px',
          borderRadius: '50%', backgroundColor: '#F85149', border: '2px solid var(--bg-surface)',
          color: '#fff', fontSize: '0.65rem', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontWeight: 700, lineHeight: 1,
        }} title="Remove">×</button>
      )}
    </div>
  )
}

// ─── Ambient Sound Player ─────────────────────────────────────────────────────
const SOUNDS = [
  { id: 'rain',   emoji: '🌧', label: 'Rain',        noiseType: 'brown', filter: { type: 'lowpass',  freq: 350  } },
  { id: 'white',  emoji: '🌊', label: 'Ocean',       noiseType: 'white', filter: { type: 'lowpass',  freq: 2000 } },
  { id: 'forest', emoji: '🌿', label: 'Forest',      noiseType: 'pink',  filter: { type: 'bandpass', freq: 900  } },
  { id: 'cafe',   emoji: '☕', label: 'Café',        noiseType: 'brown', filter: { type: 'bandpass', freq: 700  } },
  { id: 'lofi',   emoji: '🎵', label: 'Lo-Fi',       noiseType: 'pink',  filter: { type: 'lowpass',  freq: 400  } },
]

function buildNoiseBuffer(ctx, type) {
  const sr  = ctx.sampleRate
  const len = sr * 5 // 5-second looping buffer
  const buf = ctx.createBuffer(2, len, sr)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    if (type === 'white') {
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    } else if (type === 'brown') {
      let last = 0
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1
        d[i] = (last + 0.02 * w) / 1.02
        last = d[i]
        d[i] *= 3.5
      }
    } else { // pink
      let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1
        b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759
        b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856
        b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980
        d[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11; b6=w*0.115926
      }
    }
  }
  return buf
}

const LOFI_EMBED = 'https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&controls=0&loop=1&playlist=jfKfPfyJRdk'

function AmbientPlayer() {
  const [active,  setActive]  = useState(null)
  const [volume,  setVolume]  = useLS('scc_amb_vol', 0.35)
  const ctxRef   = useRef(null)
  const nodesRef = useRef({})
  const iframeRef = useRef(null)

  function stopAll() {
    try { nodesRef.current.source?.stop() } catch {}
    try { nodesRef.current.gain?.disconnect() } catch {}
    nodesRef.current = {}
  }

  async function toggleSound(id) {
    if (active === id) {
      stopAll(); setActive(null); return
    }
    stopAll()
    setActive(id)

    if (id === 'lofi') return // YouTube iframe handles playback

    const sound = SOUNDS.find(s => s.id === id)
    if (!sound) return

    try {
      if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)()
      const ctx = ctxRef.current
      if (ctx.state === 'suspended') await ctx.resume()

      const buf    = buildNoiseBuffer(ctx, sound.noiseType)
      const source = ctx.createBufferSource()
      source.buffer = buf; source.loop = true

      const gain = ctx.createGain()
      gain.gain.value = volume

      if (sound.filter) {
        const filt = ctx.createBiquadFilter()
        filt.type = sound.filter.type
        filt.frequency.value = sound.filter.freq
        filt.Q.value = 0.7
        source.connect(filt); filt.connect(gain)
      } else {
        source.connect(gain)
      }

      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.setTargetAtTime(volume, ctx.currentTime, 0.4)
      gain.connect(ctx.destination)
      source.start()
      nodesRef.current = { source, gain }
    } catch (e) { console.error('Audio error', e) }
  }

  useEffect(() => {
    if (nodesRef.current.gain && ctxRef.current) {
      const param = nodesRef.current.gain.gain
      const now = ctxRef.current.currentTime
      param.cancelScheduledValues(now)
      param.setValueAtTime(volume, now)
    }
  }, [volume])

  useEffect(() => () => { stopAll(); ctxRef.current?.close() }, [])

  return (
    <div style={s.card}>
      <div style={s.cardHeader}>
        <span style={s.cardTitle}>🎧 Ambient</span>
        {active && (
          <span style={{ fontSize: '0.68rem', color: '#3FB950', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#3FB950', display: 'inline-block', animation: 'brand-dot-pulse 1.8s ease-in-out infinite' }} />
            {active === 'lofi' ? 'Lofi Girl Live' : 'Playing'}
          </span>
        )}
      </div>

      {/* Hidden YouTube iframe for Lo-Fi — only mounted when active */}
      {active === 'lofi' && (
        <iframe
          ref={iframeRef}
          src={LOFI_EMBED}
          allow="autoplay"
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
          title="lofi"
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '14px' }}>
        {SOUNDS.map(sound => (
          <button key={sound.id} onClick={() => toggleSound(sound.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
            padding: '8px 4px', borderRadius: '10px', border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', transition: 'all .18s',
            backgroundColor: active === sound.id ? '#58A6FF22' : 'var(--bg-elevated)',
            outline: active === sound.id ? '1.5px solid #58A6FF' : '1.5px solid transparent',
            transform: active === sound.id ? 'scale(1.06)' : 'scale(1)',
            boxShadow: active === sound.id ? '0 4px 16px rgba(88,166,255,0.25)' : 'none',
          }}>
            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{sound.emoji}</span>
            <span style={{ fontSize: '0.58rem', fontWeight: 600, color: active === sound.id ? '#58A6FF' : 'var(--text-muted)' }}>
              {sound.label}
            </span>
          </button>
        ))}
      </div>

      {/* Volume (noise sounds only — YouTube controls its own volume) */}
      {active !== 'lofi' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.78rem', flexShrink: 0 }}>🔈</span>
          <input type="range" min={0} max={1} step={0.02} value={volume}
            onChange={e => setVolume(Number(e.target.value))}
            style={{ flex: 1, accentColor: '#58A6FF', cursor: 'pointer', height: '4px' }}
          />
          <span style={{ fontSize: '0.78rem', flexShrink: 0 }}>🔊</span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', minWidth: '28px', textAlign: 'right' }}>
            {Math.round(volume * 100)}%
          </span>
        </div>
      )}
      {active === 'lofi' && (
        <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
          🎵 Lofi Girl — use your system volume to adjust
        </p>
      )}

    </div>
  )
}

// ─── Scratchpad ───────────────────────────────────────────────────────────────
function Scratchpad() {
  const [text,   setText]   = useLS('scc_scratchpad', '')
  const [open,   setOpen]   = useLS('scc_scratchpad_open', false)
  const [copied, setCopied] = useState(false)

  function share() {
    const msg = `📝 Study Notes\n\nHey Yin, Bin & Lynx!\n\n${text}\n\n— shared from Study Command Center`
    navigator.clipboard.writeText(msg).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  return (
    <div style={s.card}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ ...s.cardHeader, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: open ? 14 : 0 }}
      >
        <span style={s.cardTitle}>📝 Scratchpad</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Quick notes, formulas, reminders…"
            style={{ ...s.textInput, height: '120px', resize: 'vertical', lineHeight: 1.55 }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={share}
              disabled={!text.trim()}
              style={{
                flex: 1, padding: '7px 0', borderRadius: '8px', border: 'none', cursor: 'pointer',
                backgroundColor: copied ? '#3FB950' : '#58A6FF', color: '#fff',
                fontWeight: 600, fontSize: '0.75rem', fontFamily: 'inherit',
                opacity: text.trim() ? 1 : 0.4, transition: 'background-color .2s, opacity .15s',
              }}
            >
              {copied ? '✓ Copied to clipboard!' : '📤 Share with Yin, Bin & Lynx'}
            </button>
            {text && (
              <button onClick={() => setText('')} style={{ ...s.ghostBtn, color: '#F85149', flexShrink: 0 }}>Clear</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Small helpers ────────────────────────────────────────────────────────────
function IconBtn({ onClick, title, children }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick} title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? 'var(--bg-elevated)' : 'none',
        border: '1px solid var(--border)', borderRadius: '6px',
        color: 'var(--text-muted)', cursor: 'pointer', padding: '3px 7px',
        fontSize: '0.82rem', fontFamily: 'inherit', transition: 'background .12s',
      }}
    >{children}</button>
  )
}

// ─── FocusHub (main export) ───────────────────────────────────────────────────
const WIDGET_ORDER_DEFAULT = ['pomo', 'tasks', 'links']

const WIDGET_FLEX = { pomo: '0 0 320px', tasks: '1 1 0', links: '0 0 260px' }
const WIDGET_LABEL = { pomo: 'Timer & Sound', tasks: 'Tasks', links: 'Quick Links' }

export default function FocusHub() {
  const [order,     setOrder]     = useLS('scc_widget_order', WIDGET_ORDER_DEFAULT)
  const [maximized, setMaximized] = useState(null)
  const [dragOver,  setDragOver]  = useState(null)
  const dragSrc = useRef(null)

  const handleDragStart = useCallback((id) => { dragSrc.current = id }, [])
  const handleDragEnter = useCallback((id) => setDragOver(id), [])
  const handleDragEnd   = useCallback(() => { dragSrc.current = null; setDragOver(null) }, [])
  const handleDrop = useCallback((targetId) => {
    if (!dragSrc.current || dragSrc.current === targetId) return
    setOrder(prev => {
      const next = [...prev]
      const from = next.indexOf(dragSrc.current)
      const to   = next.indexOf(targetId)
      next.splice(from, 1)
      next.splice(to, 0, dragSrc.current)
      return next
    })
    dragSrc.current = null
    setDragOver(null)
  }, [])

  function widgetContent(id) {
    if (id === 'pomo')  return <><PomodoroTimer /><AmbientPlayer /></>
    if (id === 'tasks') return <><TodoWidget /><Scratchpad /></>
    if (id === 'links') return <BookmarksWidget />
  }

  // ── Maximized view ──────────────────────────────────────────────────────────
  if (maximized) {
    return (
      <div style={{
        padding: '16px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px',
        fontFamily: "'Inter', system-ui, sans-serif", backgroundColor: 'var(--bg-main)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            ⤢ {WIDGET_LABEL[maximized]}
          </span>
          <button onClick={() => setMaximized(null)} style={{ ...s.ghostBtn }}>↙ Restore Layout</button>
        </div>
        {widgetContent(maximized)}
      </div>
    )
  }

  // ── Normal grid ─────────────────────────────────────────────────────────────
  return (
    <div style={{
      padding: '16px', flex: 1, overflowY: 'auto',
      display: 'flex', gap: '14px', alignItems: 'start',
      fontFamily: "'Inter', system-ui, sans-serif",
      backgroundColor: 'var(--bg-main)',
    }}>
      {order.map(id => (
        <div
          key={id}
          style={{
            flex: WIDGET_FLEX[id], display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0,
            opacity: dragOver === id && dragSrc.current !== id ? 0.5 : 1,
            transition: 'opacity .15s',
          }}
          onDragOver={e => { e.preventDefault(); handleDragEnter(id) }}
          onDrop={() => handleDrop(id)}
        >
          {/* Drag handle bar */}
          <div
            draggable
            onDragStart={() => handleDragStart(id)}
            onDragEnd={handleDragEnd}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '5px 10px', borderRadius: '8px', cursor: 'grab',
              backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)',
              userSelect: 'none', transition: 'border-color .15s',
              borderColor: dragOver === id && dragSrc.current !== id ? '#58A6FF' : 'var(--border)',
            }}
          >
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ letterSpacing: '1px', fontSize: '0.9rem', opacity: 0.5 }}>⠿</span>
              {WIDGET_LABEL[id]}
            </span>
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={() => setMaximized(id)}
              title="Expand"
              style={{ ...s.ghostBtn, fontSize: '0.68rem', padding: '2px 7px' }}
            >⤢</button>
          </div>
          {widgetContent(id)}
        </div>
      ))}
    </div>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const s = {
  card: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    padding: '16px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
    animation: 'slideUp .28s cubic-bezier(.16,1,.3,1) both',
  },
  cardHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '14px',
  },
  cardTitle: {
    fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.01em',
  },
  iconBtn: {
    background: 'none', border: '1px solid var(--border)', borderRadius: '6px',
    color: 'var(--text-muted)', cursor: 'pointer', padding: '4px 8px',
    fontSize: '0.85rem', fontFamily: 'inherit', transition: 'background .12s',
  },
  stepBtn: {
    width: '26px', height: '26px', borderRadius: '6px', border: '1px solid var(--border)',
    backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.9rem', fontFamily: 'inherit', fontWeight: 700,
  },
  ghostBtn: {
    background: 'none', border: '1px solid var(--border)', borderRadius: '7px',
    color: 'var(--text-muted)', cursor: 'pointer', padding: '4px 10px',
    fontSize: '0.73rem', fontWeight: 600, fontFamily: 'inherit', transition: 'all .12s',
  },
  textInput: {
    backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.83rem',
    padding: '8px 10px', fontFamily: 'inherit', outline: 'none', width: '100%',
    boxSizing: 'border-box', transition: 'border-color .15s',
  },
}
