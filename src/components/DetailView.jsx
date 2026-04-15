import { useState } from 'react'

const STATUS_LABEL = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  completed: 'Completed',
}

const STATUS_COLOR = {
  'not-started': '#8B949E',
  'in-progress': '#E3B341',
  completed: '#3FB950',
}

async function callGemini(system, userContent) {
  const key = import.meta.env.VITE_GEMINI_API_KEY ?? ''
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ parts: [{ text: userContent }] }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `API error ${res.status}`)
  }

  const data = await res.json()
  return (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim()
}

function QuizView({ questions }) {
  const [answers, setAnswers] = useState({})

  function pick(qIdx, choice) {
    if (answers[qIdx] !== undefined) return
    setAnswers((prev) => ({ ...prev, [qIdx]: choice }))
  }

  return (
    <div style={qs.container}>
      {questions.map((q, qi) => {
        const selected = answers[qi]
        return (
          <div key={qi} style={qs.question}>
            <p style={qs.qText}>
              {qi + 1}. {q.question}
            </p>
            <div style={qs.choices}>
              {q.choices.map((choice, ci) => {
                let bg = '#161B22'
                let border = '#30363D'
                let color = '#C9D1D9'

                if (selected !== undefined) {
                  if (ci === q.correct) {
                    bg = '#0D2E1A'
                    border = '#3FB950'
                    color = '#3FB950'
                  } else if (ci === selected) {
                    bg = '#2E0D0D'
                    border = '#F85149'
                    color = '#F85149'
                  }
                } else if (selected === undefined) {
                  // hover handled via inline style only
                }

                return (
                  <button
                    key={ci}
                    style={{
                      ...qs.choice,
                      backgroundColor: bg,
                      border: `1px solid ${border}`,
                      color,
                      cursor: selected !== undefined ? 'default' : 'pointer',
                    }}
                    onClick={() => pick(qi, ci)}
                  >
                    <span style={qs.choiceLetter}>
                      {String.fromCharCode(65 + ci)}.
                    </span>{' '}
                    {choice}
                  </button>
                )
              })}
            </div>
            {selected !== undefined && (
              <p
                style={{
                  ...qs.feedback,
                  color: selected === q.correct ? '#3FB950' : '#F85149',
                }}
              >
                {selected === q.correct
                  ? '✓ Correct'
                  : `✗ Correct answer: ${String.fromCharCode(65 + q.correct)}`}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function DetailView({ selectedAssignment, onNotesGenerated, onQuizGenerated }) {
  const [notesLoading, setNotesLoading] = useState(false)
  const [quizLoading, setQuizLoading] = useState(false)
  const [notesError, setNotesError] = useState('')
  const [quizError, setQuizError] = useState('')

  if (!selectedAssignment) {
    return (
      <div style={s.container}>
        <p style={{ color: '#8B949E', marginTop: '40px', textAlign: 'center' }}>
          Select an assignment to view details.
        </p>
      </div>
    )
  }

  const { id, course, title, dueDate, weight, status, description, notes, quiz } =
    selectedAssignment

  async function handleGenerateNotes() {
    setNotesLoading(true)
    setNotesError('')
    try {
      const result = await callGemini(
        'You are a study assistant. Generate clear, structured study notes for the given assignment. Use headers, bullet points, and concise language. Return plain text — no JSON.',
        `Course: ${course}\nAssignment: ${title}\nDescription: ${description}`
      )
      onNotesGenerated(id, result)
    } catch (err) {
      setNotesError(err.message)
    } finally {
      setNotesLoading(false)
    }
  }

  async function handleGenerateQuiz() {
    setQuizLoading(true)
    setQuizError('')
    try {
      const raw = await callGemini(
        `You are a study assistant. Generate exactly 5 multiple choice questions for the given assignment.
Return ONLY a valid JSON array, no markdown, no explanation:
[{"question":"...","choices":["A text","B text","C text","D text"],"correct":0}]
"correct" is the zero-based index of the right answer.`,
        `Course: ${course}\nAssignment: ${title}\nDescription: ${description}`
      )
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) throw new Error('Response was not a JSON array')
      onQuizGenerated(id, parsed)
    } catch (err) {
      setQuizError(err.message)
    } finally {
      setQuizLoading(false)
    }
  }

  return (
    <div style={s.container}>
      <p style={s.course}>{course}</p>
      <h1 style={s.title}>{title}</h1>

      <div style={s.meta}>
        <MetaItem label="Due Date" value={dueDate} />
        <MetaItem label="Weight" value={`${weight}%`} />
        <MetaItem
          label="Status"
          value={STATUS_LABEL[status] ?? status}
          valueColor={STATUS_COLOR[status]}
        />
      </div>

      <p style={s.description}>{description}</p>

      <div style={s.actions}>
        <ActionButton
          label="Generate Notes"
          loading={notesLoading}
          onClick={handleGenerateNotes}
          disabled={notesLoading || quizLoading}
        />
        <ActionButton
          label="Generate Quiz"
          loading={quizLoading}
          onClick={handleGenerateQuiz}
          disabled={notesLoading || quizLoading}
        />
      </div>

      {notesError && <ErrorLine msg={notesError} />}
      {quizError && <ErrorLine msg={quizError} />}

      {notes && (
        <section style={s.section}>
          <h3 style={s.sectionHeading}>Study Notes</h3>
          <pre style={s.notesBlock}>{notes}</pre>
        </section>
      )}

      {quiz && quiz.length > 0 && (
        <section style={s.section}>
          <h3 style={s.sectionHeading}>Practice Quiz</h3>
          <QuizView questions={quiz} />
        </section>
      )}
    </div>
  )
}

function MetaItem({ label, value, valueColor }) {
  return (
    <div style={s.metaItem}>
      <span style={s.metaLabel}>{label}</span>
      <span style={{ ...s.metaValue, ...(valueColor ? { color: valueColor } : {}) }}>
        {value}
      </span>
    </div>
  )
}

function ActionButton({ label, loading, onClick, disabled }) {
  return (
    <button
      style={{
        ...s.button,
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'default' : 'pointer',
      }}
      onClick={onClick}
      disabled={disabled}
    >
      {loading ? (
        <span style={s.btnSpinner} />
      ) : null}
      {loading ? 'Working…' : label}
    </button>
  )
}

function ErrorLine({ msg }) {
  return <p style={s.errorLine}>Error: {msg}</p>
}

const s = {
  container: {
    backgroundColor: '#0D1117',
    minHeight: '100vh',
    padding: '28px 24px',
    fontFamily: "'Inter', 'system-ui', sans-serif",
    color: '#FFFFFF',
    overflowY: 'auto',
  },
  course: {
    margin: '0 0 6px',
    fontSize: '0.72rem',
    fontWeight: 700,
    color: '#58A6FF',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
  },
  title: {
    margin: '0 0 20px',
    fontSize: '1.4rem',
    fontWeight: 700,
    color: '#E6EDF3',
    lineHeight: 1.3,
  },
  meta: {
    display: 'flex',
    gap: '28px',
    marginBottom: '18px',
    flexWrap: 'wrap',
  },
  metaItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  metaLabel: {
    fontSize: '0.68rem',
    fontWeight: 600,
    color: '#8B949E',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  metaValue: {
    fontSize: '0.88rem',
    fontWeight: 500,
    color: '#E6EDF3',
  },
  description: {
    margin: '0 0 24px',
    fontSize: '0.88rem',
    color: '#C9D1D9',
    lineHeight: 1.65,
  },
  actions: {
    display: 'flex',
    gap: '10px',
    marginBottom: '8px',
    flexWrap: 'wrap',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#21262D',
    color: '#E6EDF3',
    border: '1px solid #30363D',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '0.85rem',
    fontWeight: 500,
    fontFamily: "'Inter', 'system-ui', sans-serif",
    transition: 'background-color 0.15s',
  },
  btnSpinner: {
    display: 'inline-block',
    width: '12px',
    height: '12px',
    border: '2px solid #30363D',
    borderTopColor: '#58A6FF',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    flexShrink: 0,
  },
  errorLine: {
    margin: '8px 0 0',
    fontSize: '0.8rem',
    color: '#F85149',
  },
  section: {
    marginTop: '28px',
    borderTop: '1px solid #21262D',
    paddingTop: '20px',
  },
  sectionHeading: {
    margin: '0 0 14px',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#8B949E',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  notesBlock: {
    margin: 0,
    padding: '16px',
    backgroundColor: '#161B22',
    border: '1px solid #30363D',
    borderRadius: '6px',
    fontSize: '0.83rem',
    color: '#C9D1D9',
    lineHeight: 1.7,
    whiteSpace: 'pre-wrap',
    fontFamily: "'Inter', 'system-ui', sans-serif",
    overflowX: 'auto',
  },
}

const qs = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  question: {
    backgroundColor: '#161B22',
    border: '1px solid #30363D',
    borderRadius: '8px',
    padding: '16px',
  },
  qText: {
    margin: '0 0 12px',
    fontSize: '0.88rem',
    fontWeight: 500,
    color: '#E6EDF3',
    lineHeight: 1.5,
  },
  choices: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  choice: {
    textAlign: 'left',
    borderRadius: '5px',
    padding: '8px 12px',
    fontSize: '0.83rem',
    fontFamily: "'Inter', 'system-ui', sans-serif",
    transition: 'border-color 0.15s',
  },
  choiceLetter: {
    fontWeight: 700,
  },
  feedback: {
    margin: '10px 0 0',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
}
