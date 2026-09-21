export default function ErrorMessage({ message, onRetry }) {
  if (!message) return null
  return (
    <div
      role="alert"
      className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm"
    >
      <span aria-hidden="true">⚠️</span>
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="text-xs underline hover:no-underline">
          Réessayer
        </button>
      )}
    </div>
  )
}
