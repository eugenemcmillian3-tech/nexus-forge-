import { summarizeBrowserRun } from './artifactTestPlan'
import type { BrowserCase } from './artifactTestPlan'
export const artifactCiRepository = 'eugenemcmillian3-tech/nexus-forge-'
export const artifactCiWorkflow = '.github/workflows/nexus-forge-artifact-checks.yml'
export const artifactCiCheckName = 'NEXUS artifact snapshot v1'
export function exactRunId(value: string) {
  const url = new URL(value)
  const match = url.pathname.match(/^\/eugenemcmillian3-tech\/nexus-forge-\/actions\/runs\/([1-9][0-9]*)\/?$/)
  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.port || url.username || url.password || url.search || url.hash || !match) throw new Error('Use the exact completed NEXUS FORGE artifact-check run URL')
  return match[1]
}
export function verifyExactCiReport(snapshot: { _id: string; criteria: string[]; plan: BrowserCase[]; ci: { commitSha: string; snapshotSha: string; branch: string } }, run: any, jobs: any, checks: any) {
  const base = 'https://github.com/' + artifactCiRepository + '/actions/runs/' + run.id
  if (run.repository?.full_name !== artifactCiRepository || run.head_repository?.full_name !== artifactCiRepository || run.path !== artifactCiWorkflow || run.status !== 'completed' || run.head_sha !== snapshot.ci.commitSha || run.head_branch !== snapshot.ci.branch || run.html_url !== base || !Number.isInteger(run.run_attempt) || run.run_attempt < 1) throw new Error('CI run does not match the published artifact snapshot')
  const job = jobs.jobs?.find((job: any) => job.name === 'Exact artifact Chromium checks' && String(job.run_id) === String(run.id))
  if (!job || job.status !== 'completed' || jobs.total_count > 100 || checks.total_count > 100) throw new Error('Exact artifact CI job evidence is incomplete')
  const check = checks.check_runs?.find((check: any) => check.name === artifactCiCheckName && check.app?.slug === 'github-actions' && check.head_sha === snapshot.ci.commitSha && check.external_id === snapshot.ci.snapshotSha && check.details_url === base + '/attempts/' + run.run_attempt && check.status === 'completed')
  if (!check || typeof check.output?.text !== 'string' || check.output.text.length > 60000) throw new Error('GitHub has no matching completed snapshot report')
  const report = JSON.parse(check.output.text)
  if (report.version !== 'artifact-ci-v1' || report.snapshotSha !== snapshot.ci.snapshotSha || report.testRunId !== snapshot._id) throw new Error('CI report snapshot digest or record does not match')
  const summary = summarizeBrowserRun(snapshot.criteria, snapshot.plan, report.results)
  if (check.conclusion !== (summary.allPassed ? 'success' : 'failure')) throw new Error('GitHub check conclusion conflicts with the observed step report')
  return { results: report.results, checkId: check.id, attempt: run.run_attempt, runUrl: base, summary }
}
