import { describe, expect, it } from "vitest";
import { extractResearchTarget } from "../convex/research";

const wrap = (target: string) =>
  "https://html.duckduckgo.com/html/?uddg=" + encodeURIComponent(target);

describe("Research Oracle search-result origin validation", () => {
  it("accepts explicit HTTPS targets wrapped by DuckDuckGo", () => {
    expect(extractResearchTarget(wrap("https://example.com/research"))).toBe("https://example.com/research");
  });

  it("accepts the alternate DuckDuckGo result host only when a target is explicit", () => {
    const wrapped = "https://duckduckgo.com/?uddg=" + encodeURIComponent("https://docs.example.org/page");
    expect(extractResearchTarget(wrapped)).toBe("https://docs.example.org/page");
    expect(extractResearchTarget("https://duckduckgo.com/l/?kh=-1")).toBeNull();
  });

  it.each([
    "https://attacker.example/?uddg=https%3A%2F%2Fexample.com",
    "https://example.com/page",
    "javascript:alert(1)",
    "http://example.com",
    "https://127.0.0.1/admin",
    "https://user:pass@example.com",
    "https://example.com:8443",
    "https://localhost/admin",
    "https://api.local/",
    "https://service.internal/",
    "https://metadata.google.internal/",
    "https://host.test/",
    "https://2130706433/",
    "https://0x7f000001/",
    "https://[::1]/",
    "https://[::ffff:127.0.0.1]/",
    "https://192.168.1.10/",
    "https://10.0.0.8/",
    "https://example/",
  ])("rejects malformed, off-origin, or unsafe result link %s", (value) => {
    const wrapped = value.startsWith("https://attacker.example") || value === "https://example.com/page" || value === "javascript:alert(1)"
      ? value
      : wrap(value);
    expect(extractResearchTarget(wrapped)).toBeNull();
  });
});
