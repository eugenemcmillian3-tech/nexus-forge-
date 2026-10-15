const stopWords = new Set(["the", "and", "for", "with", "that", "this", "from", "into", "use", "using", "are", "was", "will", "have", "has", "our", "your", "their", "not", "but", "its", "can"])
export function rankCouncilCandidate<T extends { category: string; key: string; value: string; _creationTime: number; _id: string }>(rows: T[], mission: string, budget: number) {
  const terms = [...new Set((mission.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).filter(term => !stopWords.has(term)))].slice(0, 40)
  const ranked = rows.filter(row => ["learning-lesson", "verification-outcome", "operational-recovery"].includes(row.category)).map(row => {
    const tokens = new Set((row.key + " " + row.value).toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])
    return { row, score: terms.filter(term => tokens.has(term)).length }
  }).sort((a, b) => b.score - a.score || b.row._creationTime - a.row._creationTime || a.row._id.localeCompare(b.row._id))
  return { terms, rows: ranked.slice(0, budget).map(item => item.row) }
}
