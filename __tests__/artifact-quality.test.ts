import { describe, expect, it } from "vitest";
import { verifyArtifactContent } from "../convex/artifactQuality";

const validHtml = [
  "<!doctype html>",
  '<html lang="en">',
  "<head>",
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  "<title>Service Request</title>",
  "<style>body { font-family: sans-serif; } @media (max-width: 600px) { body { padding: .5rem; } }</style>",
  "</head>",
  "<body>",
  "<main>",
  "<h1>Request a service consultation</h1>",
  "<p>Describe what you need and review the request before exporting it.</p>",
  '<form id="request-form">',
  '<label for="service">Service requested</label>',
  '<input id="service" name="service" required>',
  '<label for="details">Project details</label>',
  '<textarea id="details" name="details" required></textarea>',
  '<button type="submit">Prepare request</button>',
  "</form>",
  '<section aria-labelledby="evidence-heading">',
  '<h2 id="evidence-heading">Verification evidence and audit</h2>',
  "<p>Test and validation checks confirm required fields before the request is exported. This local preview does not send data externally.</p>",
  "</section>",
  '<script>document.querySelector("#request-form").addEventListener("submit", (event) => { event.preventDefault(); if (!event.currentTarget.checkValidity()) event.currentTarget.reportValidity(); });</script>',
  "</main>",
  "</body>",
  "</html>",
].join("\n");

