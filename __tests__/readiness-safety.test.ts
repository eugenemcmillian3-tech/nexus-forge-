import { describe, expect, it } from "vitest";
import { normalizeUrl } from "../convex/readiness";

describe("readiness URL safety", () => {
  it("normalizes public DNS hostnames", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com/");
    expect(normalizeUrl("https://status.example.com/health#section")).toBe("https://status.example.com/health");
  });

  it.each([
    "http://localhost",
    "http://service.local",
    "http://internal.internal",
    "http://127.0.0.1",
    "http://10.0.0.2",
    "http://169.254.169.254/latest/meta-data/",
    "http://[::1]",
    "http://metadata.google.internal",
    "https://user:password@example.com",
    "https://example.com:8443",
    "file:///etc/passwd",
  ])("rejects unsafe probe target %s", (url) => {
    expect(() => normalizeUrl(url)).toThrow();
  });

  it("allows standard HTTP URLs so the HTTPS readiness check can report a failure", () => {
    expect(normalizeUrl("http://example.com")).toBe("http://example.com/");
  });
});
