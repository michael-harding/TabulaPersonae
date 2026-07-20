import { lazy } from 'solid-js'
import { Router, Route } from '@solidjs/router'

import { AuthProvider } from './lib/auth-context'
import { TabConfigProvider } from './lib/tab-config-context'
import './lib/theme' // activate module-level createEffect for dark mode

import { Toaster } from './components/ui/toaster'
import Layout from './components/layout'

const Home = lazy(() => import('./routes/Home'))
const Auth = lazy(() => import('./routes/Auth'))
const CharacterSheet = lazy(() => import('./routes/CharacterSheet'))
const TabSettings = lazy(() => import('./routes/TabSettings'))
const NotFound = lazy(() => import('./routes/NotFound'))
const Teapot = lazy(() => import('./routes/Teapot'))
const PublicCharacterSheet = lazy(() => import('./routes/PublicCharacterSheet'))
const TermsOfUse = lazy(() => import('./routes/TermsOfUse'))
const PrivacyPolicy = lazy(() => import('./routes/PrivacyPolicy'))

export default function App() {
  return (
    <AuthProvider>
      <TabConfigProvider>
        <Router root={Layout}>
          <Route path="/" component={Home} />
          <Route path="/auth" component={Auth} />
          <Route path="/character/:id" component={CharacterSheet} />
          <Route path="/settings/tabs" component={TabSettings} />
          <Route path="/share/:id" component={PublicCharacterSheet} />
          <Route path="/418" component={Teapot} />
          <Route path="/terms" component={TermsOfUse} />
          <Route path="/privacy" component={PrivacyPolicy} />
          <Route path="*" component={NotFound} />
        </Router>
        <Toaster />
      </TabConfigProvider>
    </AuthProvider>
  )
}
