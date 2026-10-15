import { ConvexError, v } from "convex/values"

export const productMetric = v.union(v.literal("active-users"), v.literal("paid-customers"), v.literal("revenue-usd"), v.literal("task-success-rate"), v.literal("task-time-seconds"))
export const productOutcomeInput = { missionId: v.id("missions"), metric: productMetric, observed: v.number(), target: v.number(), sampleSize: v.number(), periodStart: v.number(), periodEnd: v.number(), method: v.string(), evidence: v.array(v.string()), notes: v.string() }
export const productImportReceipt = v.object({ repository: v.string(), commitSha: v.string(), path: v.string(), blobSha: v.string(), reportSha256: v.string(), importedAt: v.number() })
export const productOutcomeFields = { ownerKey: v.string(), ...productOutcomeInput, actual: v.number(), unit: v.string(), direction: v.union(v.literal("higher"), v.literal("lower")), targetMet: v.boolean(), recordedAt: v.number(), provenance: v.union(v.literal("operator-recorded"), v.literal("github-report"), v.literal("product-events")), importKey: v.optional(v.string()), importReceipt: v.optional(productImportReceipt) }

export function evaluateProductOutcome(input: { metric: string; observed: number; target: number; sampleSize: number; periodStart: number; periodEnd: number; method: string; evidence: string[]; notes: string }, now: number) {
  if (![input.observed, input.target, input.sampleSize, input.periodStart, input.periodEnd].every(Number.isFinite)) throw new ConvexError("Measurement values and dates must be finite.")
  if (input.observed < 0 || input.target < 0 || input.observed > 1e12 || input.target > 1e12) throw new ConvexError("Observed value and target must be between 0 and 1 trillion.")
  if (!Number.isInteger(input.sampleSize) || input.sampleSize < 1 || input.sampleSize > 1e9) throw new ConvexError("Sample size must be a whole number from 1 to 1 billion.")
  if (input.periodStart < 0 || input.periodEnd <= input.periodStart || input.periodEnd > now) throw new ConvexError("Choose a completed observation period with its end after its start.")
  const method = input.method.trim(), notes = input.notes.trim()
  const evidence = input.evidence.map(item => item.trim())
  if (method.length < 12 || method.length > 1600) throw new ConvexError("Describe the measurement method in 12–1600 characters.")
  if (notes.length > 1600) throw new ConvexError("Keep limitations within 1600 characters.")
  if (evidence.length < 1 || evidence.length > 8 || evidence.some(item => item.length < 8 || item.length > 1000) || new Set(evidence).size !== evidence.length) throw new ConvexError("Provide 1–8 distinct evidence references, each 8–1000 characters.")
  const count = input.metric === "active-users" || input.metric === "paid-customers"
  if (count && (!Number.isInteger(input.observed) || !Number.isInteger(input.target) || input.observed > input.sampleSize)) throw new ConvexError("User/customer counts and targets must be whole numbers; observed count cannot exceed the sampled population.")
  if (input.metric === "task-success-rate" && (!Number.isInteger(input.observed) || input.observed > input.sampleSize || input.target > 100)) throw new ConvexError("Enter successful tasks as a whole count within the sample; rate target must be 0–100%.")
  const actual = input.metric === "task-success-rate" ? input.observed / input.sampleSize * 100 : input.observed
  const unit = count ? "people" : input.metric === "revenue-usd" ? "USD" : input.metric === "task-time-seconds" ? "seconds" : "%"
  const direction = input.metric === "task-time-seconds" ? "lower" as const : "higher" as const
  return { method, evidence, notes, actual, unit, direction, targetMet: direction === "higher" ? actual >= input.target : actual <= input.target }
}
