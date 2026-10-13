export type ArtifactQualityResult = {
  passed: boolean;
  score: number;
  checks: string[];
};

function visibleTextContent(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<input\b[^>]*\bvalue\s*=\s*[\"']([^\"']+)[\"'][^>]*>/gi, " $1 ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '\"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function visibleSectionHasContent(text: string, start: string, end: string, minimumCharacters: number): boolean {
  const normalized = text.toLowerCase();
  const startIndex = normalized.lastIndexOf(start.toLowerCase());
  if (startIndex < 0) return false;
  const contentStart = startIndex + start.length;
  const endIndex = normalized.indexOf(end.toLowerCase(), contentStart);
  if (endIndex < 0) return false;
  const section = text.slice(contentStart, endIndex).replace(/^[\\s:–—-]+/, "").trim();
  return section.length >= minimumCharacters;
}

/**
 * Conservative static acceptance checks for generated standalone HTML.
 * Mission-aware checks catch required behavior that generic HTML heuristics miss.
 * These checks are not a substitute for executing the artifact in a browser.
 */
export function verifyArtifactContent(content: string, mission = ""): ArtifactQualityResult {
  const text = content.trim();
  const lower = text.toLowerCase();
  const missionLower = mission.toLowerCase();
  const hasHtmlStructure =
    /<!doctype\s+html|<html[\s>]/i.test(text) &&
    /<head[\s>]/i.test(text) &&
    /<body[\s>]/i.test(text);
  // Blueprint keywords only indicate a non-runnable response when the content is
  // not already a complete HTML document; a runnable app may legitimately be
  // titled a "checklist" or "proposal" without being a plan.
  const looksLikeBlueprint =
    !hasHtmlStructure &&
    (/(^|\n)\s*(mission blueprint|blueprint|architecture|implementation plan|technical plan)\b/i.test(text) ||
      /\b(proposal|pseudocode|checklist)\b/i.test(text.slice(0, 1200)));
  const complete =
    text.length >= 500 &&
    !/^\s*\`\`\`/i.test(text) &&
    !/\[(?:truncated|output omitted|insert .* here)\]/i.test(text) &&
    !/\bTODO\b|\bFIXME\b/i.test(text);
  const htmlDocument = hasHtmlStructure && !looksLikeBlueprint;
  const hasStyles = /<style[\s>]|<link[^>]+stylesheet/i.test(text);
  const hasInteraction =
    /<script[\s>]/i.test(text) &&
    /addEventListener|onsubmit|onclick|oninput/i.test(text);
  const hasFormControls = /<form[\s>]/i.test(text) && /<(?:input|textarea|select|button)[\s>]/i.test(text);
  const controls = [...text.matchAll(/<(?:input|textarea|select)\b([^>]*)>/gi)];
  const labelledIds = new Set(
    [...text.matchAll(/<label\b[^>]*\bfor\s*=\s*["']([^"']+)["']/gi)].map((match) => match[1]),
  );
  const hasAccessibleLabels =
    controls.length > 0 &&
    controls.every((match) => {
      const attributes = match[1];
      const id = attributes.match(/\bid\s*=\s*["']([^"']+)["']/i)?.[1];
      return /\baria-label\s*=|\baria-labelledby\s*=/i.test(attributes) || Boolean(id && labelledIds.has(id));
    });
  const hasValidation = /\brequired\b|checkValidity\(|reportValidity\(|setCustomValidity\(|preventDefault\(/i.test(text);
  const hasResponsiveSupport =
    /name\s*=\s*["']viewport["']/i.test(text) &&
    /@media\s*\(|max-width\s*:|min-width\s*:/i.test(text);
  const hasAcceptanceEvidence =
    /\btest\b/i.test(text) &&
    /\bvalidation\b/i.test(text) &&
    /\bevidence\b/i.test(text) &&
    /\baudit\b/i.test(text);
  const unsupportedClaimPattern =
    /\(\s*555\s*\)\s*\d{3}[-.\s]?\d{4}|\b(?:available\s+)?24\s*\/\s*7\b|\btop[- ]rated\b|\baward[- ]winning\b|\bguaranteed\b|\b5[- ]star\b|\b\d(?:\.\d)?\s*\+?\s*star\s+rating\b|\b100%\s+satisfaction\b|\bcall\s+(?:us\s+)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/i;
  const knownInventedBusinessName = /\bprofessional service solutions\b|\byour company name here\b|\bacme(?: corporation)?\b/i;
  const unsupportedOffer = /\bfree\s+(?:consultation|quote|estimate|inspection)\b/i;
  const noUnsupportedClaims =
    !unsupportedClaimPattern.test(text) &&
    (!/\b(?:certified|licensed|insured)\b/i.test(text) || /\b(?:certified|licensed|insured)\b/i.test(mission)) &&
    (!unsupportedOffer.test(text) || unsupportedOffer.test(mission)) &&
    (!knownInventedBusinessName.test(text) || knownInventedBusinessName.test(mission));
  const noSecretOrPlaceholder =
    !/\bsk-or-v1-[A-Za-z0-9_-]{12,}|\bgsk_[A-Za-z0-9_-]{12,}|\b(?:api[_-]?key|secret|access[_-]?token)\s*[:=]\s*["'][^"']{8,}["']/i.test(text) &&
    !/\b(?:lorem ipsum|insert (?:your|a) (?:phone|email|api key|business name)|your company name here)\b/i.test(text);
  const requiresKeywordIntegration = /\bseo\b|\bkeywords?\b/i.test(missionLower);
  // Keyword integration is satisfied by a keyword-aware generateContent implementation
  // or by SEO keywords being visibly present in the generated copy itself.
  const hasKeywordIntegration =
    /function\s+generateContent[\s\S]{0,1600}\bkeywords?\b/i.test(text) ||
    (/\bseo\b/i.test(text) && /\bkeywords?\b/i.test(text));
  const requiresJsonExport =
    /\bjson\s+export\b|\bexport(?:ing)?\s+(?:the\s+)?json\b|\bjson\b.{0,30}\bdownload\b/i.test(missionLower);
  const hasJsonPayload =
    /new\s+Blob\s*\(/i.test(text) &&
    /application\/json|application\/octet-stream|data:application\/json/i.test(text);
  const createsObjectUrl = /URL\.createObjectURL\s*\(/i.test(text);
  const hasDownloadAnchor =
    /<a\b[^>]*\bdownload(?:\s|=|>)/i.test(text) ||
    (/createElement\s*\(\s*["']a["']\s*\)/i.test(text) &&
      /\.download\s*=/.test(text) &&
      /\.click\s*\(\s*\)/.test(text));
  const hasJsonDownload = hasJsonPayload && createsObjectUrl && hasDownloadAnchor;
  const requiresNoExternalWrites =
    /do not send messages|do not publish externally|without external (?:calls|writes|publishing)/i.test(missionLower);
  const hasNoExternalWrites =
    !/\bfetch\s*\(|XMLHttpRequest|sendBeacon\s*\(/i.test(text);
  const requiresConcreteCampaignCopy =
    /\bmarketing campaign\b/i.test(missionLower) &&
    /\btarget customer\b/i.test(missionLower) &&
    /\bpositioning\b/i.test(missionLower) &&
    /\bheadlines?\b/i.test(missionLower) &&
    /\bsuccess metrics\b/i.test(missionLower);
  const visibleText = visibleTextContent(text);
  const hasThreeHeadlines =
    visibleSectionHasContent(visibleText, "Ad Headlines", "Homepage Section", 25) ||
    (visibleSectionHasContent(visibleText, "Ad Headline 1", "Ad Headline 2", 8) &&
      visibleSectionHasContent(visibleText, "Ad Headline 2", "Ad Headline 3", 8) &&
      visibleSectionHasContent(visibleText, "Ad Headline 3", "Homepage Section", 8));
  const hasSuccessMetrics =
    visibleSectionHasContent(visibleText, "Success Metrics", "Verification", 15) ||
    visibleSectionHasContent(visibleText, "Success Metric 1", "Verification", 15);
  const hasConcreteCampaignCopy =
    visibleSectionHasContent(visibleText, "Target Customer", "Positioning", 15) &&
    visibleSectionHasContent(visibleText, "Positioning", "Ad Headline", 20) &&
    hasThreeHeadlines &&
    visibleSectionHasContent(visibleText, "Homepage Section", "Success Metric", 25) &&
    hasSuccessMetrics;

  const checks = [
    complete ? "Complete artifact content is present" : "Artifact content is too short, truncated, or contains unfinished placeholders",
    htmlDocument ? "Runnable HTML document structure detected" : "Runnable HTML document missing or blueprint returned",
    hasStyles ? "Presentation layer detected" : "Presentation layer missing",
    hasInteraction ? "Interactive behavior and event handling detected" : "Interactive interaction handler missing",
    hasFormControls ? "Interactive form controls detected" : "Interactive form controls missing",
    hasAccessibleLabels ? "Every form control has an accessible label or name" : "Accessible labels missing for one or more form controls",
    hasValidation ? "Input validation behavior detected" : "Input validation behavior missing",
    hasResponsiveSupport ? "Responsive viewport and layout rules detected" : "Responsive layout support missing",
    hasAcceptanceEvidence ? "Test, validation, evidence, and audit sections detected" : "Acceptance evidence or audit section missing",
    noUnsupportedClaims ? "No known fabricated contact, availability, rating, offer, or business-name claims detected" : "Unsupported claims detected: fabricated contact/availability/rating/offer/business-name details",
    noSecretOrPlaceholder ? "No obvious embedded credential or unfinished business placeholder found" : "Secret-like value or unfinished business placeholder detected",
    ...(!requiresKeywordIntegration || hasKeywordIntegration
      ? ["Target SEO keywords integrated in generated copy or not required"]
      : ["Target SEO keywords missing from generated copy"]),
    ...(!requiresJsonExport || hasJsonDownload
      ? ["Mission-specific JSON download/export behavior detected or not required"]
      : ["Mission requires JSON export but a downloadable JSON file is not implemented"]),
    ...(!requiresNoExternalWrites || hasNoExternalWrites
      ? ["External side effects match mission constraints or are not specified"]
      : ["Mission prohibits external writes but the artifact contains a network-send API"]),
    ...(requiresConcreteCampaignCopy
      ? [hasConcreteCampaignCopy ? "Mission-specific campaign copy is visibly populated" : "Mission-specific campaign copy missing or empty template returned"]
      : []),
  ];
  const passedCount = checks.filter((check) =>
    !/missing|too short|truncated|blueprint returned|Unsupported claims detected|placeholder detected|not implemented|prohibits external writes/i.test(check),
  ).length;
  const score = passedCount / checks.length;
  return { passed: passedCount === checks.length, score, checks };
}
