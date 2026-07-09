import { Component } from 'react'
import { C } from './UI'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // In production you'd send this to Sentry / your logging service
    console.error('[SmokeSense] Screen error:', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 32, textAlign: 'center', gap: 14,
      }}>
        <div style={{ fontSize: 36 }}>⚠️</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--tx)' }}>
          Something went wrong
        </div>
        <div style={{ fontSize: 12, color: 'var(--mu)', lineHeight: 1.6, maxWidth: 260 }}>
          {this.state.error?.message || 'An unexpected error occurred.'}
        </div>
        <button
          onClick={() => this.setState({ hasError: false, error: null })}
          style={{
            background: C.a, color: '#fff', border: 'none',
            borderRadius: 9, padding: '10px 20px', fontSize: 13,
            fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Try again
        </button>
      </div>
    )
  }
}
