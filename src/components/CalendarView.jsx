import { useState, useEffect, useRef } from 'react'

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']

const URGENCY_COLOR = { high: '#F85149', medium: '#E3B341', low: '#3FB950' }

const EVENT_COLORS = [
  '#58A6FF', // blue
  '#BC8CFF', // purple
  '#F78166', // orange
  '#E3B341', // amber
  '#3FB950', // green
  '#FF6B9D', // pink
]

function buildCells(year, month) {
  const firstDay     = new Date(year, month, 1).getDay()
  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const daysInPrevMo = new Date(year, month, 0).getDate()
  const cells = []

  for (let i = firstDay - 1; i >= 0; i--)
    cells.push({ day: daysInPrevMo - i, current: false, dateStr: null })

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, current: true, dateStr })
  }

  let nextDay = 1
  while (cells.length < 42)
    cells.push({ day: nextDay++, current: false, dateStr: null })

  return cells
}

export default function CalendarView({
  assignments,
  selectedAssignment,
  onSelect,
  customEvents = [],
  onAddCustomEvent,
  onDeleteCustomEvent,
}) {
  const today    = new Date()
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [dir,     setDir]      = useState(null)
  const [animKey, setAnimKey]  = useState(0)

  // Modal state
  const [modal, setModal] = useState(null) // { dateStr, dateLabel }
  const [title, setTitle] = useState('')
  const [color, setColor] = useState(EVENT_COLORS[0])
  const inputRef = useRef(null)

  const year  = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const todayStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')

  function changeMonth(delta) {
    setDir(delta > 0 ? 'left' : 'right')
    setAnimKey((k) => k + 1)
    setViewDate(new Date(year, month + delta, 1))
  }

  function openModal(dateStr) {
    const [y, m, d] = dateStr.split('-')
    const label = `${MONTHS[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`
    setTitle('')
    setColor(EVENT_COLORS[0])
    setModal({ dateStr, label })
  }

  function closeModal() { setModal(null) }

  function handleSave() {
    const t = title.trim()
    if (!t) return
    onAddCustomEvent?.({ id: `ce-${Date.now()}`, date: modal.dateStr, title: t, color })
    closeModal()
  }

  // Focus input when modal opens
  useEffect(() => {
    if (modal) setTimeout(() => inputRef.current?.focus(), 60)
  }, [modal])

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') closeModal() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const byDate = {}
  assignments.forEach((a) => {
    if (!byDate[a.dueDate]) byDate[a.dueDate] = []
    byDate[a.dueDate].push(a)
  })

  const customByDate = {}
  customEvents.forEach((e) => {
    if (!customByDate[e.date]) customByDate[e.date] = []
    customByDate[e.date].push(e)
  })

  const cells = buildCells(year, month)

  return (
    <>
      <style>{CSS}</style>
      <div style={s.wrap}>

        {/* ── Header ────────────────────────────────────────── */}
        <div style={s.header}>
          <NavBtn onClick={() => changeMonth(-1)}>←</NavBtn>
          <div style={s.monthWrap}>
            <span style={s.monthTitle}>{MONTHS[month]}</span>
            <span style={s.yearLabel}>{year}</span>
          </div>
          <NavBtn onClick={() => changeMonth(1)}>→</NavBtn>
        </div>

        {/* ── Legend ────────────────────────────────────────── */}
        <div style={s.legend}>
          {Object.entries(URGENCY_COLOR).map(([k, c]) => (
            <span key={k} style={s.legendItem}>
              <span style={{ ...s.legendDot, backgroundColor: c, boxShadow: `0 0 4px ${c}` }} />
              <span style={s.legendTxt}>{k.charAt(0).toUpperCase() + k.slice(1)}</span>
            </span>
          ))}
          <span style={s.legendItem}>
            <span style={{ ...s.legendDot, backgroundColor: '#F8514966', border: '1px solid #F85149' }} />
            <span style={s.legendTxt}>Overdue</span>
          </span>
          <span style={s.legendItem}>
            <span style={{ ...s.legendDot, backgroundColor: '#58A6FF44', border: '1px dashed #58A6FF' }} />
            <span style={s.legendTxt}>My Event</span>
          </span>
          <span style={{ ...s.legendItem, marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            Click any date to add an event
          </span>
        </div>

        {/* ── Grid ──────────────────────────────────────────── */}
        <div style={s.dayLabels}>
          {DAYS.map((d) => <div key={d} style={s.dayLabel}>{d}</div>)}
        </div>

        <div
          key={animKey}
          style={{
            ...s.grid,
            animation: dir === 'left'
              ? 'calSlideLeft .35s cubic-bezier(.16,1,.3,1) both'
              : dir === 'right'
              ? 'calSlideRight .35s cubic-bezier(.16,1,.3,1) both'
              : 'none',
          }}
        >
          {cells.map((cell, i) => (
            <CalCell
              key={i}
              cell={cell}
              asgns={cell.dateStr ? (byDate[cell.dateStr] ?? []) : []}
              customEvts={cell.dateStr ? (customByDate[cell.dateStr] ?? []) : []}
              isToday={cell.dateStr === todayStr}
              isPast={cell.dateStr ? cell.dateStr < todayStr : false}
              selectedAssignment={selectedAssignment}
              onSelect={onSelect}
              onAddClick={() => cell.current && cell.dateStr && openModal(cell.dateStr)}
              onDeleteCustom={onDeleteCustomEvent}
            />
          ))}
        </div>
      </div>

      {/* ── Add Event Modal ────────────────────────────────── */}
      {modal && (
        <div style={s.backdrop} onClick={closeModal}>
          <div style={s.modalCard} className="animate-popIn" onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <p style={s.modalTitle}>Add Event</p>
                <p style={s.modalDate}>{modal.label}</p>
              </div>
              <button style={s.modalClose} onClick={closeModal}>✕</button>
            </div>

            <input
              ref={inputRef}
              style={s.titleInput}
              placeholder="Event title…"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              maxLength={60}
            />

            <p style={s.colorLabel}>Color</p>
            <div style={s.colorRow}>
              {EVENT_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  title={c}
                  style={{
                    ...s.colorSwatch,
                    backgroundColor: c,
                    transform:  color === c ? 'scale(1.25)' : 'scale(1)',
                    boxShadow:  color === c ? `0 0 0 2px var(--bg-surface), 0 0 0 4px ${c}` : 'none',
                  }}
                />
              ))}
            </div>

            <div style={s.modalFooter}>
              <button style={s.cancelBtn} onClick={closeModal}>Cancel</button>
              <button
                style={{ ...s.saveBtn, opacity: title.trim() ? 1 : 0.45, cursor: title.trim() ? 'pointer' : 'default' }}
                onClick={handleSave}
                disabled={!title.trim()}
              >
                Save Event
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function CalCell({ cell, asgns, customEvts, isToday, isPast, selectedAssignment, onSelect, onAddClick, onDeleteCustom }) {
  const [hov, setHov] = useState(false)
  const [hovCustom, setHovCustom] = useState(null) // id of hovered custom event

  const hasOverdue = isPast && asgns.some((a) => a.status !== 'completed')
  const hasContent = asgns.length > 0 || customEvts.length > 0

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => cell.current && onAddClick()}
      style={{
        ...s.cell,
        opacity:         cell.current ? 1 : 0.25,
        backgroundColor: isToday   ? 'color-mix(in srgb, #58A6FF 15%, var(--bg-surface))'
                       : hasOverdue ? 'var(--wrong-bg)'
                       : hov && cell.current ? 'var(--bg-hover)'
                       : 'var(--bg-surface)',
        border: isToday    ? '1px solid #58A6FF'
              : hasOverdue ? '1px solid #F8514944'
              : hov && cell.current ? '1px solid var(--border-strong)'
              : '1px solid var(--bg-elevated)',
        boxShadow: isToday ? '0 0 0 2px #58A6FF33' : 'none',
        cursor: cell.current ? 'pointer' : 'default',
        transition: 'background-color .15s, border-color .15s, box-shadow .15s',
        position: 'relative',
      }}
    >
      <span
        style={{
          ...s.dayNum,
          color:      isToday ? '#58A6FF' : hasOverdue ? '#F85149' : cell.current ? 'var(--text-primary)' : 'var(--border-strong)',
          fontWeight: isToday || hasOverdue ? 700 : 400,
        }}
      >
        {cell.day}
        {hasOverdue && <span style={s.warnDot} title="Overdue">●</span>}
      </span>

      {/* "+" hint on hover for empty current days */}
      {hov && cell.current && !hasContent && (
        <div style={s.addHint}>+</div>
      )}

      <div style={s.chips}>
        {/* Assignment chips */}
        {asgns.slice(0, 2).map((a) => {
          const c     = URGENCY_COLOR[a.urgency] ?? '#8B949E'
          const isSel = a.id === selectedAssignment
          return (
            <div
              key={a.id}
              title={a.title}
              onClick={(e) => { e.stopPropagation(); cell.current && onSelect(a.id) }}
              style={{
                ...s.chip,
                backgroundColor: a.status === 'completed' ? 'var(--bg-elevated)' : c + '22',
                color:           a.status === 'completed' ? 'var(--text-muted)' : c,
                border:          isSel ? `1px solid ${c}` : `1px solid ${c}44`,
                boxShadow:       isSel ? `0 0 6px ${c}66` : 'none',
                textDecoration:  a.status === 'completed' ? 'line-through' : 'none',
                opacity:         a.status === 'completed' ? 0.5 : 1,
                transform:       isSel ? 'scale(1.03)' : 'none',
                transition:      'transform .15s, box-shadow .15s',
              }}
            >
              {a.title.length > 13 ? a.title.slice(0, 12) + '…' : a.title}
            </div>
          )
        })}

        {/* Custom event chips */}
        {customEvts.slice(0, 2).map((ev) => (
          <div
            key={ev.id}
            title={ev.title}
            onMouseEnter={() => setHovCustom(ev.id)}
            onMouseLeave={() => setHovCustom(null)}
            onClick={e => e.stopPropagation()}
            style={{
              ...s.chip,
              ...s.customChip,
              backgroundColor: ev.color + '20',
              color:           ev.color,
              border:          `1px dashed ${ev.color}88`,
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'space-between',
              gap:             '2px',
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              ✦ {ev.title.length > 10 ? ev.title.slice(0, 9) + '…' : ev.title}
            </span>
            {hovCustom === ev.id && (
              <span
                onClick={(e) => { e.stopPropagation(); onDeleteCustom?.(ev.id) }}
                style={s.deleteX}
                title="Remove"
              >×</span>
            )}
          </div>
        ))}

        {/* Overflow count */}
        {(asgns.length + customEvts.length) > 4 && (
          <span style={s.more}>+{asgns.length + customEvts.length - 4} more</span>
        )}
        {asgns.length > 2 && customEvts.length === 0 && (
          <span style={s.more}>+{asgns.length - 2} more</span>
        )}
      </div>
    </div>
  )
}

function NavBtn({ children, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...s.navBtn,
        backgroundColor: hov ? 'var(--bg-elevated)' : 'var(--bg-surface)',
        transform:       hov ? 'scale(1.08)' : 'scale(1)',
        boxShadow:       hov ? '0 0 12px rgba(88,166,255,.2)' : 'none',
      }}
    >
      {children}
    </button>
  )
}

const CSS = `
  @keyframes calSlideLeft {
    from { opacity:0; transform: translateX(30px); }
    to   { opacity:1; transform: translateX(0); }
  }
  @keyframes calSlideRight {
    from { opacity:0; transform: translateX(-30px); }
    to   { opacity:1; transform: translateX(0); }
  }
`

const s = {
  wrap: {
    backgroundColor: 'var(--bg-main)',
    minHeight: '100vh',
    padding: '24px 18px',
    fontFamily: "'Inter', system-ui, sans-serif",
    color: 'var(--text-primary)',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    transition: 'background-color 0.25s ease',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    padding: '7px 18px',
    fontSize: '1rem',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background-color .15s, transform .15s, box-shadow .15s',
  },
  monthWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1px',
  },
  monthTitle: {
    fontSize: '1.2rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '0.01em',
  },
  yearLabel: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  legend: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    flexWrap: 'wrap',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  legendDot: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  legendTxt: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
  },
  dayLabels: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px',
  },
  dayLabel: {
    fontSize: '0.65rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    textAlign: 'center',
    padding: '4px 0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px',
  },
  cell: {
    borderRadius: '8px',
    padding: '6px 6px 8px',
    minHeight: '80px',
  },
  dayNum: {
    fontSize: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    marginBottom: '5px',
  },
  warnDot: {
    fontSize: '0.4rem',
    color: '#F85149',
    lineHeight: 1,
  },
  addHint: {
    position: 'absolute',
    bottom: '6px',
    right: '7px',
    fontSize: '0.9rem',
    color: 'var(--text-muted)',
    opacity: 0.5,
    lineHeight: 1,
    pointerEvents: 'none',
  },
  chips: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  chip: {
    fontSize: '0.6rem',
    fontWeight: 500,
    padding: '2px 5px',
    borderRadius: '4px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  customChip: {
    borderRadius: '4px',
    fontStyle: 'italic',
    cursor: 'default',
  },
  deleteX: {
    fontStyle: 'normal',
    fontSize: '0.75rem',
    fontWeight: 700,
    lineHeight: 1,
    cursor: 'pointer',
    flexShrink: 0,
    opacity: 0.8,
  },
  more: {
    fontSize: '0.58rem',
    color: 'var(--text-muted)',
    paddingLeft: '3px',
  },

  // ── Modal ──────────────────────────────────────────────────────────────────
  backdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 700,
    padding: '24px',
  },
  modalCard: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '24px',
    width: '100%',
    maxWidth: '380px',
    boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '18px',
  },
  modalTitle: {
    margin: '0 0 2px',
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  modalDate: {
    margin: 0,
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  modalClose: {
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    color: 'var(--text-muted)',
    width: '28px',
    height: '28px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Inter', system-ui, sans-serif",
    flexShrink: 0,
  },
  titleInput: {
    width: '100%',
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    padding: '10px 12px',
    fontFamily: "'Inter', system-ui, sans-serif",
    outline: 'none',
    marginBottom: '18px',
    boxSizing: 'border-box',
    transition: 'border-color .15s',
  },
  colorLabel: {
    margin: '0 0 8px',
    fontSize: '0.68rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  colorRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '22px',
  },
  colorSwatch: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    transition: 'transform .15s, box-shadow .15s',
  },
  modalFooter: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text-muted)',
    padding: '8px 16px',
    fontSize: '0.83rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  saveBtn: {
    backgroundColor: '#238636',
    border: '1px solid #2EA043',
    borderRadius: '8px',
    color: '#fff',
    padding: '8px 18px',
    fontSize: '0.83rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Inter', system-ui, sans-serif",
    transition: 'opacity .15s',
  },
}
