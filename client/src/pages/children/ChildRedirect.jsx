import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChild } from '../../hooks/useChild'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

// Redirige /<segment> vers /children/:childId/<segment> pour l'enfant actif
export default function ChildRedirect({ segment }) {
  const { activeChild, loading } = useChild()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && activeChild) {
      navigate(`/children/${activeChild._id}/${segment}`, { replace: true })
    }
  }, [activeChild, loading, navigate, segment])

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
