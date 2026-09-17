import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createOtpAuthUrl, encryptMfaSecret, decryptMfaSecret, verifyTotp } from "@/lib/mfa";

function code(secret: string, timestamp: number) {
  const original = Date.now;
  Date.now = () => timestamp;
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const character of secret) bits += alphabet.indexOf(character).toString(2).padStart(5, "0");
  const bytes = Buffer.from(Array.from({ length: Math.floor(bits.length / 8) }, (_, index) => Number.parseInt(bits.slice(index * 8, index * 8 + 8), 2)));
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(timestamp / 1000 / 30)));
  const digest = createHmac("sha1", bytes).update(counter).digest();
  const offset = digest[digest.length - 1] & 15;
  const value = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  Date.now = original;
  return String(value).padStart(6, "0");
}

describe("admin MFA", () => {
  afterEach(() => vi.useRealTimers());

  it("encrypts and decrypts secrets", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    expect(decryptMfaSecret(encryptMfaSecret(secret))).toBe(secret);
  });
  it("verifies a current TOTP code", () => {
    const timestamp = 1_700_000_000_000;
    const secret = "JBSWY3DPEHPK3PXP";
    vi.useFakeTimers();
    vi.setSystemTime(timestamp);
    expect(verifyTotp(secret, code(secret, timestamp))).toBe(true);
  });
  it("creates an authenticator URI", () => {
    expect(createOtpAuthUrl("ABC123", "admin@example.com")).toContain("otpauth://totp/SevaSetu:");
  });
});
