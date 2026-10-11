import { useState, useEffect } from 'react'

export function Hero() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const scrollToDownload = () => {
    const element = document.querySelector('#download')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const scrollToHowItWorks = () => {
    const element = document.querySelector('#how-it-works')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center pt-16 lg:pt-20 pb-20 lg:pb-28 overflow-hidden"
      aria-labelledby="hero-heading"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--color-forest-50)_0%,_transparent_70%)]" aria-hidden="true" />
      <div className="absolute inset-0 opacity-30" aria-hidden="true" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2316a34a' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className={`text-center lg:text-left transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="inline-flex items-center gap-2 bg-forest-50 border border-forest-200 text-forest-700 px-3 py-1 rounded-full text-sm font-medium mb-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-forest-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-forest-500"></span>
              </span>
              Now compatible with Manifest V3
            </div>

            <h1
              id="hero-heading"
              className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-semibold tracking-tight text-warm-900 leading-tight mb-6 animate-slide-up"
              style={{ animationDelay: '300ms' }}
            >
              Your best debugging tool{' '}
              <span className="text-forest-600">might be a break.</span>
            </h1>

            <p className="text-lg lg:text-xl text-warm-600 mb-8 max-w-xl mx-auto lg:mx-0 animate-slide-up" style={{ animationDelay: '400ms' }}>
              TouchGrass monitors lightweight browser signals to detect when you're stuck in unproductive loops,
              then suggests contextual breaks so you return with a fresh perspective.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 animate-slide-up" style={{ animationDelay: '500ms' }}>
              <button
                onClick={scrollToDownload}
                className="w-full sm:w-auto bg-forest-600 hover:bg-forest-700 text-white font-semibold px-8 py-4 rounded-lg text-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2 shadow-lg shadow-forest-500/25 hover:shadow-forest-500/40"
              >
                Download the Extension
              </button>
              <button
                onClick={scrollToHowItWorks}
                className="w-full sm:w-auto bg-white hover:bg-warm-50 text-warm-700 font-semibold px-8 py-4 rounded-lg text-lg border border-warm-200 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2"
              >
                See How It Works
              </button>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-warm-500 animate-fade-in" style={{ animationDelay: '600ms' }}>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-forest-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                No backend setup required
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-forest-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Uses hosted Render API
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-forest-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Open source & privacy-first
              </span>
            </div>
          </div>

          <div className="relative animate-slide-up" style={{ animationDelay: '400ms' }}>
            <ExtensionPreview />
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce" aria-hidden="true">
        <svg className="w-6 h-6 text-warm-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  )
}

function ExtensionPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-gradient-to-r from-forest-100/50 via-transparent to-grass-100/50 rounded-3xl blur-2xl" aria-hidden="true" />
      <div className="relative bg-white rounded-2xl border border-warm-200 shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-warm-50 border-b border-warm-200">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" aria-hidden="true" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" aria-hidden="true" />
            <div className="w-3 h-3 rounded-full bg-green-400" aria-hidden="true" />
          </div>
          <div className="flex-1 text-center text-sm text-warm-500 font-mono">touchgrass-extension</div>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-forest-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-forest-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-warm-900">Activity Score</p>
                  <p className="text-sm text-warm-500">Current session</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-forest-600">0.12</p>
                <p className="text-xs text-warm-500">Low activity</p>
              </div>
            </div>

            <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
              <div className="h-full w-[12%] bg-forest-500 rounded-full transition-all duration-1000 ease-out" style={{ width: '12%' }} aria-hidden="true" />
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-warm-50 rounded-xl">
                <p className="text-2xl font-bold text-warm-900">42 min</p>
                <p className="text-xs text-warm-500">Active time</p>
              </div>
              <div className="p-3 bg-warm-50 rounded-xl">
                <p className="text-2xl font-bold text-warm-900">3</p>
                <p className="text-xs text-warm-500">Tab switches</p>
              </div>
              <div className="p-3 bg-warm-50 rounded-xl">
                <p className="text-2xl font-bold text-warm-900">Focused</p>
                <p className="text-xs text-warm-500">Current state</p>
              </div>
            </div>
          </div>

          <div className="border-t border-warm-200 pt-6">
            <div className="flex items-start gap-3 p-4 bg-forest-50 rounded-xl border border-forest-100">
              <div className="w-10 h-10 rounded-lg bg-forest-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-forest-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-warm-900">Break suggested</p>
                <p className="text-sm text-warm-600 mt-1">You've been focused for 42 minutes. A short walk might help clear your mind.</p>
                <div className="mt-3 flex gap-2">
                  <button className="px-4 py-2 bg-forest-600 text-white text-sm font-medium rounded-lg hover:bg-forest-700 transition-colors">
                    Start break (5 min)
                  </button>
                  <button className="px-4 py-2 bg-white text-warm-700 text-sm font-medium rounded-lg border border-warm-200 hover:bg-warm-50 transition-colors">
                    Not now
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-warm-200 pt-6">
            <p className="text-sm text-warm-500 text-center">
              Demo mode: evaluates every 15s of activity for testing
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}