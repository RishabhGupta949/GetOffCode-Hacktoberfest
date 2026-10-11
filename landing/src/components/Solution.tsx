import { useEffect, useState } from 'react'

const solutions = [
  {
    step: '01',
    title: 'Activity-aware AI evaluation',
    description:
      'Lightweight signals — active time, tab-switch frequency, idle state, domain — are scored locally. Only when patterns suggest stuck-ness does the backend AI evaluate, preserving privacy and reducing API calls.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    step: '02',
    title: 'Contextual break recommendations',
    description:
      'The AI suggests a specific break type — walk, stretch, breathing, eyes-off-screen — with a duration matched to session length and stuck signals. Not a generic timer; a contextual nudge.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    step: '03',
    title: 'Adjustable, user-controlled flow',
    description:
      'Accept the suggestion, dismiss it, or manually trigger "I\'m Stuck" with a problem description. Demo mode evaluates every 15s for testing. Cooldowns prevent suggestion spam. You stay in control.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    step: '04',
    title: 'Return reflection',
    description:
      'After the break, a lightweight reflection: "Did that help? Yes / Maybe / No." Choosing "No" unlocks an optional AI hypothesis about your problem. Feedback closes the loop and improves future suggestions.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
]

export function Solution() {
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
      id="solution"
      className="py-20 lg:py-28 bg-warm-50"
      aria-labelledby="solution-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2
            id="solution-heading"
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-warm-900 mb-4"
          >
            A companion that{' '}
            <span className="text-forest-600">notices what you miss</span>
          </h2>
          <p className="text-lg text-warm-600">
            Four steps from stuck to fresh perspective — all without leaving your browser.
          </p>
        </div>

        <div className="space-y-8 lg:space-y-10">
          {solutions.map((solution, index) => (
            <article
              key={index}
              data-index={index}
              className={`flex flex-col lg:flex-row gap-8 items-start ${
                index % 2 === 1 ? 'lg:flex-row-reverse' : ''
              } transition-all duration-700 ${
                visibleItems.has(index)
                  ? 'opacity-100 translate-x-0'
                  : index % 2 === 0
                  ? 'opacity-0 -translate-x-8'
                  : 'opacity-0 translate-x-8'
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <div className="flex-shrink-0 w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-forest-100 flex items-center justify-center text-forest-600">
                {solution.icon}
              </div>
              <div className="flex-1 text-center lg:text-left">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-mono text-forest-600 bg-forest-100 px-3 py-1 rounded-full">{solution.step}</span>
                  <h3 className="font-display text-xl lg:text-2xl font-semibold text-warm-900">{solution.title}</h3>
                </div>
                <p className="text-warm-600 leading-relaxed">{solution.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}