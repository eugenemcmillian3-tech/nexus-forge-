import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OverviewPage } from "../src/routes/index";
import { WorkflowPage } from "../src/routes/workflow";

const { activeMission } = vi.hoisted(() => ({
  activeMission: {
    missionId: "mission_test",
    mission: {
      title: "QA test mission",
      mission: "Create and verify a small demo artifact",
      status: "complete",
      approved: true,
      budget: 0,
    },
    agents: [{ status: "complete" }],
    research: [{ _id: "research_test" }],
    artifacts: [{ status: "ready" }],
    deliveries: [{ stage: "verified", status: "Production deployment verified", approved: true, workflowConclusion: "success", workflowRunUrl: "https://github.com/example/repo/actions/runs/123", workflowCommitSha: "a".repeat(40), workflowRecordedAt: 1, deploymentRunUrl: "https://github.com/example/repo/actions/runs/123", deploymentCommitSha: "a".repeat(40), deploymentUrl: "https://example.com", readinessStatus: "pass", readinessPassedCount: 6, readinessTotalCount: 6 }],
    councilComplete: true,
  },
}));

vi.mock("../src/hooks/use-active-mission", () => ({
  useActiveMission: () => activeMission,
}));

vi.mock("../src/components/workspace-layout", () => ({
  WorkspaceLayout: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <main><h1>{title}</h1>{children}</main>
  ),
}));

vi.mock("../src/components/mission-control", () => ({
  MissionControl: () => <div>Mock mission execution and outcome controls</div>,
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={to} {...props}>{children}</a>
  ),
}));

describe("isolated end-to-end workflow journey", () => {
  it("shows all overview stages complete from persisted test fixtures", () => {
    render(<OverviewPage />);

    expect(screen.getByRole("heading", { name: "QA test mission" })).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("9/9")).toBeInTheDocument();
    expect(screen.getByText("Evidence recorded — review outcome")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Review outcome/ })).toHaveAttribute("href", "/workflow");
  });

  it("renders the ordered workflow with every stage complete only with verified deployment evidence", () => {
    render(<WorkflowPage />);

    expect(screen.getByRole("heading", { name: "Autonomous Workflow" })).toBeInTheDocument();
    expect(screen.getByText("5/5 STAGES")).toBeInTheDocument();
    expect(screen.getByText("01 · Define & approve mission")).toBeInTheDocument();
    expect(screen.getByText("05 · Verify production delivery")).toBeInTheDocument();
    expect(screen.getByText("Mock mission execution and outcome controls")).toBeInTheDocument();
    expect(screen.getAllByText("DONE")).toHaveLength(5);
    expect(screen.getByTestId("workflow-next-step")).toHaveTextContent("ALL WORKFLOW STAGES VERIFIED");
    expect(screen.getAllByRole("link", { name: /Review portfolio/ })[0]).toHaveAttribute("href", "/portfolio");
  });

  it("does not mark a build/test-only delivery as production verified", () => {
    activeMission.deliveries = [{ stage: "test", status: "GitHub Actions build and test completed", approved: true, workflowConclusion: "success", workflowRunUrl: "https://github.com/example/repo/actions/runs/123", workflowCommitSha: "a".repeat(40), workflowRecordedAt: 1, deploymentRunUrl: "", deploymentCommitSha: "", deploymentUrl: "", readinessStatus: "fail", readinessPassedCount: 0, readinessTotalCount: 6 }];
    render(<WorkflowPage />);
    expect(screen.getByText("4/5 STAGES")).toBeInTheDocument();
    expect(screen.getAllByText("PENDING")).toHaveLength(1);
    expect(screen.getByTestId("workflow-next-step")).toHaveTextContent("NEXT STEP · 05 · Verify production delivery");
    expect(screen.getByRole("link", { name: /Continue this stage/ })).toHaveAttribute("href", "/delivery");
  });
});
