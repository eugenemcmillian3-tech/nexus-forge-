import { describe, expect, it } from "vitest";
import { isAuthSessionError } from "../src/components/error-boundary";

describe("auth-session error detection", () => {
  it("recognizes the ConvexError thrown by requireOperator", () => {
    expect(isAuthSessionError("Authenticated operator session required")).toBe(true);
  });

  it("recognizes the serialized client-side wrapper of that ConvexError", () => {
    expect(
      isAuthSessionError(
        "[CONVEX Q(readiness:listRuns)] [Request ID: f312cda807903e2e] Authenticated operator session required Called by client",
      ),
    ).toBe(true);
  });

  it("recognizes generic auth-expiry messages", () => {
    expect(isAuthSessionError("Auth session not found")).toBe(true);
    expect(isAuthSessionError("User is not authenticated")).toBe(true);
  });

  it("does not treat genuine server failures as ended sessions", () => {
    expect(
      isAuthSessionError(
        "[CONVEX Q(readiness:listRuns)] [Request ID: f312cda807903e2e] Server Error Called by client",
      ),
    ).toBe(false);
    expect(isAuthSessionError("Unexpected token in JSON")).toBe(false);
  });
});
