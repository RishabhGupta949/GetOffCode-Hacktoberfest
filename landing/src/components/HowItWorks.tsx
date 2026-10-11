import { useEffect, useState } from 'react'

const steps = [
  {
    number: '1',
    title: 'Enable monitoring',
    description:
      'Install the extension, grant permissions, and toggle monitoring on. Demo mode evaluates every 15 seconds for quick testing.',
    visual: (
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-forest-100 to-grass-100 rounded-2xl opacity-30" aria-hidden="true" />
        <div className="relative bg-white rounded-xl border border-warm-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-warm-500">Extension Popup</span>
            <span className="text-xs text-warm-400">v0.1.0</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-warm-50 rounded-lg">
              <span className="text-sm text-warm-700">Monitoring</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-forest-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-forest-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-3 bg-warm-50 rounded-lg">
              <span className="text-sm text-warm-700">Demo mode</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-warm-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-warm-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    number: '2',
    title: 'Signals evaluated',
    description:
      'Every minute (or 15s in demo), active domain, idle time, tab-switch frequency, and session length are sent to the hosted API. Local scoring gates AI calls — calm activity never triggers the model.',
    visual: (
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-forest-100 to-grass-100 rounded-2xl opacity-30" aria-hidden="true" />
        <div className="relative bg-white rounded-xl border border-warm-200 p-4 font-mono text-sm">
          <div className="text-warm-400 mb-3">POST /api/v1/activity</div>
          <pre className="bg-warm-900 text-warm-100 p-3 rounded-lg overflow-x-auto text-xs leading-relaxed">
{`{
  "session_id": "sess_abc123",
  "active_domain": "github.com",
  "idle_ms": 0,
  "tab_switches_5m": 2,
  "explicit_stuck": false
}`}
          </pre>
          <div className="mt-3 text-forest-600 text-xs">→ score: 0.12, candidate: false</div>
        </div>
      </div>
    ),
  },
  {
    number: '3',
    title: 'Break suggested',
    description:
      'When AI detects stuck patterns, a break offer appears in a persistent page — not a popup you can lose. Shows the AI\'s reasoning, break type, and duration. Accept or dismiss.',
    visual: (
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-forest-100 to-grass-100 rounded-2xl opacity-30" aria-hidden="true" />
        <div className="relative bg-white rounded-xl border border-warm-200 p-4 max-w-md">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-1 bg-forest-100 text-forest-700 text-xs rounded-full">AI suggestion</span>
            <span className="px-2 py-1 bg-grass-100 text-grass-700 text-xs rounded-full">fallback</span>
          </div>
          <h4 className="font-semibold text-warm-900 mb-2">Walk outside</h4>
          <p className="text-sm text-warm-600 mb-4">You've been focused for 42 min with elevated tab switching. A short walk might help clear your mind.</p>
          <div className="flex gap-2">
            <button className="flex-1 px-4 py-2 bg-forest-600 text-white text-sm font-medium rounded-lg">Start break (5 min)</button>
            <button className="flex-1 px-4 py-2 bg-white text-warm-700 text-sm font-medium rounded-lg border border-warm-200">Not now</button>
          </div>
        </div>
      </div>
    ),
  },
  {
    number: '4',
    title: 'Take the break',
    description:
      'A full-screen countdown timer takes over — no tabs, no notifications. Early return is always an option. When time elapses, you\'re guided to reflection.',
    visual: (
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-forest-900 to-forest-700 rounded-2xl" aria-hidden="true" />
        <div className="relative bg-forest-900 rounded-xl border border-forest-800 p-8 text-center text-white">
          <div className="text-forest-300 text-sm mb-2">Time remaining</div>
          <div className="text-6xl font-mono font-bold mb-6">03:24</div>
          <div className="w-48 h-48 mx-auto rounded-full border-4 border-forest-600 flex items-center justify-center">
            <div className="w-40 h-40 rounded-full border-4 border-forest-500 border-t-transparent animate-spin" aria-hidden="true" />
          </div>
          <p className="mt-6 text-forest-300 text-sm">Walk outside for a few minutes. Leave the desk behind.</p>
        </div>
      </div>
    ),
  },
  {
    number: '5',
    title: 'Return & reflect',
    description:
      'Post-break reflection: "Did that help?" Yes/Maybe → resume with your idea. No → optional AI hypothesis about your problem. Feedback improves future suggestions.',
    visual: (
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-forest-100 to-grass-100 rounded-2xl opacity-30" aria-hidden="true" />
        <div className="relative bg-white rounded-xl border border-warm-200 p-4 max-w-md">
          <h4 className="font-semibold text-warm-900 mb-2">How was your break?</h4>
          <p className="text-sm text-warm-600 mb-4">Did stepping away help you see the problem differently?</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <button className="px-3 py-2 bg-forest-100 text-forest-700 text-sm font-medium rounded-lg hover:bg-forest-200">Yes</button>
            <button className="px-3 py-2 bg-grass-100 text-grass-700 text-sm font-medium rounded-lg hover:bg-grass-200">Maybe</button>
            <button className="px-3 py-2 bg-warm-100 text-warm-700 text-sm font-medium rounded-lg hover:bg-warm-200">No</button>
          </div>
          <p className="text-xs text-warm-500">Choosing "No" unlocks an optional AI hypothesis.</p>
        </div>
      </div>
    ),
  },
]

export function HowItWorks() {
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
      id="how-it-works"
      className="py-20 lg:py-28 bg-white"
      aria-labelledby="how-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2
            id="how-heading"
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-warm-900 mb-4"
          >
            How it works in{' '}
            <span className="text-forest-600">five steps</span>
          </h2>
          <p className="text-lg text-warm-600">
            From installation to reflection — the complete TouchGrass flow.
          </p>
        </div>

        <div className="space-y-12 lg:space-y-16">
          {steps.map((step, index) => (
            <article
              key={index}
              data-index={index}
              className={`flex flex-col lg:flex-row gap-8 lg:gap-12 items-center ${
                index % 2 === 1 ? 'lg:flex-row-reverse' : ''
              } transition-all duration-700 ${
                visibleItems.has(index)
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <div className="flex-shrink-0 w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-forest-100 flex items-center justify-center text-forest-600 text-3xl lg:text-4xl font-bold font-mono">
                {step.number}
              </div>
              <div className="flex-1 text-center lg:text-left">
                <h3 className="font-display text-xl lg:text-2xl font-semibold text-warm-900 mb-3">{step.title}</h3>
                <p className="text-warm-600 leading-relaxed mb-6">{step.description}</p>
              </div>
              <div className="flex-1 w-full lg:w-1/2">{step.visual}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}