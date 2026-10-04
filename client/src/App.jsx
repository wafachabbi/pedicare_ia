import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ChildProvider } from './contexts/ChildContext'
import { useAuth } from './hooks/useAuth'
import AppShell from './components/layout/AppShell'
import PediatreShell from './components/layout/PediatreShell'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ChildFormPage from './pages/children/ChildFormPage'
import VaccinationsPage from './pages/children/VaccinationsPage'
import AppointmentsPage from './pages/children/AppointmentsPage'
import VaccinationRedirect from './pages/children/VaccinationRedirect'
import AppointmentRedirect from './pages/children/AppointmentRedirect'
import PediatreDashboardPage from './pages/pediatre/PediatreDashboardPage'
import PediatreProfilePage from './pages/pediatre/PediatreProfilePage'
import LoadingSpinner from './components/ui/LoadingSpinner'

const PlaceholderPage = ({ title }) => (
  <div className="p-4">
    <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">{title}</h2>
    <p className="text-gray-400 mt-2">Module en cours de développement...</p>
  </div>
)

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen"><LoadingSpinner size="lg" /></div>
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function RoleRoute({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen"><LoadingSpinner size="lg" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to={user.role === 'pediatre' ? '/pediatre/dashboard' : '/dashboard'} replace />
  return children
}

function PublicRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth()
  if (loading) return null
  if (isAuthenticated) return <Navigate to={user?.role === 'pediatre' ? '/pediatre/dashboard' : '/dashboard'} replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      {/* Espace Parent */}
      <Route element={<PrivateRoute><RoleRoute role="parent"><ChildProvider><AppShell /></ChildProvider></RoleRoute></PrivateRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/children/new" element={<ChildFormPage />} />
        <Route path="/children/:id/edit" element={<ChildFormPage />} />
        <Route path="/children/:childId/vaccinations" element={<VaccinationsPage />} />
        <Route path="/children/:childId/appointments" element={<AppointmentsPage />} />
        <Route path="/growth" element={<PlaceholderPage title="Carnet de Croissance" />} />
        <Route path="/vaccination" element={<VaccinationRedirect />} />
        <Route path="/agenda" element={<AppointmentRedirect />} />
        <Route path="/journal" element={<PlaceholderPage title="Journal des Observations" />} />
        <Route path="/timeline" element={<PlaceholderPage title="Frise Chronologique" />} />
        <Route path="/consultation" element={<PlaceholderPage title="Mode Consultation" />} />
        <Route path="/petitguide" element={<PlaceholderPage title="PetitGuide IA" />} />
      </Route>

      {/* Espace Pédiatre */}
      <Route element={<PrivateRoute><RoleRoute role="pediatre"><PediatreShell /></RoleRoute></PrivateRoute>}>
        <Route path="/pediatre/dashboard" element={<PediatreDashboardPage />} />
        <Route path="/pediatre/profile" element={<PediatreProfilePage />} />
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
