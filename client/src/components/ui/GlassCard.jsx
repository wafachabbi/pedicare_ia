export default function GlassCard({ children, className = '', onClick }) {
  return (
    <div
      className={`glass-card ${className} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
