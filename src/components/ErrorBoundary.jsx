import React from 'react'
import { reportError } from '../lib/telemetry'

// Reusable error boundary with a warm, patient-friendly fallback.
// Large text, no stack traces, no jargon — a 60-year-old patient should
// feel reassured, not blamed. Crashes are reported via telemetry (no PII).
//
// NOTE: src/App.jsx currently keeps its own small inline boundary (added
// before this component existed). Prefer this one for any new route trees.

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { crashed: false }
  }

  static getDerivedStateFromError() {
    return { crashed: true }
  }

  componentDidCatch(error, info) {
    // Never surfaces to the user; telemetry scrubs PII automatically.
    reportError(error, { componentStack: 'hidden', route: this.props.routeName || 'unknown' })
  }

  handleRetry = () => {
    this.setState({ crashed: false })
  }

  render() {
    if (this.state.crashed) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center bg-white">
          <div className="text-6xl mb-5" role="img" aria-label="stethoscope">🩺</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Something went wrong
          </h1>
          <p className="text-lg text-gray-600 mb-2 max-w-md">
            Don't worry — your health records are safe.
          </p>
          <p className="text-lg text-gray-600 mb-8 max-w-md">
            Please try again, or head back home.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs sm:max-w-none sm:w-auto">
            <button
              onClick={this.handleRetry}
              className="btn-primary text-lg px-8 py-3"
            >
              Try again
            </button>
            <a
              href="/"
              className="text-lg px-8 py-3 rounded-ios border border-gray-300 text-gray-700 font-medium text-center"
            >
              Go home
            </a>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
