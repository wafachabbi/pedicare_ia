import { createContext, useState, useEffect, useCallback } from 'react'
import { childrenService } from '../services/children.service'
import { useAuth } from '../hooks/useAuth'

export const ChildContext = createContext(null)

export function ChildProvider({ children }) {
  const [childList, setChildList] = useState([])
  const [activeChild, setActiveChild] = useState(null)
  const [loading, setLoading] = useState(false)

  const { isAuthenticated, user } = useAuth()

  const fetchChildren = useCallback(async () => {
    if (!isAuthenticated || user?.role !== 'parent') return
    setLoading(true)
    try {
      const data = await childrenService.getAll()
      setChildList(data.data)
      if (data.data.length > 0 && !activeChild) {
        setActiveChild(data.data[0])
      }
    } catch (err) {
      console.error('Erreur chargement enfants:', err)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    fetchChildren()
  }, [fetchChildren])

  return (
    <ChildContext.Provider value={{ childList, activeChild, setActiveChild, fetchChildren, loading }}>
      {children}
    </ChildContext.Provider>
  )
}
