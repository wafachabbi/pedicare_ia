import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChild } from '../../hooks/useChild'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

export default function AppointmentRedirect() {
  const { activeChild, loading } = useChild()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && activeChild) {
      navigate(`/children/${activeChild._id}/appointments`, { replace: true })
    }
  }, [activeChild, loading, navigate])

  if (loading) return <LoadingSpinner />

  if (!loading && !activeChild) {
    return (
      <div className="text-center py-16 text-gray-400 dark:text-gray-500">
        <p className="text-4xl mb-3">👶</p>
        <p>Aucun profil enfant. Commencez par en créer un.</p>
      </div>
    )
  }

  return <LoadingSpinner />
}
