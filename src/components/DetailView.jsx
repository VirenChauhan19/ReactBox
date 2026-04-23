import { useState, useEffect } from 'react'

const STATUS_LABEL = { 'not-started': 'Not Started', 'in-progress': 'In Progress', completed: 'Completed' }
const STATUS_COLOR = { 'not-started': '#8B949E', 'in-progress': '#E3B341', completed: '#3FB950' }

async function callOpenRouter(system, userContent) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY ?? ''}`,
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `API error ${res.status}`)
  }
  const data = await res.json()
  return (data.choices?.[0]?.message?.content ?? '').trim()
}

// ── Quiz ─────────────────────────────────────────────────────────────────────
function QuizView({ questions }) {
  const [answers, setAnswers] = useState({})

  const answered = Object.keys(answers).length
  const score    = Object.entries(answers).filter(([qi, ci]) => questions[+qi]?.correct === ci).length
  const allDone  = answered === questions.length

  function pick(qi, ci) {
    if (answers[qi] !== undefined) return
    setAnswers((p) => ({ ...p, [qi]: ci }))
  }

  return (
    <div>
      {questions.map((q, qi) => {
        const sel = answers[qi]
        return (
          <div
            key={qi}
            className="animate-slideUp"
            style={{ ...qs.question, animationDelay: `${qi * 60}ms` }}
          >
            <p style={qs.qText}><span style={qs.qNum}>{qi + 1}</span>{q.question}</p>
            <div style={qs.choices}>
              {q.choices.map((choice, ci) => {
                const isCorrect  = ci === q.correct
                const isSelected = ci === sel
                const revealed   = sel !== undefined

                let bg     = 'var(--bg-main)'
                let border = 'var(--border)'
                let color  = 'var(--text-body)'
                let icon   = ''

                if (revealed) {
                  if (isCorrect)        { bg = 'var(--correct-bg)'; border = '#3FB950'; color = '#3FB950'; icon = '✓ ' }
                  else if (isSelected)  { bg = 'var(--wrong-bg)'; border = '#F85149'; color = '#F85149'; icon = '✗ ' }
                }

                return (
                  <button
                    key={ci}
                    className={!revealed ? 'choice-btn' : ''}
                    style={{
                      ...qs.choice,
                      backgroundColor: bg,
                      border: `1px solid ${border}`,
                      color,
                      cursor: revealed ? 'default' : 'pointer',
                      animation: revealed && (isCorrect || isSelected)
                        ? 'choiceReveal .3s ease both'
                        : 'none',
                    }}
                    onClick={() => pick(qi, ci)}
                  >
                    <span style={qs.letter}>{String.fromCharCode(65 + ci)}.</span>
                    {icon}{choice}
                  </button>
                )
              })}
            </div>
            {sel !== undefined && (
              <p style={{ ...qs.feedback, color: sel === q.correct ? '#3FB950' : '#F85149' }}>
                {sel === q.correct ? '✓ Correct!' : `✗ Answer: ${String.fromCharCode(65 + q.correct)}`}
              </p>
            )}
          </div>
        )
      })}

      {/* Score card */}
      {allDone && (
        <div style={qs.scoreCard} className="animate-popIn">
          <div style={qs.scoreEmoji}>
            {score === questions.length ? '🏆' : score >= questions.length * 0.6 ? '🎉' : '📚'}
          </div>
          <p style={qs.scoreNum}>
            <span style={{ color: score === questions.length ? '#3FB950' : score >= questions.length * 0.6 ? '#E3B341' : '#F85149' }}>
              {score}
            </span>
            /{questions.length}
          </p>
          <p style={qs.scoreLabel}>
            {score === questions.length ? 'Perfect score!' : score >= questions.length * 0.6 ? 'Good work!' : 'Keep studying!'}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Notes renderer ───────────────────────────────────────────────────────────
function parseBold(text) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((p, i) => i % 2 === 1 ? <strong key={i} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{p}</strong> : p)
}

function renderNotes(text) {
  if (!text) return null
  const lines = text.split('\n')
  const out = []
  let listItems = []
  let k = 0

  function flushList() {
    if (!listItems.length) return
    out.push(
      <ul key={`ul${k++}`} style={{ margin: '2px 0 12px', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '5px', listStyle: 'none' }}>
        {listItems.map((item, i) => (
          <li key={i} style={{ fontSize: '0.87rem', color: 'var(--text-body)', lineHeight: 1.65, display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <span style={{ color: '#58A6FF', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>·</span>
            <span>{parseBold(item)}</span>
          </li>
        ))}
      </ul>
    )
    listItems = []
  }

  lines.forEach(line => {
    const t = line.trim()
    if (!t) { flushList(); return }

    if (t.startsWith('### ')) {
      flushList()
      out.push(<h4 key={k++} style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '16px 0 6px' }}>{t.slice(4)}</h4>)
    } else if (t.startsWith('## ')) {
      flushList()
      out.push(<h3 key={k++} style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '18px 0 8px', paddingBottom: '6px', borderBottom: '1px solid var(--border)' }}>{t.slice(3)}</h3>)
    } else if (t.startsWith('# ')) {
      flushList()
      out.push(<h2 key={k++} style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '20px 0 10px' }}>{t.slice(2)}</h2>)
    } else if (/^[•\-\*] /.test(t)) {
      listItems.push(t.slice(2))
    } else if (/^\d+\. /.test(t)) {
      const content = t.replace(/^\d+\.\s*/, '')
      const num = t.match(/^(\d+)/)?.[1]
      flushList()
      out.push(
        <div key={k++} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '6px' }}>
          <span style={{ minWidth: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#58A6FF22', color: '#58A6FF', fontSize: '0.68rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>{num}</span>
          <span style={{ fontSize: '0.87rem', color: 'var(--text-body)', lineHeight: 1.65 }}>{parseBold(content)}</span>
        </div>
      )
    } else {
      flushList()
      out.push(<p key={k++} style={{ margin: '0 0 8px', fontSize: '0.87rem', color: 'var(--text-body)', lineHeight: 1.7 }}>{parseBold(t)}</p>)
    }
  })
  flushList()
  return out
}

// ── Main ─────────────────────────────────────────────────────────────────────
const STUDY_MODE_HINTS = {
  peak:   { notesStyle: 'Go deep — include advanced details, edge cases, and exam traps. This student is in peak cognitive state.',   quizStyle: 'Make the questions challenging with nuanced answer choices.' },
  review: { notesStyle: 'Focus on key concepts and memorable summaries. Reinforce existing knowledge concisely.',                     quizStyle: 'Balance difficulty — some recall, some application questions.'     },
  rest:   { notesStyle: 'Keep it very brief and simple. Bullet-point the most essential 3–5 facts only. Avoid overwhelming detail.', quizStyle: 'Use straightforward recall questions only.'                         },
}

export default function DetailView({ selectedAssignment, onNotesGenerated, onQuizGenerated, biometricData, studyMode, compact }) {
  const [notesLoading, setNotesLoading] = useState(false)
  const [quizLoading,  setQuizLoading]  = useState(false)
  const [notesError,   setNotesError]   = useState('')
  const [quizError,    setQuizError]    = useState('')
  const [activeTab,    setActiveTab]    = useState('notes') // 'notes' | 'quiz'

  // Reset tab when assignment changes
  useEffect(() => { setActiveTab('notes') }, [selectedAssignment?.id])

  if (!selectedAssignment) {
    return (
      <div style={s.container} className="glass-panel">
        <div style={s.empty}>
          <span style={s.emptyIcon}>📋</span>
          <p style={s.emptyText}>Select an assignment to view details</p>
        </div>
      </div>
    )
  }

  const { id, course, title, dueDate, weight, status, description, notes, quiz } = selectedAssignment
  const isPast = new Date(dueDate + 'T23:59:59').getTime() < Date.now() && status !== 'completed'

  const modeHints    = STUDY_MODE_HINTS[studyMode] ?? {}
  const bioCtx = biometricData
    ? `\nStudent biometrics: recovery ${biometricData.recoveryScore ?? '?'}%, HR ${biometricData.restingHR ?? '?'} bpm, HRV ${biometricData.hrv ? Math.round(biometricData.hrv) + 'ms' : '?'}. Study mode: ${studyMode ?? 'unknown'}.`
    : ''

  async function handleGenerateNotes() {
    setNotesLoading(true); setNotesError('')
    try {
      const system = [
        'You are a study assistant. Generate clear, structured study notes for the given assignment. Use headers (##), bullet points (•), and concise language. Return plain text — no JSON.',
        modeHints.notesStyle ?? '',
      ].filter(Boolean).join(' ')
      const result = await callOpenRouter(
        system,
        `Course: ${course}\nAssignment: ${title}\nDescription: ${description}${bioCtx}`
      )
      onNotesGenerated(id, result)
      setActiveTab('notes')
    } catch (err) { setNotesError(err.message) }
    finally { setNotesLoading(false) }
  }

  async function handleGenerateQuiz() {
    setQuizLoading(true); setQuizError('')
    try {
      const system = [
        `You are a study assistant. Generate exactly 5 multiple choice questions for the given assignment.\nReturn ONLY a valid JSON array, no markdown, no explanation:\n[{"question":"...","choices":["A text","B text","C text","D text"],"correct":0}]\n"correct" is the zero-based index of the right answer.`,
        modeHints.quizStyle ?? '',
      ].filter(Boolean).join(' ')
      const raw = await callOpenRouter(
        system,
        `Course: ${course}\nAssignment: ${title}\nDescription: ${description}${bioCtx}`
      )
      const clean  = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
      const parsed = JSON.parse(clean)
      if (!Array.isArray(parsed)) throw new Error('Response was not a JSON array')
      onQuizGenerated(id, parsed)
      setActiveTab('quiz')
    } catch (err) { setQuizError(err.message) }
    finally { setQuizLoading(false) }
  }

  const statusColor = STATUS_COLOR[status] ?? '#8B949E'

  // Countdown calc
  const msUntilDue   = new Date(dueDate + 'T23:59:59').getTime() - Date.now()
  const daysLeft     = Math.ceil(msUntilDue / 86400000)
  const dueDateFmt   = new Date(dueDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const urgencyColor = isPast ? '#F85149' : daysLeft <= 3 ? '#F85149' : daysLeft <= 7 ? '#E3B341' : '#58A6FF'
  const countdownNum = isPast ? 'LATE' : daysLeft === 0 ? 'TODAY' : daysLeft === 1 ? '1' : String(daysLeft)
  const countdownSub = isPast ? 'overdue' : daysLeft === 0 ? '' : daysLeft === 1 ? 'day left' : 'days left'

  const modeColor = { peak: '#3FB950', review: '#E3B341', rest: '#F85149' }[studyMode]
  const modeIcon  = { peak: '⚡', review: '📖', rest: '😴' }[studyMode]

  // ── Compact mode (calendar sidebar) ─────────────────────────────────────────
  if (compact) {
    return (
      <div key={id} style={{ padding: '14px 16px', fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--text-primary)', height: '100%', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', boxSizing: 'border-box' }} className="animate-fadeIn">
        <style>{CSS}</style>

        {/* Header row: course + status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: urgencyColor, boxShadow: `0 0 6px ${urgencyColor}`, flexShrink: 0 }} />
            <span style={{ fontSize: '0.63rem', fontWeight: 800, color: '#58A6FF', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{course}</span>
          </div>
          <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', backgroundColor: statusColor + '22', color: statusColor, border: `1px solid ${statusColor}44` }}>
            {STATUS_LABEL[status] ?? status}
          </span>
        </div>

        {/* Title */}
        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.25, letterSpacing: '-0.01em', textDecoration: status === 'completed' ? 'line-through' : 'none', opacity: status === 'completed' ? 0.5 : 1 }}>
          {title}
        </h2>

        {/* Inline meta: urgency pill + date + weight */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', backgroundColor: urgencyColor + '18', color: urgencyColor, border: `1px solid ${urgencyColor}33` }}>
            {isPast ? 'LATE' : daysLeft === 0 ? 'TODAY' : `${daysLeft}d left`}
          </span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500 }}>{dueDateFmt}</span>
          {weight > 0 && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500 }}>· {weight}%</span>}
          {studyMode && <span style={{ fontSize: '0.68rem', fontWeight: 700, color: modeColor }}>{modeIcon} {studyMode}</span>}
        </div>

        {/* Description – 3-line clamp */}
        {description && (
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-body)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {description}
          </p>
        )}

        {/* Compact action buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { label: 'Notes', icon: '📝', loading: notesLoading, color: '#58A6FF', onClick: handleGenerateNotes },
            { label: 'Quiz',  icon: '🎯', loading: quizLoading,  color: '#BC8CFF', onClick: handleGenerateQuiz  },
          ].map(({ label, icon, loading, color, onClick }) => (
            <CompactBtn key={label} icon={icon} label={label} loading={loading} disabled={notesLoading || quizLoading} color={color} onClick={onClick} />
          ))}
        </div>

        {(notesError || quizError) && <ErrorBox msg={notesError || quizError} />}

        {/* Tabs + content – grows to fill */}
        {(notes || (quiz && quiz.length > 0)) && (
          <>
            <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              {notes            && <TabBtn active={activeTab === 'notes'} onClick={() => setActiveTab('notes')}>📝 Notes</TabBtn>}
              {quiz?.length > 0 && <TabBtn active={activeTab === 'quiz'}  onClick={() => setActiveTab('quiz')}>🎯 Quiz</TabBtn>}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {activeTab === 'notes' && notes && (
                <div key="notes" className="animate-fadeIn" style={{ ...s.notesBlock, margin: 0, border: 'none', padding: '4px 0', background: 'none' }}>
                  {renderNotes(notes)}
                </div>
              )}
              {activeTab === 'quiz' && quiz?.length > 0 && (
                <div key="quiz" className="animate-slideUp"><QuizView questions={quiz} /></div>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div key={id} style={{ ...s.container, borderLeft: `3px solid ${urgencyColor}44` }} className="glass-panel animate-fadeIn detail-container">
      <>
        <style>{CSS}</style>

        {/* ── Course + status ─────────────────────────────────── */}
        <div style={s.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: urgencyColor, boxShadow: `0 0 8px ${urgencyColor}`, flexShrink: 0 }} />
            <span style={s.course}>{course}</span>
          </div>
          <span style={{ ...s.statusBadge, backgroundColor: statusColor + '22', color: statusColor, border: `1px solid ${statusColor}55` }}>
            {STATUS_LABEL[status] ?? status}
          </span>
        </div>

        {/* ── Title ───────────────────────────────────────────── */}
        <h1 style={{ ...s.title, textDecoration: status === 'completed' ? 'line-through' : 'none', opacity: status === 'completed' ? 0.5 : 1 }}>
          {title}
        </h1>

        {/* ── Due date hero + weight row ───────────────────────── */}
        <div style={s.heroRow}>
          {/* Due date big card */}
          <div style={{ ...s.dueCard, borderColor: urgencyColor + '44', background: `linear-gradient(135deg, ${urgencyColor}12 0%, ${urgencyColor}06 100%)` }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: urgencyColor, textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.8 }}>Due Date</div>
            <div style={{ fontSize: isPast || daysLeft === 0 ? '1.6rem' : '2.8rem', fontWeight: 900, color: urgencyColor, lineHeight: 1, marginTop: '4px', letterSpacing: '-0.02em' }}>
              {countdownNum}
            </div>
            {countdownSub && <div style={{ fontSize: '0.7rem', color: urgencyColor, opacity: 0.75, fontWeight: 600, marginTop: '2px' }}>{countdownSub}</div>}
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px', fontWeight: 500 }}>{dueDateFmt}</div>
          </div>

          {/* Weight card */}
          {weight > 0 && (
            <div style={s.weightCard}>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Grade Weight</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1, marginTop: '4px', letterSpacing: '-0.02em' }}>
                {weight}<span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>%</span>
              </div>
              <div style={{ marginTop: '8px', height: '4px', borderRadius: '4px', backgroundColor: 'var(--border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${weight}%`, borderRadius: '4px', background: `linear-gradient(90deg, #58A6FF, #BC8CFF)`, transition: 'width 1s ease' }} />
              </div>
            </div>
          )}

          {/* Biometric mode badge */}
          {studyMode && (
            <div style={{ ...s.weightCard, borderColor: modeColor + '44', background: `linear-gradient(135deg, ${modeColor}12, ${modeColor}06)`, justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: '6px' }}>
              <div style={{ fontSize: '1.6rem' }}>{modeIcon}</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: modeColor }}>{studyMode === 'peak' ? 'Peak Focus' : studyMode === 'review' ? 'Review Mode' : 'Rest Mode'}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>brain state</div>
            </div>
          )}
        </div>

        {/* ── Description ─────────────────────────────────────── */}
        <div style={s.descCard}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Assignment Details</div>
          <p style={s.description}>{description}</p>
        </div>

        {/* ── Action buttons ──────────────────────────────────── */}
        <div style={s.actions}>
          <GlowButton label="Generate Notes" icon="📝" loading={notesLoading} disabled={notesLoading || quizLoading} color="#58A6FF" onClick={handleGenerateNotes} />
          <GlowButton label="Generate Quiz"  icon="🎯" loading={quizLoading}  disabled={notesLoading || quizLoading} color="#BC8CFF" onClick={handleGenerateQuiz}  />
        </div>

        {notesError && <ErrorBox msg={notesError} />}
        {quizError  && <ErrorBox msg={quizError}  />}

        {/* ── Content tabs ────────────────────────────────────── */}
        {(notes || (quiz && quiz.length > 0)) && (
          <div style={s.tabBar}>
            {notes            && <TabBtn active={activeTab === 'notes'} onClick={() => setActiveTab('notes')}>📝 Notes</TabBtn>}
            {quiz?.length > 0 && <TabBtn active={activeTab === 'quiz'}  onClick={() => setActiveTab('quiz')}>🎯 Quiz</TabBtn>}
          </div>
        )}

        {activeTab === 'notes' && notes && (
          <div key="notes" className="animate-fadeIn" style={s.notesBlock}>
            {renderNotes(notes)}
          </div>
        )}
        {activeTab === 'quiz' && quiz?.length > 0 && (
          <div key="quiz" className="animate-slideUp"><QuizView questions={quiz} /></div>
        )}
      </>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
