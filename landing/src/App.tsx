import { Navigation } from './components/Navigation'
import { Hero } from './components/Hero'
import { Problem } from './components/Problem'
import { Solution } from './components/Solution'
import { HowItWorks } from './components/HowItWorks'
import { ProductPreview } from './components/ProductPreview'
import { Features } from './components/Features'
import { Privacy } from './components/Privacy'
import { Download } from './components/Download'
import { MissionFAQ } from './components/MissionFAQ'
import { Footer } from './components/Footer'

function App() {
  return (
    <div className="min-h-screen bg-warm-50">
      <Navigation />
      <main id="main-content">
        <Hero />
        <Problem />
        <Solution />
        <HowItWorks />
        <ProductPreview />
        <Features />
        <Privacy />
        <Download />
        <MissionFAQ />
      </main>
      <Footer />
    </div>
  )
}

export default App