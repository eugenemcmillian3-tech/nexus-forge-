import { describe, expect, it } from "vitest";
// @ts-ignore - plain-JS module shared verbatim with the deployed Cloudflare Worker
import { isPublicIpv4, isPublicIpv6, parseIpv6, selectPinnedIp, validateResearchUrl } from "../cloudflare/egress-policy.js";

describe("egress gateway URL policy", () => {
  it("allows ordinary HTTPS DNS URLs", () => {
    expect(validateResearchUrl("https://example.com/research")).toMatchObject({ ok: true, host: "example.com" });
    expect(validateResearchUrl("https://www.example.co.uk/path?q=1")).toMatchObject({ ok: true });
    expect(validateResearchUrl("https://deep.sub.example.io/")).toMatchObject({ ok: true });
    expect(validateResearchUrl("https://example.com:443/")).toMatchObject({ ok: true });
    expect(validateResearchUrl("https://EXAMPLE.COM/Path")).toMatchObject({ ok: true, host: "example.com" });
  });

  it("rejects non-HTTPS schemes, credentials, and non-443 ports", () => {
    for (const url of ["http://example.com/", "https://user:pass@example.com/", "https://example.com:8443/"]) {
      expect(validateResearchUrl(url), url).toMatchObject({ ok: false, reason: "bad_request" });
    }
  });

  it("rejects local, internal, metadata, and literal-IP destinations", () => {
    for (const url of [
      "https://localhost/",
      "https://service.localhost/",
      "https://metadata.google.internal/",
      "https://service.internal/",
      "https://service.local/",
      "https://service.test/",
      "https://127.0.0.1/",
      "https://127.1/",
      "https://2130706433/",
      "https://0x7f000001/",
      "https://[::1]/",
      "https://singlelabel/",
      "not a url",
      "",
    ]) {
      expect(validateResearchUrl(url), url).toMatchObject({ ok: false });
    }
  });
});

describe("egress gateway IPv4 destination policy", () => {
  it("allows public addresses", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "93.184.216.34", "172.32.0.1", "191.255.0.1"]) {
      expect(isPublicIpv4(ip), ip).toBe(true);
    }
  });

  it("rejects loopback, private, CGNAT, link-local, benchmarking, documentation, multicast, and reserved ranges", () => {
    for (const ip of [
      "0.0.0.0",
      "0.1.2.3",
      "10.0.0.1",
      "100.64.0.1",
      "100.100.100.200",
      "127.0.0.1",
      "169.254.169.254",
      "172.16.0.1",
      "172.31.255.255",
      "192.0.0.1",
      "192.0.2.1",
      "192.168.1.1",
      "198.18.0.1",
      "198.19.255.255",
      "198.51.100.1",
      "203.0.113.1",
      "224.0.0.1",
      "240.0.0.1",
      "255.255.255.255",
    ]) {
      expect(isPublicIpv4(ip), ip).toBe(false);
    }
  });

  it("rejects malformed input", () => {
    for (const ip of ["", "8.8.8", "8.8.8.8.8", "999.1.1.1", "abc", "::1"]) {
      expect(isPublicIpv4(ip), ip).toBe(false);
    }
  });
});

describe("egress gateway IPv6 destination policy", () => {
  it("parses compressed and embedded forms", () => {
    expect(parseIpv6("::1")).toEqual([0, 0, 0, 0, 0, 0, 0, 1]);
    expect(parseIpv6("::ffff:192.0.2.1")).toEqual([0, 0, 0, 0, 0, 0xffff, 0xc000, 0x0201]);
    expect(parseIpv6("2606:4700::1111")).toEqual([0x2606, 0x4700, 0, 0, 0, 0, 0, 0x1111]);
    expect(parseIpv6("bad::input::here")).toBeNull();
    expect(parseIpv6("1:2:3:4:5:6:7")).toBeNull();
  });

  it("allows public addresses", () => {
    for (const ip of ["2606:4700:4700::1111", "2001:4860:4860::8888", "2a00:1450:4001::1"]) {
      expect(isPublicIpv6(ip), ip).toBe(true);
    }
  });

  it("rejects unspecified, loopback, ULA, link-local, multicast, and documentation ranges", () => {
    for (const ip of ["::", "::1", "fc00::1", "fd12::1", "fe80::1", "febf::1", "ff02::1", "2001:db8::1"]) {
      expect(isPublicIpv6(ip), ip).toBe(false);
    }
  });

  it("validates IPv4-mapped, IPv4-compatible, and NAT64 forms by their inner address", () => {
    expect(isPublicIpv6("::ffff:8.8.8.8")).toBe(true);
    expect(isPublicIpv6("::ffff:10.0.0.1")).toBe(false);
    expect(isPublicIpv6("::ffff:127.0.0.1")).toBe(false);
    expect(isPublicIpv6("::ffff:169.254.169.254")).toBe(false);
    expect(isPublicIpv6("64:ff9b::808:808")).toBe(true);
    expect(isPublicIpv6("64:ff9b::a00:1")).toBe(false);
  });
});

describe("egress gateway pinned-IP selection", () => {
  it("picks the first public IPv4 answer and prefers IPv4 over IPv6", () => {
    expect(selectPinnedIp([{ type: 1, data: "93.184.216.34" }])).toMatchObject({ ip: "93.184.216.34", family: 4 });
    expect(
      selectPinnedIp([
        { type: 28, data: "2606:4700::1111" },
        { type: 1, data: "93.184.216.34" },
      ]),
    ).toMatchObject({ family: 4 });
  });

  it("falls back to IPv6 when no public IPv4 answer exists", () => {
    expect(selectPinnedIp([{ type: 28, data: "2606:4700::1111" }])).toMatchObject({ family: 6 });
  });

  it("rejects answer sets containing only private or reserved addresses (DNS rebinding defense)", () => {
    expect(selectPinnedIp([{ type: 1, data: "10.0.0.1" }])).toBeNull();
    expect(selectPinnedIp([{ type: 1, data: "169.254.169.254" }])).toBeNull();
    expect(selectPinnedIp([{ type: 28, data: "::ffff:127.0.0.1" }])).toBeNull();
    expect(selectPinnedIp([{ type: 1, data: "10.0.0.1" }, { type: 1, data: "192.168.1.1" }])).toBeNull();
    expect(selectPinnedIp([])).toBeNull();
    expect(selectPinnedIp(null)).toBeNull();
    expect(selectPinnedIp([{ type: 5, data: "cname.example.com" }])).toBeNull();
  });
});
