import { useEffect, useState } from 'react'

const previews = [
  {
    title: 'Activity insights',
    description: 'Real-time activity score, active time, tab-switch count, and session state in the extension popup. Low scores mean calm focus; rising scores signal potential stuck-ness.',
    image: (
      <div className="bg-white rounded-xl border border-warm-200 overflow-hidden shadow-lg">
        <div className="flex items-center gap-2 px-4 py-3 bg-warm-50 border-b border-warm-200">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 text-center text-sm text-warm-500 font-mono">touchgrass-popup</div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-forest-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-forest-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </div>
              <div>
                <p className="font-semibold text-warm-900">Activity Score</p>
                <p className="text-sm text-warm-500">Current session</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-forest-600">0.23</p>
              <p className="text-xs text-warm-500">Moderate activity</p>
            </div>
          </div>
          <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
            <div className="h-full w-[23%] bg-forest-500 rounded-full" />
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-warm-50 rounded-xl"><p className="text-2xl font-bold text-warm-900">38 min</p><p className="text-xs text-warm-500">Active time</p></div>
            <div className="p-3 bg-warm-50 rounded-xl"><p className="text-2xl font-bold text-warm-900">7</p><p className="text-xs text-warm-500">Tab switches</p></div>
            <div className="p-3 bg-warm-50 rounded-xl"><p className="text-2xl font-bold text-warm-900">WORKING</p><p className="text-xs text-warm-500">State</p></div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Break suggestion',
    description: 'Persistent break-offer page (not a popup) with AI reasoning, break type, duration, and accept/dismiss actions. Survives tab closure; stores state in chrome.storage.',
    image: (
      <div className="bg-white rounded-xl border border-warm-200 overflow-hidden shadow-lg">
        <div className="flex items-center gap-2 px-4 py-3 bg-warm-50 border-b border-warm-200">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 text-center text-sm text-warm-500 font-mono">break-offer.html</div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-forest-100 text-forest-700 text-xs rounded-full">AI suggestion</span>
            <span className="px-2 py-1 bg-grass-100 text-grass-700 text-xs rounded-full">fallback</span>
          </div>
          <h4 className="text-xl font-semibold text-warm-900">Walk outside</h4>
          <p className="text-warm-600">You've been focused for 42 minutes with elevated tab switching (7 in 5 min). A short walk might help clear your mind.</p>
          <div className="p-4 bg-warm-50 rounded-xl">
            <p className="text-sm font-medium text-warm-900 mb-2">Why this break?</p>
            <p className="text-sm text-warm-600">Extended focus without context switches correlates with diminishing returns. Physical movement resets attention.</p>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 px-4 py-3 bg-forest-600 text-white font-semibold rounded-lg">Start break (5 min)</button>
            <button className="flex-1 px-4 py-3 bg-white text-warm-700 font-semibold rounded-lg border border-warm-200">Not now</button>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Countdown screen',
    description: 'Full-screen break timer (break.html) with circular progress, large remaining time, break type label, and early-return option. No distractions — just the countdown.',
    image: (
      <div className="bg-forest-900 rounded-xl border border-forest-800 overflow-hidden shadow-lg">
        <div className="p-8 text-center text-white">
          <div className="text-forest-300 text-sm mb-2">Time remaining</div>
          <div className="text-7xl font-mono font-bold mb-6" style={{ fontFamily: '"SF Mono", "Monaco", monospace' }}>04:12</div>
          <div className="w-56 h-56 mx-auto rounded-full border-4 border-forest-600 relative">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#166534" strokeWidth="8" />
              <circle cx="50" cy="50" r="45" fill="none" stroke="#22c55e" strokeWidth="8" strokeDasharray="282.6" strokeDashoffset="110" strokeLinecap="round" className="transition-all duration-1000" />
            </svg>
          </div>
          <p className="mt-6 text-forest-300 text-lg">Walk outside for a few minutes. Leave the desk behind.</p>
          <button className="mt-8 px-6 py-3 bg-white text-forest-900 font-semibold rounded-lg hover:bg-warm-100 transition-colors">I'm back early</button>
        </div>
      </div>
    ),
  },
  {
    title: 'Return reflection',
    description: 'Post-break reflection page (reflection.html) with three choices. "No" unlocks an optional AI hypothesis about your stuck problem. Feedback closes the learning loop.',
    image: (
      <div className="bg-white rounded-xl border border-warm-200 overflow-hidden shadow-lg">
        <div className="flex items-center gap-2 px-4 py-3 bg-warm-50 border-b border-warm-200">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 text-center text-sm text-warm-500 font-mono">reflection.html</div>
        </div>
        <div className="p-6 space-y-4">
          <h4 className="text-xl font-semibold text-warm-900 text-center">How was your break?</h4>
          <p className="text-warm-600 text-center">Did stepping away help you see the problem differently?</p>
          <div className="grid grid-cols-3 gap-3">
            <button className="py-3 px-4 bg-forest-100 text-forest-700 font-semibold rounded-xl hover:bg-forest-200 transition-colors">Yes</button>
            <button className="py-3 px-4 bg-grass-100 text-grass-700 font-semibold rounded-xl hover:bg-grass-200 transition-colors">Maybe</button>
            <button className="py-3 px-4 bg-warm-100 text-warm-700 font-semibold rounded-xl hover:bg-warm-200 transition-colors">No</button>
          </div>
          <div className="p-4 bg-forest-50 border border-forest-100 rounded-xl">
            <p className="text-sm font-medium text-forest-900 mb-2">AI hypothesis (unlocked by "No")</p>
            <p className="text-sm text-forest-800">The error "Cannot read property 'map' of undefined" suggests the API response structure changed. Check if the data key exists before mapping.</p>
          </div>
        </div>
      </div>
    ),
  },
]

export function ProductPreview() {
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
      id="product-preview"
      className="py-20 lg:py-28 bg-warm-50"
      aria-labelledby="preview-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2
            id="preview-heading"
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-warm-900 mb-4"
          >
            Product preview
          </h2>
          <p className="text-lg text-warm-600">
            Real extension UI mockups — not marketing illustrations. These represent the actual
            popup, break offer, countdown, and reflection pages.
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {previews.map((preview, index) => (
            <article
              key={index}
              data-index={index}
              className={`flex flex-col transition-all duration-700 ${
                visibleItems.has(index)
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <div className="flex-1 mb-4">{preview.image}</div>
              <div className="p-4 bg-white rounded-xl border border-warm-200 shadow-sm">
                <h3 className="font-display text-lg font-semibold text-warm-900 mb-2">{preview.title}</h3>
                <p className="text-sm text-warm-600 leading-relaxed">{preview.description}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-warm-500 text-sm">
            <span className="font-medium text-warm-700">Note:</span> These are static mockups demonstrating the extension's UI.
            Actual functionality requires installing the extension and connecting to the hosted API.
          </p>
        </div>
      </div>
    </section>
  )
}