describe("verifyArtifactContent", () => {
  it("accepts a complete interactive and responsive HTML artifact", () => {
    const result = verifyArtifactContent(validHtml);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);
    expect(result.checks).toHaveLength(14);
  });

  it("rejects fabricated phone numbers and unsupported availability claims", () => {
    const result = verifyArtifactContent(
      validHtml.replace("</main>", "<p>Call us (555) 123-4567. Available 24/7 and top-rated.</p></main>"),
    );
    expect(result.passed).toBe(false);
    expect(result.checks.some((check) => check.includes("Unsupported claims detected"))).toBe(true);
  });

  it("rejects blueprint text instead of a runnable document", () => {
    const result = verifyArtifactContent("Mission Blueprint\n".padEnd(700, "This is a plan. "));
    expect(result.passed).toBe(false);
    expect(result.checks.some((check) => check.includes("blueprint returned"))).toBe(true);
  });

  it("accepts a runnable HTML document whose title contains the word checklist", () => {
    const checklistApp = validHtml
      .replace("<title>Service Request</title>", "<title>QA E2E Workflow Checklist</title>")
      .replace("<h1>Request a service consultation</h1>", "<h1>QA E2E Workflow Checklist</h1>");
    const result = verifyArtifactContent(checklistApp);
    expect(result.passed).toBe(true);
    expect(result.checks.some((check) => check.includes("Runnable HTML document structure detected"))).toBe(true);
  });

  it("rejects unfinished placeholders", () => {
    const result = verifyArtifactContent(validHtml.replace("Describe what you need", "TODO: insert your phone"));
    expect(result.passed).toBe(false);
    expect(result.checks.some((check) => check.includes("unfinished placeholders"))).toBe(true);
  });

  it("rejects missing interaction handlers and accessible labels", () => {
    const result = verifyArtifactContent(
      validHtml.replace(/<script>[\s\S]*?<\/script>/, "<script>const value = 1;</script>")
        .replace(/<label[^>]*>[\s\S]*?<\/label>/g, "<span>Unlabelled field</span>"),
    );
    expect(result.passed).toBe(false);
    expect(result.checks.some((check) => check.includes("interaction handler missing"))).toBe(true);
    expect(result.checks.some((check) => check.includes("Accessible labels missing"))).toBe(true);
  });

  it("rejects an empty campaign builder when the mission requires completed campaign copy", () => {
    const mission = "Create a marketing campaign with target customer, positioning, three ad headlines, a short homepage section, and success metrics.";
    const emptyBuilder = validHtml
      .replace("<h1>Request a service consultation</h1>", "<h1>Marketing Campaign Builder</h1>")
      .replace("<p>Describe what you need and review the request before exporting it.</p>", "<p>Enter your campaign details.</p>")
      .replace("<label for=\"service\">Service requested</label>", "<label for=\"service\">Target Customer</label>")
      .replace("<label for=\"details\">Project details</label>", "<label for=\"details\">Positioning</label>")
      .replace("<button type=\"submit\">Prepare request</button>", "<button type=\"submit\">Generate Campaign</button>")
      .replace("<section aria-labelledby=\"evidence-heading\">", "<p>Ad Headlines: Homepage Section: Success Metrics:</p><section aria-labelledby=\"evidence-heading\">");
    const result = verifyArtifactContent(emptyBuilder, mission);
    expect(result.passed).toBe(false);
    expect(result.checks.some((check) => check.includes("campaign copy missing or empty template"))).toBe(true);
  });

  it("accepts a populated campaign when all requested copy sections are visible", () => {
    const campaign = validHtml.replace(
      "<h1>Request a service consultation</h1>",
      "<h1>FreshNest Cleaning Campaign</h1><h2>Target Customer</h2><p>Busy homeowners who need reliable weekly cleaning and convenient online booking.</p><h2>Positioning</h2><p>FreshNest provides dependable, locally focused home cleaning with clear scheduling and straightforward service options.</p><h2>Ad Headlines</h2><p>1. A Cleaner Home, More Free Time. 2. Reliable Local Cleaning, On Your Schedule. 3. Book Your Next Home Refresh.</p><h2>Homepage Section</h2><p>Enjoy a consistently tidy home with a local cleaning team built around your schedule and priorities.</p><h2>Success Metrics</h2><p>Track qualified inquiries, inquiry-to-booking conversion, repeat bookings, and customer feedback monthly.</p>",
    );
    const mission = "Create a marketing campaign with target customer, positioning, three ad headlines, a short homepage section, and success metrics.";
    const result = verifyArtifactContent(campaign, mission);
    expect(result.passed).toBe(true);
    expect(result.checks.some((check) => check.includes("campaign copy is visibly populated"))).toBe(true);
  });

  it("recognizes populated form values as campaign copy rather than an empty template", () => {
    const campaign = validHtml.replace(
      "<h1>Request a service consultation</h1>",
      '<h1>Campaign</h1><h2>Target Customer</h2><label for="target">Target Customer</label><input id="target" value="Busy homeowners seeking reliable weekly cleaning">' +
        '<h2>Positioning</h2><label for="positioning">Positioning</label><textarea id="positioning">Reliable local cleaning that fits a busy household schedule.</textarea>' +
        '<h2>Ad Headlines</h2><p>1. A Cleaner Home, More Free Time. 2. Reliable Cleaning on Your Schedule. 3. Refresh Your Space Today.</p>' +
        '<h2>Homepage Section</h2><p>Keep your home comfortable with a dependable local cleaning service tailored to your priorities.</p>' +
        '<h2>Success Metrics</h2><p>Track qualified inquiries, lead-to-booking conversion, and repeat bookings monthly.</p>',
    );
    const mission = "Create a marketing campaign with target customer, positioning, three ad headlines, a short homepage section, and success metrics.";
    const result = verifyArtifactContent(campaign, mission);
    expect(result.passed).toBe(true);
    expect(result.checks.some((check) => check.includes("campaign copy is visibly populated"))).toBe(true);
  });

  it("rejects unsupported certification claims", () => {
    const result = verifyArtifactContent(
      validHtml.replace("</main>", "<p>Our certified technicians provide local service.</p></main>"),
    );
    expect(result.passed).toBe(false);
    expect(result.checks.some((check) => check.includes("Unsupported claims detected"))).toBe(true);
  });

  it("rejects obvious embedded API credentials", () => {
    const result = verifyArtifactContent(
      validHtml.replace("</main>", '<p>API_KEY = "abcdef1234567890"</p></main>'),
    );
    expect(result.passed).toBe(false);
    expect(result.checks.some((check) => check.includes("Secret-like value"))).toBe(true);
  });

  it("rejects invented numerical star-rating claims", () => {
    const result = verifyArtifactContent(
      validHtml.replace("</main>", "<p>Maintain a 4.5+ star rating on local review platforms.</p></main>"),
    );
    expect(result.passed).toBe(false);
    expect(result.checks.some((check) => check.includes("Unsupported claims detected"))).toBe(true);
  });

  it("rejects invented business offers that the mission did not authorize", () => {
    const result = verifyArtifactContent(
      validHtml.replace("</main>", "<h2>Get a Free Consultation from Professional Service Solutions</h2></main>"),
      "Build a landing page with an accessible lead form.",
    );
    expect(result.passed).toBe(false);
    expect(result.checks.some((check) => check.includes("Unsupported claims detected"))).toBe(true);
  });

  it("requires a downloadable JSON export when the mission asks for it", () => {
    const result = verifyArtifactContent(
      validHtml,
      "Build a landing page with JSON export. Do not publish externally.",
    );
    expect(result.passed).toBe(false);
    expect(result.checks.some((check) => check.includes("JSON export but a downloadable JSON file is not implemented"))).toBe(true);
  });

  it("rejects JSON export code that assigns download properties to a button", () => {
    const brokenExport = validHtml.replace(
      "</main>",
      '<button id="download-json">Download JSON</button><script>const blob = new Blob([JSON.stringify({ ok: true })], { type: "application/json" }); const url = URL.createObjectURL(blob); const downloadBtn = document.querySelector("#download-json"); downloadBtn.href = url; downloadBtn.download = "data.json";</script></main>',
    );
    const result = verifyArtifactContent(
      brokenExport,
      "Build a landing page with JSON export.",
    );
    expect(result.passed).toBe(false);
    expect(result.checks.some((check) => check.includes("JSON export but a downloadable JSON file is not implemented"))).toBe(true);
  });

  it("accepts JSON export code that creates and clicks a real download anchor", () => {
    const workingExport = validHtml.replace(
      "</main>",
      '<button id="download-json">Download JSON</button><script>document.querySelector("#download-json").addEventListener("click", () => { const blob = new Blob([JSON.stringify({ ok: true })], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "data.json"; anchor.click(); URL.revokeObjectURL(url); });</script></main>',
    );
    const result = verifyArtifactContent(
      workingExport,
      "Build a landing page with JSON export.",
    );
    expect(result.passed).toBe(true);
    expect(result.checks.some((check) => check.includes("JSON download/export behavior detected"))).toBe(true);
  });

  it("requires SEO target keywords to be used in the generated-copy function", () => {
    const result = verifyArtifactContent(
      validHtml,
      "Build an SEO copy generator that uses the supplied keywords in generated copy.",
    );
    expect(result.passed).toBe(false);
    expect(result.checks.some((check) => check.includes("Target SEO keywords missing from generated copy"))).toBe(true);
  });
});
