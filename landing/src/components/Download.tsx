import { useState } from 'react'

const installSteps = [
  {
    number: 1,
    title: 'Download the ZIP',
    description: 'Click the button below to download the extension package. Save it to a folder you can find easily (e.g., Downloads).',
    code: null,
  },
  {
    number: 2,
    title: 'Extract the archive',
    description: 'Right-click the downloaded ZIP and choose "Extract All" (Windows) or double-click (macOS). This creates a folder named "touchgrass-extension" containing manifest.json and all source files.',
    code: null,
  },
  {
    number: 3,
    title: 'Open Chrome Extensions',
    description: 'In Chrome (or Edge, Brave, Vivaldi), navigate to <code>chrome://extensions</code>. You can also reach it via Menu → Extensions → Manage Extensions.',
    code: 'chrome://extensions',
  },
  {
    number: 4,
    title: 'Enable Developer mode',
    description: 'Toggle the "Developer mode" switch in the top-right corner of the extensions page. This unlocks the "Load unpacked" button.',
    code: null,
  },
  {
    number: 5,
    title: 'Load the extension',
    description: 'Click "Load unpacked" and select the extracted "touchgrass-extension" folder (the one containing manifest.json). The extension installs immediately.',
    code: null,
  },
  {
    number: 6,
    title: 'Pin & configure',
    description: 'Pin the TouchGrass icon to your toolbar. Click it, grant permissions when prompted, and toggle "Monitoring" on. Optional: enable "Demo mode" for 15-second evaluation cycles.',
    code: null,
  },
]

export function Download() {
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'success' | 'error'>('idle')

  const handleDownload = async () => {
    setDownloadStatus('downloading')
    try {
      const response = await fetch('/downloads/touchgrass-extension.zip')
      if (!response.ok) throw new Error('Download failed')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'touchgrass-extension.zip'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      setDownloadStatus('success')
      setTimeout(() => setDownloadStatus('idle'), 3000)
    } catch (error) {
      console.error('Download failed:', error)
      setDownloadStatus('error')
      setTimeout(() => setDownloadStatus('idle'), 3000)
    }
  }

  return (
    <section
      id="download"
      className="py-20 lg:py-28 bg-white"
      aria-labelledby="download-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2
            id="download-heading"
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-warm-900 mb-4"
          >
            Get the extension
          </h2>
          <p className="text-lg text-warm-600">
            Install in under a minute. No Chrome Web Store, no account, no auto-updates.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <div className="space-y-8">
            <div className="bg-forest-50 border border-forest-100 rounded-2xl p-8">
              <h3 className="font-display text-xl font-semibold text-warm-900 mb-4">Ready to install</h3>
              <p className="text-warm-600 mb-6">
                Version 0.1.0 · Manifest V3 · ~50 KB · Requires Chromium 88+
              </p>
              <button
                onClick={handleDownload}
                disabled={downloadStatus === 'downloading'}
                className={`w-full sm:w-auto px-8 py-4 bg-forest-600 text-white font-semibold rounded-lg text-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2 shadow-lg shadow-forest-500/25 ${
                  downloadStatus === 'downloading' ? 'opacity-75 cursor-wait' : 'hover:bg-forest-700'
                }`}
                aria-busy={downloadStatus === 'downloading'}
              >
                {downloadStatus === 'downloading' ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Downloading…
                  </span>
                ) : downloadStatus === 'success' ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Downloaded!
                  </span>
                ) : downloadStatus === 'error' ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Failed — try again
                  </span>
                ) : (
                  'Download Extension (ZIP)'
                )}
              </button>
              <p className="mt-4 text-sm text-warm-500 text-center">
                Contains: manifest.json, background.js, popup.html, popup.js, break.html, break.js,
                break-offer.html, break-offer.js, reflection.html, reflection.js, activity-monitor.js,
                icons, and all required assets.
              </p>
            </div>

            <div className="bg-warm-50 border border-warm-200 rounded-2xl p-6">
              <h4 className="font-semibold text-warm-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-forest-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Verified permissions
              </h4>
              <ul className="space-y-2 text-sm text-warm-600">
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-forest-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg> storage, alarms, idle, tabs, scripting, activeTab</li>
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-forest-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg> Host permission: <code className="bg-warm-100 px-1.5 py-0.5 rounded text-forest-700 font-mono text-xs">https://touchgrass-api-vat6.onrender.com/*</code></li>
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-forest-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg> No <code className="bg-warm-100 px-1.5 py-0.5 rounded text-forest-700 font-mono text-xs">http://127.0.0.1:8765/*</code> in production build (dev only)</li>
              </ul>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="bg-warm-900 rounded-2xl p-6 font-mono text-sm text-warm-100 overflow-x-auto">
              <div className="flex items-center gap-2 mb-4 text-warm-500">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-2">chrome://extensions</span>
              </div>
              <pre className="leading-relaxed"><code>{`# 1. Download & extract
$ unzip touchgrass-extension.zip -d touchgrass-extension

# 2. Open chrome://extensions in your browser
# 3. Enable "Developer mode" (top right)
# 4. Click "Load unpacked"
# 5. Select the "touchgrass-extension" folder

# 6. Pin the extension, grant permissions, enable monitoring
# 7. Optional: enable "Demo mode" for 15s evaluation cycles`}</code></pre>
            </div>
          </div>
        </div>

        <div className="mt-16">
          <h3 className="font-display text-2xl font-semibold text-warm-900 text-center mb-10">Installation steps</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {installSteps.map((step, index) => (
              <article key={index} className="relative p-6 bg-warm-50 rounded-2xl border border-warm-200">
                <div className="absolute -top-3 left-6 w-8 h-8 rounded-full bg-forest-600 text-white flex items-center justify-center font-bold text-lg">
                  {step.number}
                </div>
                <div className="pt-4">
                  <h4 className="font-semibold text-warm-900 mb-2">{step.title}</h4>
                  <p className="text-warm-600 text-sm mb-3">{step.description}</p>
                  {step.code && (
                    <code className="block bg-warm-100 text-forest-700 px-3 py-2 rounded-lg text-sm font-mono break-all">
                      {step.code}
                    </code>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-warm-500 max-w-2xl mx-auto">
            <strong className="text-warm-700">Note:</strong> This extension is not on the Chrome Web Store.
            You must use "Load unpacked" in Developer mode. Updates require re-downloading the ZIP
            and re-loading the extension. We may publish to the store in the future.
          </p>
        </div>
      </div>
    </section>
  )
}