const BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

function headers(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

function assignmentToEvent(a) {
  return {
    summary: `[${a.course}] ${a.title}`,
    description: [
      a.description,
      a.weight ? `Weight: ${a.weight}%` : '',
      a.notes  ? `\nNotes:\n${a.notes}` : '',
    ].filter(Boolean).join('\n'),
    start: { date: a.dueDate },
    end:   { date: a.dueDate },
    colorId: a.urgency === 'high' ? '11' : a.urgency === 'medium' ? '5' : '2',
    status: a.status === 'completed' ? 'cancelled' : 'confirmed',
  }
}

export async function createEvent(token, assignment) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(assignmentToEvent(assignment)),
  })
  if (!res.ok) throw new Error(`Calendar create failed: ${res.status}`)
  const data = await res.json()
  return data.id
}

export async function updateEvent(token, eventId, assignment) {
  const res = await fetch(`${BASE}/${eventId}`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify(assignmentToEvent(assignment)),
  })
  if (!res.ok) throw new Error(`Calendar update failed: ${res.status}`)
}

export async function syncAllAssignments(token, assignments, calEventIds, setCalEventIds) {
  const updated = { ...calEventIds }

  await Promise.allSettled(
    assignments.map(async (a) => {
      try {
        if (updated[a.id]) {
          await updateEvent(token, updated[a.id], a)
        } else {
          const eventId = await createEvent(token, a)
          updated[a.id] = eventId
        }
      } catch (e) {
        console.warn(`Calendar sync failed for ${a.id}:`, e.message)
      }
    })
  )

  setCalEventIds(updated)
}
