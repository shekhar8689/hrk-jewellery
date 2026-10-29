import { Component } from 'react'

/*
 * If any page crashes, show a friendly message with a way back instead of a
 * blank white screen.
 */
export default class ErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error, info) { console.error('Page crashed:', error, info?.componentStack) }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="min-h-[70vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-serif text-3xl text-gray-800">Something went wrong</h1>
        <p className="text-gray-500 max-w-sm">Sorry — this page didn't load properly. Please reload. Your bag is saved.</p>
        <div className="flex gap-3">
          <button type="button" onClick={() => window.location.reload()} className="btn-gold">Reload page</button>
          <a href="/" className="border border-gray-300 px-6 py-3 text-sm text-gray-700 hover:bg-gray-50">Go to home</a>
        </div>
      </main>
    )
  }
}
