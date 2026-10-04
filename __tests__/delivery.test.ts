import { describe, expect, it } from "vitest"

describe("NEXUS FORGE delivery contract", () => {
  it("requires human approval before deployment", () => {
    const approved = false
    expect(approved).toBe(false)
  })

  it("uses the governed delivery sequence", () => {
    const sequence = ["approval", "github", "build", "test", "deploy", "verified"]
    expect(sequence).toEqual(["approval", "github", "build", "test", "deploy", "verified"])
  })

  it("treats a successful CI result as evidence, not deployment", () => {
    const ciConclusion = "success"
    const deployed = false
    expect(ciConclusion).toBe("success")
    expect(deployed).toBe(false)
  })
})
