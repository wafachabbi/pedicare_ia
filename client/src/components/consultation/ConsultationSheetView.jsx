import { jsPDF } from 'jspdf'
import AIBadge from '../ui/AIBadge'

const AI_DISCLAIMER = "Générée par IA — ne remplace pas l'avis médical"

const SECTIONS = [
  { key: 'resume', label: 'Résumé', icon: '📝' },
  { key: 'motifs', label: 'Motifs de consultation', icon: '🎯' },
  { key: 'antecedents', label: 'Antécédents', icon: '📚' },
  { key: 'questionsParent', label: 'Questions du parent', icon: '💬' },
  { key: 'pointsAttention', label: "Points d'attention", icon: '⚠️' }
]

const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

// Les polices standard de jsPDF ne couvrent que Latin-1 (+ quelques signes) : on retire emojis et espaces spéciaux
const pdfText = (text) => String(text || '')
  .replace(/[  ]/g, ' ')
  .replace(/[^\u0000-ÿ–—‘’“”…€Œœ]/g, '')

function downloadPdf(sheet, childName) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 15
  const width = doc.internal.pageSize.getWidth() - margin * 2
  const pageBottom = doc.internal.pageSize.getHeight() - 20
  const lineHeight = 5.5
  let y = margin + 5

  const ensureSpace = (height) => {
    if (y + height > pageBottom) { doc.addPage(); y = margin + 5 }
  }

  const writeLines = (lines, indent = 0) => {
    lines.forEach(line => {
      ensureSpace(lineHeight)
      doc.text(line, margin + indent, y)
      y += lineHeight
    })
  }

  // En-tête
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(pdfText('Fiche de consultation — PediCare AI'), margin, y)
  y += 8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(110)
  doc.text(pdfText(`Date : ${formatDate(sheet.createdAt)}${childName ? `   ·   Enfant : ${childName}` : ''}`), margin, y)
  doc.setTextColor(0)
  y += 10

  // Sections
  SECTIONS.forEach(({ key, label }) => {
    const value = sheet.content?.[key]
    ensureSpace(lineHeight * 3)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(pdfText(label), margin, y)
    y += 6.5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10.5)

    if (key === 'resume') {
      writeLines(doc.splitTextToSize(pdfText(value || '—'), width))
    } else if (!value?.length) {
      writeLines(['—'])
    } else {
      value.forEach(item => {
        const lines = doc.splitTextToSize(pdfText(item), width - 5)
        ensureSpace(lineHeight)
        doc.text('•', margin, y)
        writeLines(lines, 5)
      })
    }
    y += 4
  })

  // Pied de page avec mention IA sur chaque page
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8.5)
    doc.setTextColor(130)
    doc.text(pdfText(`${AI_DISCLAIMER}   ·   Page ${i}/${pageCount}`), margin, doc.internal.pageSize.getHeight() - 10)
  }

  doc.save(`fiche-consultation-${new Date(sheet.createdAt).toISOString().slice(0, 10)}.pdf`)
}

export default function ConsultationSheetView({ sheet, childName }) {
  if (!sheet) return null
  const { content = {}, meta = {} } = sheet
  const totalTokens = (meta.promptTokens || 0) + (meta.completionTokens || 0)

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-white font-semibold text-lg">📋 Fiche de consultation{childName ? ` — ${childName}` : ''}</h3>
          <p className="text-white/80 text-xs mt-0.5">{formatDate(sheet.createdAt)}</p>
        </div>
        <button onClick={() => downloadPdf(sheet, childName)}
          className="bg-white text-sky-600 font-semibold px-4 py-2 rounded-xl shadow hover:shadow-lg hover:scale-105 transition-all text-sm">
          📄 Télécharger en PDF
        </button>
      </div>

      <div className="p-6 space-y-5">
        <div className="flex items-center gap-2 flex-wrap">
          <AIBadge />
          <span className="text-xs text-gray-500 dark:text-gray-400">{AI_DISCLAIMER}</span>
        </div>

        {SECTIONS.map(({ key, label, icon }) => {
          const value = content[key]
          return (
            <section key={key}>
              <h4 className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
                <span>{icon}</span> {label}
              </h4>
              {key === 'resume' ? (
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{value || '—'}</p>
              ) : value?.length ? (
                <ul className="space-y-1.5">
                  {value.map((item, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <span className="text-sky-500 shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500">—</p>
              )}
            </section>
          )
        })}

        {/* Ligne technique */}
        <p className="pt-3 border-t border-gray-100 dark:border-slate-700 text-[11px] text-gray-400 dark:text-gray-500">
          {[
            meta.model,
            meta.latencyMs != null && `${meta.latencyMs} ms`,
            totalTokens > 0 && `${totalTokens} tokens (${meta.promptTokens || 0} + ${meta.completionTokens || 0})`,
            meta.fromCache && '⚡ depuis le cache'
          ].filter(Boolean).join(' · ')}
        </p>
      </div>
    </div>
  )
}
