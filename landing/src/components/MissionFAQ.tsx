import { useState } from 'react'

const faqs = [
  {
    question: 'Which browsers are supported?',
    answer: 'TouchGrass works on any Chromium-based browser (Chrome, Edge, Brave, Vivaldi, Opera) version 88 or later. Firefox is not currently supported due to Manifest V3 differences, but may be added in the future.',
  },
  {
    question: 'Do I need to install Python or run a backend server?',
    answer: 'No. The backend is hosted at https://touchgrass-api-vat6.onrender.com. The extension connects to it automatically. You only install the browser extension.',
  },
  {
    question: 'What permissions does the extension require?',
    answer: 'The extension requests: storage (settings/session), alarms (periodic evaluation), idle (detect away time), tabs (active domain), scripting (content scripts for break pages), activeTab (break overlay), and host permission for https://touchgrass-api-vat6.onrender.com/*. No access to page content, history, cookies, or bookmarks.',
  },
  {
    question: 'Is my data private?',
    answer: 'Only aggregate signals (domain, idle time, tab-switch count, session length) are sent to the hosted API. Problem/error text you explicitly submit via "I\'m Stuck" is also sent. No page content, URLs, keystrokes, or screenshots are collected. Data is stored in a SQLite database on Render tied to an anonymous session ID. No accounts, emails, or identity linking.',
  },
  {
    question: 'What is Demo mode?',
    answer: 'Demo mode makes the extension evaluate every 15 seconds of active (focused, non-idle) time instead of the normal 5-minute interval. This lets you test the break suggestion flow quickly. Enable it in the extension popup. It\'s purely for testing — turn it off for normal use.',
  },
  {
    question: 'Can I self-host the backend?',
    answer: 'Yes. The backend is open source (FastAPI + SQLite). You can deploy it to your own infrastructure and update the extension\'s API_BASE in background.js and the manifest\'s host_permissions. The landing page download uses the hosted Render backend by default.',
  },
  {
    question: 'How does the AI evaluation work?',
    answer: 'Local scoring runs first: high tab-switch frequency, long active sessions, and explicit "stuck" signals increase a candidate score. Only when the score crosses a threshold does the backend call OpenRouter (via the Render API) for a contextual break recommendation. Calm activity never triggers the AI.',
  },
  {
    question: 'What happens after I accept a break?',
    answer: 'A full-screen countdown timer (break.html) takes over. You can return early anytime. When the timer completes, you\'re guided to a reflection page: "Did that help?" Yes/Maybe → resume. No → optional AI hypothesis about your problem. Feedback improves future suggestions.',
  },
  {
    question: 'Can I uninstall or disable monitoring anytime?',
    answer: 'Yes. Toggle "Monitoring" off in the popup to pause evaluation without uninstalling. Uninstall the extension from chrome://extensions to remove it completely. Local data is deleted; server data remains tied to an anonymous session ID but is not linked to you.',
  },
  {
    question: 'Is TouchGrass free?',
    answer: 'Yes, the extension and hosted API are free to use. The backend uses OpenRouter for AI calls, which incurs costs covered by the project maintainers. There are no premium tiers, subscriptions, or usage limits currently.',
  },
]

export function MissionFAQ() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  return (
    <section
      id="faq"
      className="py-20 lg:py-28 bg-warm-50"
      aria-labelledby="faq-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 mb-16">
          <div>
            <h2
              id="faq-heading"
              className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-warm-900 mb-6"
            >
              Mission & FAQ
            </h2>
            <div className="space-y-6 text-warm-600 leading-relaxed">
              <p>
                <strong className="text-warm-900">TouchGrass exists because sustainable development beats heroic development.</strong>
              </p>
              <p>
                The industry glorifies all-nighters, caffeine-fueled debugging marathons, and "pushing through."
                But the best code often comes after a walk, a night's sleep, or a conversation with a rubber duck.
              </p>
              <p>
                We're not anti-work. We're pro-effectiveness. A well-timed break isn't slacking — it's
                maintenance for the only irreplaceable component in your stack: you.
              </p>
              <p>
                TouchGrass is a small tool for a big idea: <span className="text-forest-700 font-medium">build sustainably, not just quickly.</span>
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-warm-200 p-6 lg:p-8">
            <h3 className="font-display text-xl font-semibold text-warm-900 mb-6">Frequently asked questions</h3>
            <div className="space-y-2">
              {faqs.map((faq, index) => (
                <details
                  key={index}
                  className="group border border-warm-200 rounded-xl overflow-hidden bg-warm-50/50"
                  open={expandedIndex === index}
                >
                  <summary
                    onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                    className="flex items-center justify-between p-5 cursor-pointer list-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2"
                    aria-expanded={expandedIndex === index}
                  >
                    <span className="text-warm-900 font-medium pr-4">{faq.question}</span>
                    <svg
                      className={`w-5 h-5 text-warm-400 transition-transform duration-300 flex-shrink-0 ${expandedIndex === index ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="px-5 pb-5 text-warm-600 animate-slide-down">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}