function CompactBtn({ label, icon, loading, disabled, color, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
        padding: '7px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700,
        fontFamily: "'Inter', system-ui, sans-serif", cursor: disabled ? 'default' : 'pointer',
        border: `1px solid ${hov && !disabled ? color + '88' : color + '33'}`,
        backgroundColor: hov && !disabled ? color + '18' : 'var(--bg-surface)',
        color: hov && !disabled ? color : 'var(--text-body)',
        opacity: disabled ? 0.45 : 1,
        transition: 'all .15s ease',
      }}
      disabled={disabled} onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
    >
      {loading ? <span style={s.spinner} /> : <span style={{ fontSize: '0.85rem' }}>{icon}</span>}
      {loading ? 'Working…' : label}
    </button>
  )
}

function GlowButton({ label, icon, loading, disabled, color, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      style={{
        ...s.btn,
        background:   hov && !disabled ? `linear-gradient(135deg, ${color}22, ${color}14)` : 'var(--bg-surface)',
        borderColor:  hov && !disabled ? color + '88' : color + '44',
        boxShadow:    hov && !disabled ? `0 0 20px ${color}33, 0 4px 12px rgba(0,0,0,.25)` : '0 1px 4px rgba(0,0,0,.15)',
        transform:    hov && !disabled ? 'translateY(-2px)' : 'none',
        opacity:      disabled ? 0.45 : 1,
        cursor:       disabled ? 'default' : 'pointer',
        color:        hov && !disabled ? color : 'var(--text-primary)',
      }}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {loading ? <span style={s.spinner} /> : <span style={{ fontSize: '1rem' }}>{icon}</span>}
      <span style={{ fontWeight: 600 }}>{loading ? 'Working…' : label}</span>
    </button>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...s.tabBtn,
        color:           active ? 'var(--text-primary)' : 'var(--text-muted)',
        borderBottom:    active ? '2px solid #58A6FF' : '2px solid transparent',
        backgroundColor: active ? 'var(--bg-elevated)' : 'transparent',
      }}
    >
      {children}
    </button>
  )
}

