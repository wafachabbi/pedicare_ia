export default function LoadingSpinner({ size = 'md', color = 'mint' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }
  const colors = { mint: 'border-mint-500', violet: 'border-violet-500', sky: 'border-sky-500' }
  return (
    <div
      className={`animate-spin rounded-full border-2 border-gray-200 ${colors[color]} border-t-transparent ${sizes[size]}`}
      role="status"
      aria-label="Chargement"
    />
  )
}
