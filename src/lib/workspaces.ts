export const workspaceGroups = [
  {
    title: '01 · START & PLAN',
    intro: 'Define the outcome, track project progress, and plan the work.',
    pages: [
      { path: '/', title: 'Overview', icon: '⌂', purpose: 'Current mission status, shared progress, and the next action.', use: 'Start here when returning to NEXUS FORGE.', output: 'A clear status and next step.' },
      { path: '/mission', title: 'Mission Console', icon: '◈', purpose: 'Define the mission outcome, constraints, budget, and authorization.', use: 'Create or select a mission.', output: 'A saved mission contract.' },
      { path: '/roadmap', title: 'Master Roadmap', icon: '☷', purpose: 'Track feature coverage, evidence, gaps, and build priorities.', use: 'Plan product development.', output: 'A prioritized project checklist.' },
      { path: '/workflow', title: 'Guided Workflow', icon: '◌', purpose: 'Follow the mission lifecycle and understand where to go next.', use: 'When you need step-by-step operating guidance.', output: 'A mission-specific next-step recommendation.' },
    ],
  },
  {
    title: '02 · INTELLIGENCE',
    intro: 'Plan with agents, structure intent, design opportunities, and gather evidence.',
    pages: [
      { path: '/council', title: 'AI Council', icon: '◎', purpose: 'Review governed planning and specialist agent results.', use: 'After defining a mission.', output: 'A recorded plan and agent evidence.' },
      { path: '/manifest', title: 'Manifest Intelligence', icon: '✧', purpose: 'Create blueprints, compare strategies, and track assumptions and outcomes.', use: 'For opportunity design and longer-horizon strategy.', output: 'A blueprint and evidence-linked strategy records.' },
      { path: '/orchestrator', title: 'Intelligence Orchestrator', icon: '⟁', purpose: 'Compile intent into measurable criteria and competing strategies.', use: 'Before execution when a goal needs structure.', output: 'A structured, reviewable mission specification.' },
      { path: '/evidence', title: 'Research & Memory', icon: '⌁', purpose: 'Gather cited research and inspect persisted evidence and memory.', use: 'When decisions need source-backed context.', output: 'Stored research and citations.' },
    ],
  },
  {
    title: '03 · BUILD',
    intro: 'Create artifacts and verify quality before delivery.',
    pages: [
      { path: '/artifacts', title: 'Artifact Forge', icon: '▣', purpose: 'Generate, inspect, verify, and review artifacts.', use: 'After planning and research.', output: 'A saved artifact with quality findings and its approval state.' },
    ],
  },
  {
    title: '04 · DELIVER',
    intro: 'Deliver through the governed pipeline and verify the resulting evidence.',
    pages: [
      { path: '/delivery', title: 'Delivery Pipeline', icon: '↗', purpose: 'Inspect target, authorization, workflow run, commit, deployment, and readiness evidence.', use: 'After artifact verification and required delivery authorization.', output: 'Traceable delivery evidence.' },
    ],
  },
  {
    title: '05 · MEASURE & LEARN',
    intro: 'Review outcomes after delivery, then compare evidence and capture lessons.',
    pages: [
      { path: '/portfolio', title: 'Portfolio Intelligence', icon: '◇', purpose: 'Prioritize opportunities and record operator decisions across missions.', use: 'When reviewing outcomes or selecting the next opportunity.', output: 'Recorded prioritization decisions.' },
      { path: '/learning', title: 'Verified Learning Engine', icon: '↻', purpose: 'Compare measured results and capture reviewed lessons.', use: 'When comparable baseline and candidate evidence exists.', output: 'Evidence-linked comparisons and advisory lessons.' },
    ],
  },
  {
    title: 'SUPPORT TOOLS',
    intro: 'Specialist diagnostics and recovery pages remain available when needed, without crowding the main navigation.',
    pages: [
      { path: '/capabilities', title: 'Capability & Reliability', icon: '▤', showInSidebar: false, purpose: 'Review recorded verification, incidents, experiments, and provider diagnostics.', use: 'When investigating reliability or capability evidence.', output: 'A point-in-time view of recorded checks.' },
      { path: '/readiness', title: 'Launch Readiness', icon: '✓', showInSidebar: false, purpose: 'Run and review target-specific readiness checks.', use: 'Before launch or after deployment.', output: 'A readiness result with individual checks.' },
      { path: '/incidents', title: 'Incident Center', icon: '!', showInSidebar: false, purpose: 'Inspect incidents, diagnosis, retry eligibility, and recovery state.', use: 'When a run fails, times out, or becomes blocked.', output: 'A recovery decision and evidence.' },
      { path: '/providers', title: 'AI Providers', icon: '⌘', showInSidebar: false, purpose: 'Inspect provider routing and health information.', use: 'When diagnosing inference availability.', output: 'Provider health and routing visibility.' },
    ],
  },
] as const

// One source of truth: main navigation contains core user-facing pages; specialist tools stay reachable from the guide and relevant feature pages.
export const allWorkspaces = workspaceGroups.reduce<(typeof workspaceGroups)[number]['pages'][number][]>((items, group) => [...items, ...group.pages], [])
export const primaryWorkspaces = allWorkspaces.filter(workspace => !['/capabilities', '/readiness', '/incidents', '/providers'].includes(workspace.path))

// Full product guide includes every dedicated page, including on-demand diagnostics.
const guidePaths = ['/', '/workflow', '/roadmap', '/manifest', '/orchestrator', '/mission', '/providers', '/council', '/evidence', '/artifacts', '/delivery', '/readiness', '/portfolio', '/learning', '/capabilities', '/incidents']
export const guidedWorkspaces = guidePaths.map(path => allWorkspaces.find(page => page.path === path)!)
