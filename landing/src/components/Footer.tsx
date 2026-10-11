type FooterLink = { label: string; href: string; external?: boolean };

export function Footer() {
  const currentYear = new Date().getFullYear()

  const footerLinks: Record<string, FooterLink[]> = {
    Product: [
      { label: 'Features', href: '#features' },
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'Product Preview', href: '#product-preview' },
      { label: 'Download', href: '#download' },
    ],
    Company: [
      { label: 'Mission', href: '#faq' },
      { label: 'Privacy', href: '#privacy' },
      { label: 'FAQ', href: '#faq' },
    ],
    Resources: [
      { label: 'GitHub Repository', href: 'https://github.com', external: true },
      { label: 'Documentation', href: 'https://github.com', external: true },
      { label: 'Report an Issue', href: 'https://github.com/issues', external: true },
    ],
    Legal: [
      { label: 'Privacy Policy', href: '#privacy' },
      { label: 'Terms of Use', href: '#' },
      { label: 'Open Source License', href: 'https://github.com', external: true },
    ],
  }

  const socialLinks = [
    { label: 'GitHub', href: 'https://github.com', icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
      </svg>
    )},
    { label: 'Twitter', href: 'https://x.com', icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
      </svg>
    )},
  ]

  return (
    <footer className="bg-warm-900 text-warm-300" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12 mb-12">
          <div className="lg:col-span-2">
            <a
              href="/"
              className="flex items-center gap-2 text-warm-100 font-display font-semibold text-xl lg:text-2xl mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2 focus-visible:ring-offset-warm-900 rounded-md"
              aria-label="TouchGrass home"
            >
              <svg
                className="w-8 h-8 lg:w-9 lg:h-9 text-forest-400"
                viewBox="0 0 32 32"
                fill="none"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="footerLogoGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" style={{ stopColor: '#16a34a', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#84cc16', stopOpacity: 1 }} />
                  </linearGradient>
                </defs>
                <rect width="32" height="32" rx="6" fill="url(#footerLogoGradient)" />
                <path d="M16 8 L14 16 L18 16 Z" fill="white" opacity="0.9" />
                <path d="M16 14 L12 22 L20 22 Z" fill="white" opacity="0.7" />
                <path d="M16 18 L10 28 L22 28 Z" fill="white" opacity="0.5" />
              </svg>
              <span>TouchGrass</span>
            </a>
            <p className="text-warm-400 text-sm max-w-xs mb-6 leading-relaxed">
              AI cognitive-reset companion for developers. Detects stuck states, enforces real breaks.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-warm-400 hover:text-forest-300 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2 focus-visible:ring-offset-warm-900 rounded-lg p-1"
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <nav key={category} aria-label={category}>
              <h4 className="font-semibold text-warm-100 mb-4">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target={link.external ? '_blank' : undefined}
                      rel={link.external ? 'noopener noreferrer' : undefined}
                      className="text-warm-400 hover:text-forest-300 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2 focus-visible:ring-offset-warm-900 rounded px-1 py-0.5"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="border-t border-warm-800 pt-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            <p className="text-warm-500 text-sm">
              © {currentYear} TouchGrass. Open source under MIT license.
            </p>
            <p className="text-warm-500 text-sm">
              Built with care for developers who forget to pause.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}