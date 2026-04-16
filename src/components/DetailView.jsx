import { useState, useEffect } from 'react'

const STATUS_LABEL = { 'not-started': 'Not Started', 'in-progress': 'In Progress', completed: 'Completed' }
const STATUS_COLOR = { 'not-started': '#8B949E', 'in-progress': '#E3B341', completed: '#3FB950' }

async function callGemini(system, userContent) {
  const key = import.meta.env.VITE_GEMINI_API_KEY ?? ''
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents:           [{ parts: [{ text: userContent }] }],
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `API error ${res.status}`)
  }
  const data = await res.json()
  return (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim()
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

// ── Main ─────────────────────────────────────────────────────────────────────
export default function DetailView({ selectedAssignment, onNotesGenerated, onQuizGenerated }) {
  const [notesLoading, setNotesLoading] = useState(false)
  const [quizLoading,  setQuizLoading]  = useState(false)
  const [notesError,   setNotesError]   = useState('')
  const [quizError,    setQuizError]    = useState('')
  const [activeTab,    setActiveTab]    = useState('notes') // 'notes' | 'quiz'

  // Reset tab when assignment changes
  useEffect(() => { setActiveTab('notes') }, [selectedAssignment?.id])

  if (!selectedAssignment) {
    return (
      <div style={s.container}>
        <div style={s.empty}>
          <span style={s.emptyIcon}>📋</span>
          <p style={s.emptyText}>Select an assignment to view details</p>
        </div>
      </div>
    )
  }

  const { id, course, title, dueDate, weight, status, description, notes, quiz } = selectedAssignment
  const isPast = new Date(dueDate + 'T23:59:59').getTime() < Date.now() && status !== 'completed'

  async function handleGenerateNotes() {
    setNotesLoading(true); setNotesError('')
    try {
      const result = await callGemini(
        'You are a study assistant. Generate clear, structured study notes for the given assignment. Use headers (##), bullet points (•), and concise language. Return plain text — no JSON.',
        `Course: ${course}\nAssignment: ${title}\nDescription: ${description}`
      )
      onNotesGenerated(id, result)
      setActiveTab('notes')
    } catch (err) { setNotesError(err.message) }
    finally { setNotesLoading(false) }
  }

  async function handleGenerateQuiz() {
    setQuizLoading(true); setQuizError('')
    try {
      const raw = await callGemini(
        `You are a study assistant. Generate exactly 5 multiple choice questions for the given assignment.
Return ONLY a valid JSON array, no markdown, no explanation:
[{"question":"...","choices":["A text","B text","C text","D text"],"correct":0}]
"correct" is the zero-based index of the right answer.`,
        `Course: ${course}\nAssignment: ${title}\nDescription: ${description}`
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

  return (
    // key={id} causes full remount → triggers entrance animation on each new assignment
    <div key={id} style={s.container} className="animate-fadeIn">
      <>
        <style>{CSS}</style>

        {/* ── Header ──────────────────────────────────────────── */}
        <div style={s.header}>
          <span style={s.course}>{course}</span>
          <span
            style={{
              ...s.statusBadge,
              backgroundColor: statusColor + '22',
              color:           statusColor,
              border:          `1px solid ${statusColor}55`,
            }}
          >
            {STATUS_LABEL[status] ?? status}
          </span>
        </div>

        <h1 style={{
          ...s.title,
          textDecoration: status === 'completed' ? 'line-through' : 'none',
          opacity:        status === 'completed' ? 0.6 : 1,
        }}>
          {title}
        </h1>

        {/* ── Meta row ────────────────────────────────────────── */}
        <div style={s.metaRow}>
          <MetaChip icon="📅" label="Due" value={dueDate} highlight={isPast ? '#F85149' : null} />
          {weight > 0 && <MetaChip icon="⚖️" label="Weight" value={`${weight}%`} />}
        </div>

        {isPast && status !== 'completed' && (
          <div style={s.overdueBar} className="animate-slideDown">
            ⚠ This assignment is past its due date
          </div>
        )}

        <p style={s.description}>{description}</p>

        {/* ── Action buttons ──────────────────────────────────── */}
        <div style={s.actions}>
          <GlowButton
            label="Generate Notes"
            icon="📝"
            loading={notesLoading}
            disabled={notesLoading || quizLoading}
            color="#58A6FF"
            onClick={handleGenerateNotes}
          />
          <GlowButton
            label="Generate Quiz"
            icon="🎯"
            loading={quizLoading}
            disabled={notesLoading || quizLoading}
            color="#BC8CFF"
            onClick={handleGenerateQuiz}
          />
        </div>

        {notesError && <ErrorBox msg={notesError} />}
        {quizError  && <ErrorBox msg={quizError}  />}

        {/* ── Content tabs ────────────────────────────────────── */}
        {(notes || (quiz && quiz.length > 0)) && (
          <div style={s.tabBar}>
            {notes && (
              <TabBtn active={activeTab === 'notes'} onClick={() => setActiveTab('notes')}>
                📝 Notes
              </TabBtn>
            )}
            {quiz && quiz.length > 0 && (
              <TabBtn active={activeTab === 'quiz'} onClick={() => setActiveTab('quiz')}>
                🎯 Quiz
              </TabBtn>
            )}
          </div>
        )}

        {activeTab === 'notes' && notes && (
          <div key="notes" className="animate-fadeIn" style={s.notesBlock}>
            {notes}
          </div>
        )}

        {activeTab === 'quiz' && quiz && quiz.length > 0 && (
          <div key="quiz" className="animate-slideUp">
            <QuizView questions={quiz} />
          </div>
        )}
      </>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
function MetaChip({ icon, label, value, highlight }) {
  return (
    <div style={s.metaChip}>
      <span style={s.metaIcon}>{icon}</span>
      <div>
        <p style={s.metaLabel}>{label}</p>
        <p style={{ ...s.metaValue, color: highlight ?? 'var(--text-primary)' }}>{value}</p>
      </div>
    </div>
  )
}

function GlowButton({ label, icon, loading, disabled, color, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      style={{
        ...s.btn,
        borderColor:  color + '55',
        boxShadow:    hov ? `0 0 16px ${color}44, 0 2px 8px rgba(0,0,0,.3)` : '0 1px 4px rgba(0,0,0,.2)',
        transform:    hov ? 'translateY(-2px)' : 'none',
        opacity:      disabled ? 0.55 : 1,
        cursor:       disabled ? 'default' : 'pointer',
      }}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {loading
        ? <span style={s.spinner} />
        : <span>{icon}</span>
      }
      {loading ? 'Working…' : label}
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
    minHeight: '100vh',
    padding: '24px 22px',
    fontFamily: "'Inter', system-ui, sans-serif",
    color: 'var(--text-primary)',
    overflowY: 'auto',
    transition: 'background-color 0.25s ease',
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
    marginBottom: '8px',
  },
  course: {
    fontSize: '0.7rem',
    fontWeight: 700,
    color: '#58A6FF',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
  },
  statusBadge: {
    fontSize: '0.68rem',
    fontWeight: 700,
    padding: '3px 9px',
    borderRadius: '99px',
    letterSpacing: '0.04em',
  },
  title: {
    margin: '0 0 16px',
    fontSize: '1.35rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: 1.3,
    transition: 'opacity .2s',
  },
  metaRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '14px',
  },
  metaChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '8px 12px',
    transition: 'background-color 0.25s ease, border-color 0.25s ease',
  },
  metaIcon: { fontSize: '1rem' },
  metaLabel: {
    fontSize: '0.6rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '2px',
  },
  metaValue: {
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  overdueBar: {
    backgroundColor: 'var(--overdue-bg)',
    border: '1px solid #F8514955',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '0.78rem',
    color: '#F85149',
    marginBottom: '14px',
  },
  description: {
    margin: '0 0 20px',
    fontSize: '0.875rem',
    color: 'var(--text-body)',
    lineHeight: 1.65,
  },
  actions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    marginBottom: '10px',
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '9px 16px',
    fontSize: '0.83rem',
    fontWeight: 500,
    fontFamily: "'Inter', system-ui, sans-serif",
    transition: 'transform .15s, box-shadow .15s, opacity .15s, background-color 0.25s ease',
  },
  spinner: {
    display: 'inline-block',
    width: '12px',
    height: '12px',
    border: '2px solid var(--border)',
    borderTopColor: '#58A6FF',
    borderRadius: '50%',
    animation: 'spin .7s linear infinite',
    flexShrink: 0,
  },
  errorBox: {
    backgroundColor: 'var(--overdue-bg)',
    border: '1px solid #F85149',
    borderRadius: '6px',
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
    borderBottom: '1px solid var(--bg-elevated)',
  },
  tabBtn: {
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    padding: '8px 14px',
    fontSize: '0.83rem',
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
    borderRadius: '8px',
    padding: '16px',
    fontSize: '0.83rem',
    color: 'var(--text-body)',
    lineHeight: 1.75,
    whiteSpace: 'pre-wrap',
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
