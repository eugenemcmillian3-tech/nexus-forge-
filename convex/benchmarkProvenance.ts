import { benchmarkSuite } from './artifactBenchmarkCatalog'
export function parseBenchmarkRunUrl(value: string) {
  const url = new URL(value.trim())
  const prefix = '/' + benchmarkSuite.repository + '/actions/runs/'
  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.port || url.username || url.password || url.search || url.hash || !url.pathname.startsWith(prefix)) throw new Error('Use a completed NEXUS FORGE GitHub Actions run URL.')
  const runId = url.pathname.slice(prefix.length).replace(/\/$/, '')
  if (!/^[1-9][0-9]{0,19}$/.test(runId)) throw new Error('Use a valid GitHub Actions run number in the URL.')
  return { runId, runUrl: 'https://github.com/' + benchmarkSuite.repository + '/actions/runs/' + runId }
}
export type BenchmarkReceiptData = {
  repository: string; runId: string; runUrl: string; commitSha: string; attempt: number;
  workflowPath: string; jobName: string; jobConclusion: string; runConclusion: string;
  suiteVersion: string; outcome: 'passed' | 'failed' | 'not_run';
}
export function verifyBenchmarkMetadata(runId: string, run: any, jobs: any): BenchmarkReceiptData {
  const runUrl = 'https://github.com/' + benchmarkSuite.repository + '/actions/runs/' + runId
  if (String(run?.id) !== runId || run?.repository?.full_name !== benchmarkSuite.repository || run?.head_repository?.full_name !== benchmarkSuite.repository || run?.html_url !== runUrl) throw new Error('GitHub run provenance does not match this project.')
  if (run?.path !== benchmarkSuite.workflowPath) throw new Error('This run is not the NEXUS FORGE CI workflow.')
  if (run?.status !== 'completed') throw new Error('Wait until this GitHub Actions run is complete.')
  if (!/^[0-9a-f]{40}$/i.test(run?.head_sha ?? '') || !Number.isInteger(run?.run_attempt) || run.run_attempt < 1) throw new Error('GitHub did not return a valid commit and attempt.')
  if (!Array.isArray(jobs?.jobs) || jobs.total_count > 100) throw new Error('The job list is incomplete; no benchmark receipt was recorded.')
  const job = jobs.jobs.find((item: any) => item.name === benchmarkSuite.jobName && String(item.run_id) === runId)
  if (!job || job.status !== 'completed' || typeof job.conclusion !== 'string' || !Array.isArray(job.steps)) throw new Error('This run has no completed artifact-dom-v3 benchmark job.')
  const step = job.steps.find((item: any) => item.name === benchmarkSuite.stepName)
  const chromiumStep = job.steps.find((item: any) => item.name === benchmarkSuite.chromiumStepName)
  const outcome = job.conclusion === 'success' && step?.conclusion === 'success' && chromiumStep?.conclusion === 'success' ? 'passed' : step?.conclusion === 'failure' || chromiumStep?.conclusion === 'failure' ? 'failed' : 'not_run'
  return { repository: benchmarkSuite.repository, runId, runUrl, commitSha: run.head_sha.toLowerCase(), attempt: run.run_attempt, workflowPath: benchmarkSuite.workflowPath, jobName: benchmarkSuite.jobName, jobConclusion: job.conclusion, runConclusion: String(run.conclusion ?? 'unknown').slice(0, 40), suiteVersion: benchmarkSuite.version, outcome }
}