function ErrorBox({ msg }) {
  return (
    <div style={s.errorBox} className="animate-slideDown">
      <strong>Error:</strong> {msg}
    </div>
  )
}

const CSS = `
  .choice-btn:hover {
    background-color: var(--bg-hover) !important;
    border-color: var(--border-strong) !important;
    transform: translateX(3px);
    transition: all .15s ease;
  }
`

const s = {
  container: {
    backgroundColor: 'var(--bg-main)',
    minHeight: '100%',
    padding: '28px 24px',
    fontFamily: "'Inter', system-ui, sans-serif",
    color: 'var(--text-primary)',
    overflowY: 'auto',
    transition: 'background-color 0.25s ease',
    boxSizing: 'border-box',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60vh',
    gap: '12px',
  },
  emptyIcon: { fontSize: '2.5rem' },
  emptyText: { fontSize: '0.88rem', color: 'var(--text-muted)' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  course: {
    fontSize: '0.68rem',
    fontWeight: 800,
    color: '#58A6FF',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  statusBadge: {
    fontSize: '0.67rem',
    fontWeight: 700,
    padding: '3px 10px',
    borderRadius: '99px',
    letterSpacing: '0.04em',
  },
  title: {
    margin: '0 0 20px',
    fontSize: '1.75rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
    transition: 'opacity .2s',
  },
  // New hero layout
  heroRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '18px',
    flexWrap: 'wrap',
  },
  dueCard: {
    flex: '0 0 auto',
    minWidth: '110px',
    padding: '14px 18px',
    borderRadius: '14px',
    border: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0px',
    transition: 'border-color 0.25s ease',
  },
  weightCard: {
    flex: '0 0 auto',
    minWidth: '110px',
    padding: '14px 18px',
    borderRadius: '14px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg-surface)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0px',
    transition: 'background-color 0.25s ease, border-color 0.25s ease',
  },
  descCard: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '16px 18px',
    marginBottom: '18px',
    transition: 'background-color 0.25s ease',
  },
  description: {
    margin: 0,
    fontSize: '0.875rem',
    color: 'var(--text-body)',
    lineHeight: 1.7,
  },
  actions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    marginBottom: '12px',
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '11px 18px',
    fontSize: '0.85rem',
    fontWeight: 600,
    fontFamily: "'Inter', system-ui, sans-serif",
    transition: 'transform .15s, box-shadow .15s, opacity .15s',
    flex: 1,
    justifyContent: 'center',
    minWidth: '130px',
  },
  spinner: {
    display: 'inline-block',
    width: '13px',
    height: '13px',
    border: '2px solid var(--border)',
    borderTopColor: '#58A6FF',
    borderRadius: '50%',
    animation: 'spin .7s linear infinite',
    flexShrink: 0,
  },
  errorBox: {
    backgroundColor: 'var(--overdue-bg)',
    border: '1px solid #F85149',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '0.8rem',
    color: '#F85149',
    marginTop: '6px',
    marginBottom: '6px',
  },
  tabBar: {
    display: 'flex',
    gap: '2px',
    marginTop: '20px',
    marginBottom: '14px',
    borderBottom: '1px solid var(--border)',
  },
  tabBtn: {
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    padding: '8px 16px',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Inter', system-ui, sans-serif",
    borderRadius: '6px 6px 0 0',
    transition: 'color .15s, background-color .15s',
    marginBottom: '-1px',
  },
  notesBlock: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '20px',
    fontFamily: "'Inter', system-ui, sans-serif",
    overflowX: 'auto',
    transition: 'background-color 0.25s ease, border-color 0.25s ease',
  },
}

