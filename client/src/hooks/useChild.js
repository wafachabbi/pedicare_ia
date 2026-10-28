import { useContext } from 'react'
import { ChildContext } from '../contexts/ChildContext'

export function useChild() {
  const context = useContext(ChildContext)
  if (!context) throw new Error('useChild must be used within ChildProvider')
  return context
}
