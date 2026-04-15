import { useState } from 'react'
import Browser from './components/Browser.jsx'
import DetailView from './components/DetailView.jsx'
import Controller from './components/Controller.jsx'
import UploadScreen from './components/UploadScreen.jsx'

const INITIAL_STATE = {
  selectedAssignment: 'asgn-01',
  assignments: [
    {
      id: 'asgn-01',
      course: 'AI 201',
      title: 'Project 2',
      dueDate: '2026-04-29',
      weight: 25,
      status: 'in-progress',
      description: 'Three-panel React app with shared state',
      notes: '',
      quiz: [],
      urgency: 'high',
    },
    {
      id: 'asgn-02',
      course: 'GAME 366',
      title: 'Ice Surface Material',
      dueDate: '2026-05-01',
      weight: 20,
      status: 'not-started',
      description: 'UE5 Substrate material with Niagara',
      notes: '',
      quiz: [],
      urgency: 'high',
    },
    {
      id: 'asgn-03',
      course: 'ITGM 336',
      title: 'Modular Kit Final',
      dueDate: '2026-05-10',
      weight: 30,
      status: 'not-started',
      description: 'Medieval dungeon modular kit',
      notes: '',
      quiz: [],
      urgency: 'medium',
    },
  ],
  filterCourse: 'all',
  filterStatus: 'all',
  sortBy: 'dueDate',
}

export default function App() {
  const [screen, setScreen] = useState('upload') // 'upload' | 'dashboard'

  const [selectedAssignment, setSelectedAssignment] = useState(
    INITIAL_STATE.selectedAssignment
  )
  const [assignments, setAssignments] = useState(INITIAL_STATE.assignments)
  const [filterCourse, setFilterCourse] = useState(INITIAL_STATE.filterCourse)
  const [filterStatus, setFilterStatus] = useState(INITIAL_STATE.filterStatus)
  const [sortBy, setSortBy] = useState(INITIAL_STATE.sortBy)

  console.log('Study Command Center — App State:', {
    screen,
    selectedAssignment,
    assignments,
    filterCourse,
    filterStatus,
    sortBy,
  })

  // ── Upload screen ────────────────────────────────────────────────────────────

  function handleAssignmentsLoaded(newAssignments) {
    setAssignments(newAssignments)
    setSelectedAssignment(newAssignments[0]?.id ?? '')
    setScreen('dashboard')
  }

  // ── Controller callbacks ─────────────────────────────────────────────────────

  function handleMarkComplete(id) {
    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'completed' } : a))
    )
  }

  // ── DetailView callbacks ─────────────────────────────────────────────────────

  function handleNotesGenerated(id, notes) {
    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, notes } : a))
    )
  }

  function handleQuizGenerated(id, quiz) {
    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, quiz } : a))
    )
  }

  // ── Derived state ────────────────────────────────────────────────────────────

  const selectedAssignmentObj =
    assignments.find((a) => a.id === selectedAssignment) ?? null

  const visibleAssignments = assignments
    .filter((a) => filterCourse === 'all' || a.course === filterCourse)
    .filter((a) => filterStatus === 'all' || a.status === filterStatus)
    .sort((a, b) => {
      if (sortBy === 'dueDate') return a.dueDate.localeCompare(b.dueDate)
      if (sortBy === 'weight') return b.weight - a.weight
      return 0
    })

  // ── Render ───────────────────────────────────────────────────────────────────

  if (screen === 'upload') {
    return <UploadScreen onAssignmentsLoaded={handleAssignmentsLoaded} />
  }

  return (
    <div style={styles.layout}>
      <div style={styles.panel}>
        <Browser
          assignments={visibleAssignments}
          selectedAssignment={selectedAssignment}
          onSelect={setSelectedAssignment}
        />
      </div>

      <div style={{ ...styles.panel, borderLeft: '1px solid #21262D' }}>
        <DetailView
          selectedAssignment={selectedAssignmentObj}
          onNotesGenerated={handleNotesGenerated}
          onQuizGenerated={handleQuizGenerated}
        />
      </div>

      <div style={{ ...styles.panel, borderLeft: '1px solid #21262D' }}>
        <Controller
          assignments={assignments}
          filterCourse={filterCourse}
          filterStatus={filterStatus}
          sortBy={sortBy}
          selectedAssignment={selectedAssignment}
          onFilterCourse={setFilterCourse}
          onFilterStatus={setFilterStatus}
          onSortBy={setSortBy}
          onMarkComplete={handleMarkComplete}
        />
      </div>
    </div>
  )
}

const styles = {
  layout: {
    display: 'grid',
    gridTemplateColumns: '280px 1fr 220px',
    minHeight: '100vh',
    backgroundColor: '#0D1117',
  },
  panel: {
    borderRight: '1px solid #21262D',
  },
}