const qs = {
  question: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '12px',
    transition: 'background-color 0.25s ease, border-color 0.25s ease',
  },
  qText: {
    margin: '0 0 12px',
    fontSize: '0.88rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
    lineHeight: 1.5,
    display: 'flex',
    gap: '8px',
  },
  qNum: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    backgroundColor: '#58A6FF22',
    color: '#58A6FF',
    borderRadius: '50%',
    fontSize: '0.7rem',
    fontWeight: 700,
    flexShrink: 0,
    marginTop: '1px',
  },
  choices: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  choice: {
    textAlign: 'left',
    borderRadius: '6px',
    padding: '9px 12px',
    fontSize: '0.83rem',
    fontFamily: "'Inter', system-ui, sans-serif",
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    transition: 'border-color .15s, background-color .15s, transform .1s',
  },
  letter: {
    fontWeight: 700,
    flexShrink: 0,
    width: '18px',
  },
  feedback: {
    margin: '10px 0 0',
    fontSize: '0.78rem',
    fontWeight: 600,
  },
  scoreCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '24px',
    marginTop: '16px',
    transition: 'background-color 0.25s ease, border-color 0.25s ease',
  },
  scoreEmoji: { fontSize: '2rem' },
  scoreNum: {
    fontSize: '1.8rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  scoreLabel: {
    fontSize: '0.83rem',
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
}
