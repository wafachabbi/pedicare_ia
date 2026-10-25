// Affiche un texte IA (markdown léger : **gras**) sans injecter de HTML
export default function AIText({ text }) {
  if (!text) return null
  return (
    <div className="max-w-none">
      {text.split('\n').map((line, i) => {
        if (!line.trim()) return <br key={i} />
        const parts = line.split(/\*\*(.*?)\*\*/g)
        return (
          <p key={i} className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-2">
            {parts.map((part, j) => (j % 2 === 1 ? <strong key={j}>{part}</strong> : part))}
          </p>
        )
      })}
    </div>
  )
}
