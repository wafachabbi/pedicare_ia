import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import AppShell from './components/layout/AppShell'
import PediatreShell from './components/layout/PediatreShell'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import PediatreDashboardPage from './pages/pediatre/PediatreDashboardPage'
import LoadingSpinner from './components/ui/LoadingSpinner'

const PlaceholderPage = ({ title }) => (
  <div className="p-4">
    <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">{title}</h2>
    <p className="text-gray-400 mt-2">Module en cours de développement...</p>
  </div>
)

// Guard : utilisateur authentifié
function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen"><LoadingSpinner size="lg" /></div>
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

// Guard : rôle spécifique
function RoleRoute({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen"><LoadingSpinner size="lg" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to={user.role === 'pediatre' ? '/pediatre/dashboard' : '/dashboard'} replace />
  return children
}

// Guard : redirige vers le bon dashboard selon le rôle
function PublicRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth()
  if (loading) return null
  if (isAuthenticated) {
    return <Navigate to={user?.role === 'pediatre' ? '/pediatre/dashboard' : '/dashboard'} replace />
  }
  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      {/* Espace Parent */}
      <Route element={<PrivateRoute><RoleRoute role="parent"><AppShell /></RoleRoute></PrivateRoute>}>
        <Route path="/dashboard" element={<PlaceholderPage title="Tableau de bord" />} />
        <Route path="/children" element={<PlaceholderPage title="Profils Enfants" />} />
        <Route path="/growth" element={<PlaceholderPage title="Carnet de Croissance" />} />
        <Route path="/vaccination" element={<PlaceholderPage title="Carnet de Vaccination" />} />
        <Route path="/agenda" element={<PlaceholderPage title="Agenda" />} />
        <Route path="/journal" element={<PlaceholderPage title="Journal des Observations" />} />
        <Route path="/timeline" element={<PlaceholderPage title="Frise Chronologique" />} />
        <Route path="/consultation" element={<PlaceholderPage title="Mode Consultation" />} />
        <Route path="/petitguide" element={<PlaceholderPage title="PetitGuide IA" />} />
      </Route>

      {/* Espace Pédiatre */}
      <Route element={<PrivateRoute><RoleRoute role="pediatre"><PediatreShell /></RoleRoute></PrivateRoute>}>
        <Route path="/pediatre/dashboard" element={<PediatreDashboardPage />} />
        <Route path="/pediatre/fiches" element={<PlaceholderPage title="Fiches partagées" />} />
        <Route path="/pediatre/croissance" element={<PlaceholderPage title="Courbes de croissance" />} />
        <Route path="/pediatre/vaccinations" element={<PlaceholderPage title="Suivi vaccinal" />} />
        <Route path="/pediatre/notes" element={<PlaceholderPage title="Mes notes" />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
