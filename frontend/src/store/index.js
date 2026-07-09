import { create } from 'zustand'

const API = '/api'

const headers = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {})
})

export const useStore = create((set, get) => ({
  // Auth
  token: localStorage.getItem('ss_token'),
  user: null,
  authLoading: false,

  // Prediction
  prediction: null,
  predicting: false,
  predHistory: [],
  wsConnected: false,

  // Diary
  diary: [],
  // NRT
  nrtLog: [],
  // Reasons
  reasons: [],
  // Progress
  progress: null,

  // Model
  modelWeights: null,
  modelMetrics: null,

  // Active screen
  screen: 0,
  toolTab: 'tools',
  resTab: 'results',
  commTab: 'feed',

  setScreen: (s) => set({ screen: s }),
  setToolTab: (t) => set({ toolTab: t }),
  setResTab: (t) => set({ resTab: t }),
  setCommTab: (t) => set({ commTab: t }),

  // ── Auth ──────────────────────────────────────────────────
  login: async (username, password) => {
    set({ authLoading: true })
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ username, password })
      })
      if (!res.ok) throw new Error('Invalid credentials')
      const data = await res.json()
      localStorage.setItem('ss_token', data.token)
      set({ token: data.token, user: data.user, authLoading: false })
      return true
    } catch (e) {
      set({ authLoading: false })
      return false
    }
  },

  logout: () => {
    localStorage.removeItem('ss_token')
    set({ token: null, user: null })
  },

  fetchMe: async () => {
    const { token } = get()
    if (!token) return
    try {
      const res = await fetch(`${API}/user/me`, { headers: headers(token) })
      if (res.ok) set({ user: await res.json() })
      else if (res.status === 401) get().logout()
    } catch {}
  },

  // ── Predict ───────────────────────────────────────────────
  predict: async (params) => {
    const { token } = get()
    set({ predicting: true })
    try {
      const res = await fetch(`${API}/predict`, {
        method: 'POST',
        headers: headers(token),
        body: JSON.stringify(params)
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        set({ predicting: false })
        if (res.status === 401) get().logout()
        return { error: err.detail || 'Prediction failed' }
      }
      const data = await res.json()
      set({ prediction: data, predicting: false })
      return data
    } catch {
      set({ predicting: false })
      return { error: 'Network error' }
    }
  },

  fetchPredHistory: async () => {
    const { token } = get()
    try {
      const res = await fetch(`${API}/predict/history`, { headers: headers(token) })
      if (res.ok) set({ predHistory: await res.json() })
    } catch {}
  },

  fetchLivePrediction: async () => {
    const { token } = get()
    try {
      const res = await fetch(`${API}/predict/live`, { headers: headers(token) })
      if (res.ok) {
        const data = await res.json()
        set({ prediction: data })
        return data
      } else if (res.status === 401) {
        get().logout()
      }
    } catch {}
  },

  // ── Diary ─────────────────────────────────────────────────
  fetchDiary: async () => {
    const { token } = get()
    try {
      const res = await fetch(`${API}/diary`, { headers: headers(token) })
      if (res.ok) set({ diary: await res.json() })
    } catch {}
  },

  addDiary: async (entry) => {
    const { token } = get()
    try {
      const res = await fetch(`${API}/diary`, {
        method: 'POST', headers: headers(token), body: JSON.stringify(entry)
      })
      if (res.ok) get().fetchDiary()
    } catch {}
  },

  // ── NRT ───────────────────────────────────────────────────
  fetchNRT: async () => {
    const { token } = get()
    try {
      const res = await fetch(`${API}/nrt`, { headers: headers(token) })
      if (res.ok) set({ nrtLog: await res.json() })
    } catch {}
  },

  addNRT: async (entry) => {
    const { token } = get()
    try {
      const res = await fetch(`${API}/nrt`, {
        method: 'POST', headers: headers(token), body: JSON.stringify(entry)
      })
      if (res.ok) get().fetchNRT()
    } catch {}
  },

  // ── Reasons ───────────────────────────────────────────────
  fetchReasons: async () => {
    const { token } = get()
    try {
      const res = await fetch(`${API}/reasons`, { headers: headers(token) })
      if (res.ok) set({ reasons: await res.json() })
    } catch {}
  },

  addReason: async (text) => {
    const { token } = get()
    try {
      const res = await fetch(`${API}/reasons`, {
        method: 'POST', headers: headers(token), body: JSON.stringify({ text })
      })
      if (res.ok) get().fetchReasons()
    } catch {}
  },

  toggleReason: async (id, checked) => {
    const { token } = get()
    try {
      await fetch(`${API}/reasons/${id}`, {
        method: 'PATCH', headers: headers(token), body: JSON.stringify({ checked })
      })
      set(s => ({ reasons: s.reasons.map(r => r.id === id ? { ...r, checked: checked ? 1 : 0 } : r) }))
    } catch {}
  },

  // ── Progress ──────────────────────────────────────────────
  fetchProgress: async () => {
    const { token } = get()
    try {
      const res = await fetch(`${API}/stats/progress`, { headers: headers(token) })
      if (res.ok) set({ progress: await res.json() })
    } catch {}
  },

  // ── Model ─────────────────────────────────────────────────
  fetchModelWeights: async () => {
    try {
      const res = await fetch(`${API}/model/weights`)
      if (res.ok) set({ modelWeights: await res.json() })
    } catch {}
  },

  fetchModelMetrics: async () => {
    try {
      const res = await fetch(`${API}/model/metrics`)
      if (res.ok) set({ modelMetrics: await res.json() })
    } catch {}
  },
}))
