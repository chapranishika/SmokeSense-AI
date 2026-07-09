import { useEffect, useRef } from 'react'
import { useStore } from '../store'

/**
 * Connects to /ws/wearable/{user_id}?token=... for live Bayesian predictions
 * streamed from the FastAPI backend every 30s. Falls back gracefully if the
 * WebSocket is unavailable (e.g. proxy not configured) — HomeScreen's
 * polling via fetchLivePrediction still covers that case.
 */
export function useWearableWS() {
  const { token, user } = useStore()
  const wsRef = useRef(null)

  useEffect(() => {
    if (!token || !user?.id) return

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const url = `${proto}://${window.location.host}/ws/wearable/${user.id}?token=${encodeURIComponent(token)}`

    let ws
    try {
      ws = new WebSocket(url)
    } catch {
      return
    }
    wsRef.current = ws

    ws.onopen = () => useStore.setState({ wsConnected: true })
    ws.onclose = () => useStore.setState({ wsConnected: false })
    ws.onerror = () => useStore.setState({ wsConnected: false })

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'wearable_update') {
          useStore.setState({
            prediction: {
              ...data.prediction,
              wearable: { ...data.sensor, source: 'Samsung Health (live WebSocket)' }
            }
          })
        }
      } catch {}
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [token, user?.id])

  return useStore(s => s.wsConnected)
}
