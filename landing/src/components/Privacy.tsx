import { useEffect, useState } from 'react'

const privacyItems = [
  {
    title: 'What we collect',
    items: [
      'Active domain (hostname only, e.g., "github.com")',
      'Idle time in milliseconds (from Chrome idle API)',
      'Tab-switch count in the last 5 minutes',
      'Session duration (minutes since install/start)',
      'Explicit "I\'m stuck" submissions (problem text + error text you provide)',
      'Reflection choices (Yes/Maybe/No) and optional feedback',
    ],
    notCollected: [
      'Page URLs, paths, query parameters, or titles',
      'Page content, DOM, or screenshots',
      'Keystrokes, clicks, or mouse movements',
      'Cookies, localStorage, or authentication tokens',
      'Full browsing history or bookmarks',
      'IP address (beyond what Render logs for API requests)',
    ],
  },
  {
    title: 'How data flows',
    items: [
      'Signals aggregate locally in the extension service worker',
      'Every ~1 minute (15s in demo), a summary POSTs to https://touchgrass-api-vat6.onrender.com/api/v1/activity',
      'AI evaluation only triggers when local scoring crosses a threshold (candidate=true)',
      'AI calls go from Render backend to OpenRouter — your signals never leave Render directly',
      'Snapshots (problem context + break metadata) store in Render\'s SQLite database',
      'Hypotheses and feedback also store in the Render database',
    ],
  },
  {
    title: 'What we store (on Render)',
    items: [
      'Session records: start time, current state, break index, snapshot ID',
      'Snapshots: category, problem text, error text, break duration, activity type',
      'Hypotheses: category, generated text, source (AI/cache/fallback)',
      'Feedback: hypothesis ID, outcome (fixed/partial/none), timestamp',
      'No analytics, tracking pixels, or third-party scripts on the backend',
    ],
  },
  {
    title: 'Your control',
    items: [
      'Monitoring is opt-in (off by default). Toggle in popup anytime.',
      'Dismiss any break offer — 30-minute cooldown prevents re-suggestion.',
      'Delete the extension → local data gone. Server data tied to anonymous session ID.',
      'No account creation, no email, no identity linking.',
      'Demo mode evaluates every 15s for testing without waiting.',
    ],
  },
]

export function Privacy() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0)
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set())

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt((entry.target as HTMLElement).dataset.index || '0', 10)
            setVisibleItems((prev) => new Set(prev).add(index))
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )

    document.querySelectorAll('[data-index]').forEach((el) => observer.observe(el as Element))
    return () => observer.disconnect()
  }, [])

  return (
    <section
      id="privacy"
      className="py-20 lg:py-28 bg-warm-50"
      aria-labelledby="privacy-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2
            id="privacy-heading"
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-warm-900 mb-4"
          >
            Privacy & trust
          </h2>
          <p className="text-lg text-warm-600">
            We're developers too. Here's exactly what happens with your data — no legalese.
          </p>
        </div>

        <div className="space-y-6">
          {privacyItems.map((section, index) => (
            <article
              key={index}
              data-index={index}
              className={`bg-white rounded-2xl border border-warm-200 overflow-hidden transition-all duration-500 ${
                visibleItems.has(index) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <button
                type="button"
                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2"
                aria-expanded={expandedIndex === index}
                aria-controls={`privacy-content-${index}`}
              >
                <h3 className="font-display text-lg font-semibold text-warm-900 flex items-center gap-3">
                  <span className="w-8 h-8 flex items-center justify-center bg-forest-100 text-forest-600 rounded-lg text-sm font-mono">{index + 1}</span>
                  {section.title}
                </h3>
                <svg
                  className={`w-5 h-5 text-warm-400 transition-transform duration-300 flex-shrink-0 ${expandedIndex === index ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div
                id={`privacy-content-${index}`}
                role="region"
                aria-labelledby={`privacy-heading-${index}`}
                className={`overflow-hidden transition-all duration-300 ease-out ${
                  expandedIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-6 pb-6 pt-2 space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-warm-900 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-forest-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Collected
                    </h4>
                    <ul className="space-y-2 text-warm-600 text-sm">
                      {section.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-forest-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {section.notCollected && (
                    <div className="border-t border-warm-200 pt-4">
                      <h4 className="text-sm font-semibold text-warm-900 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-warm-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Never collected
                      </h4>
                      <ul className="space-y-2 text-warm-500 text-sm">
                        {section.notCollected.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-warm-300 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 p-6 bg-white rounded-2xl border border-warm-200">
          <h3 className="font-display text-lg font-semibold text-warm-900 mb-3">Open source</h3>
          <p className="text-warm-600 mb-4">
            The extension and backend are open source. You can audit the code, self-host the API, or contribute improvements.
          </p>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-forest-600 hover:text-forest-700 font-medium text-sm"
          >
            View on GitHub
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  )
}