import { useEffect, useState } from 'react'

const problems = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Endless debugging loops',
    description: 'You\'ve been at the same error for 45 minutes. The fix is one line, but you\'re too deep to see it. Time perception warps, and productivity evaporates.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
    title: 'Tab-switching spiral',
    description: 'Stack Overflow, GitHub issues, documentation, back to Stack Overflow. Each context switch costs focus. You feel busy but accomplish little.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    title: 'Context overload',
    description: 'Multiple repos, PR reviews, Slack threads, and that one flaky test. Mental RAM maxes out. Decision quality degrades without a reset.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: 'Forgetting to pause',
    description: 'No timer reminds you. No colleague taps your shoulder. Hours vanish. The best insights often arrive after stepping away — but you never step away.',
  },
]

export function Problem() {
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
      id="problem"
      className="py-20 lg:py-28 bg-white"
      aria-labelledby="problem-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2
            id="problem-heading"
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-warm-900 mb-4"
          >
            The problem isn't the code.{' '}
            <span className="text-forest-600">It's the loop.</span>
          </h2>
          <p className="text-lg text-warm-600">
            Developers don't burn out from hard problems. They burn out from getting stuck on the wrong ones
            without realizing it.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {problems.map((problem, index) => (
            <article
              key={index}
              data-index={index}
              className={`group relative p-6 lg:p-8 bg-warm-50 rounded-2xl border border-warm-200 transition-all duration-500 ${
                visibleItems.has(index)
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-forest-100/0 to-forest-100/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-forest-100 flex items-center justify-center text-forest-600 mb-5 group-hover:scale-110 transition-transform duration-300">
                  {problem.icon}
                </div>
                <h3 className="font-display text-xl font-semibold text-warm-900 mb-3">{problem.title}</h3>
                <p className="text-warm-600 leading-relaxed">{problem.description}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-warm-500 max-w-2xl mx-auto">
            <span className="font-medium text-warm-700">TouchGrass doesn't block sites or shame you.</span> It notices the patterns you can't see
            and offers a way out — on your terms.
          </p>
        </div>
      </div>
    </section>
  )
}