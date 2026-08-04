import { ref } from 'vue'

const STORAGE_KEY = 'load:workout-draft'

export interface SavedDraft {
  sessionId: string
  notes: string
  savedAt: string
}

function read(): SavedDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SavedDraft) : null
  } catch {
    return null
  }
}

function write(draft: SavedDraft) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  } catch {
    // Storage may be unavailable (private mode); persistence is best-effort.
  }
}

function clear() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

/**
 * Local persistence for the in-progress workout draft so a refresh mid-session
 * does not lose the user's entered reps/weight. The server remains the source of
 * truth for completed sets; this only protects the unsynced draft values.
 */
export function useWorkoutDraft() {
  const savedAt = ref<string | null>(read()?.savedAt ?? null)

  function persist(sessionId: string, notes: string) {
    const draft: SavedDraft = { sessionId, notes, savedAt: new Date().toISOString() }
    write(draft)
    savedAt.value = draft.savedAt
  }

  function restoreFor(sessionId: string): SavedDraft | null {
    const draft = read()
    return draft && draft.sessionId === sessionId ? draft : null
  }

  function discard() {
    clear()
    savedAt.value = null
  }

  return { savedAt, persist, restoreFor, discard }
}
