import { Router, Route } from '@solidjs/router'
import { AuthProvider } from './lib/auth-context'
import { Toaster } from './components/ui/toaster'
import './lib/theme' // activate module-level createEffect for dark mode
import Layout from './components/layout'
import Home from './routes/Home'
import Auth from './routes/Auth'
import CharacterSheet from './routes/CharacterSheet'
import NotFound from './routes/NotFound'
import Teapot from './routes/Teapot'
import TermsOfUse from './routes/TermsOfUse'
import PrivacyPolicy from './routes/PrivacyPolicy'

export default function App() {
  return (
    <AuthProvider>
      <Router root={Layout}>
        <Route path="/" component={Home} />
        <Route path="/auth" component={Auth} />
        <Route path="/character/:id" component={CharacterSheet} />
        <Route path="/418" component={Teapot} />
        <Route path="/terms" component={TermsOfUse} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="*" component={NotFound} />
      </Router>
      <Toaster />
    </AuthProvider>
  )
}
