import { useState, useEffect } from 'react'

const navLinks = [
  { href: '#product', label: 'Product' },
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#privacy', label: 'Privacy' },
  { href: '#faq', label: 'FAQ' },
]

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
    setIsMobileMenuOpen(false)
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-warm-50/95 backdrop-blur-sm shadow-sm border-b border-warm-200' : 'bg-transparent'
      }`}
      role="banner"
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
        <div className="flex items-center justify-between h-16 lg:h-18">
          <a
            href="/"
            className="flex items-center gap-2 text-warm-900 font-display font-semibold text-xl lg:text-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2 rounded-md"
            aria-label="TouchGrass home"
          >
            <svg
              className="w-8 h-8 lg:w-9 lg:h-9 text-forest-600"
              viewBox="0 0 32 32"
              fill="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="logoGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" style={{ stopColor: '#16a34a', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#84cc16', stopOpacity: 1 }} />
                </linearGradient>
              </defs>
              <rect width="32" height="32" rx="6" fill="url(#logoGradient)" />
              <path d="M16 8 L14 16 L18 16 Z" fill="white" opacity="0.9" />
              <path d="M16 14 L12 22 L20 22 Z" fill="white" opacity="0.7" />
              <path d="M16 18 L10 28 L22 28 Z" fill="white" opacity="0.5" />
            </svg>
            <span>TouchGrass</span>
          </a>

          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault()
                  scrollToSection(link.href)
                }}
                className="text-warm-600 hover:text-forest-700 font-medium text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2 rounded-md px-2 py-1"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#download"
              onClick={(e) => {
                e.preventDefault()
                scrollToSection('#download')
              }}
              className="bg-forest-600 hover:bg-forest-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2 text-sm"
            >
              Get the Extension
            </a>
          </div>

          <div className="lg:hidden flex items-center gap-4">
            <a
              href="#download"
              onClick={(e) => {
                e.preventDefault()
                scrollToSection('#download')
              }}
              className="bg-forest-600 hover:bg-forest-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors duration-200 text-sm"
            >
              Get Extension
            </a>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-warm-600 hover:bg-warm-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div
          id="mobile-menu"
          className={`lg:hidden overflow-hidden transition-all duration-300 ease-out ${
            isMobileMenuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
          }`}
          role="navigation"
          aria-label="Mobile navigation"
        >
          <div className="py-4 space-y-2 border-t border-warm-200">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault()
                  scrollToSection(link.href)
                }}
                className="block px-4 py-3 text-warm-600 hover:text-forest-700 hover:bg-warm-100 font-medium rounded-lg transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#download"
              onClick={(e) => {
                e.preventDefault()
                scrollToSection('#download')
              }}
              className="block mt-2 px-4 py-3 bg-forest-600 hover:bg-forest-700 text-white font-semibold text-center rounded-lg transition-colors duration-200"
            >
              Get the Extension
            </a>
          </div>
        </div>
      </nav>
    </header>
  )
}