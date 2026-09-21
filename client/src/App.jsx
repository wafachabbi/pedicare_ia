import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import AppShell from './components/layout/AppShell'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import LoadingSpinner from './components/ui/LoadingSpinner'

// Pages placeholder — seront remplacées au fur et à mesure
const PlaceholderPage = ({ title }) => (
  <div className="p-4">
    <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">{title}</h2>
    <p className="text-gray-400 mt-2">Module en cours de développement...</p>
  </div>
)

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return null
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      <Route element={<PrivateRoute><AppShell /></PrivateRoute>}>
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
