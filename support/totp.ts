import { createHmac } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

function decodeBase32(secret: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const normalized = secret.toUpperCase().replace(/=+$/, '');
  if (!/^[A-Z2-7]+$/.test(normalized)) throw new Error('Invalid Base32 MFA secret');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const character of normalized) {
    value = (value << 5) | alphabet.indexOf(character);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 255);
      value &= (1 << bits) - 1;
    }
  }
  return Buffer.from(bytes);
}

// Independently checked against RFC 6238 Appendix B SHA-1 vectors.
export function totpCode(secret: string, timeMs: number, period = 30, digits = 6): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(timeMs / (period * 1000))));
  const digest = createHmac('sha1', decodeBase32(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 15;
  const value = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(value % (10 ** digits)).padStart(digits, '0');
}

export class TotpAuthenticator {
  readonly period: number;
  readonly digits: number;
  private readonly secret: string;
  private lastSubmittedStep = -1;

  constructor(secret: string, otpAuthUri: string) {
    let uri: URL;
    try { uri = new URL(otpAuthUri); } catch { throw new Error('Invalid OTPAuth URI'); }
    this.period = Number(uri.searchParams.get('period') ?? 30);
    this.digits = Number(uri.searchParams.get('digits') ?? 6);
    const algorithm = (uri.searchParams.get('algorithm') ?? 'SHA1').toUpperCase();
    if (uri.protocol !== 'otpauth:' || uri.hostname !== 'totp'
      || uri.searchParams.get('secret') !== secret || algorithm !== 'SHA1'
      || this.digits !== 6 || !Number.isInteger(this.period) || this.period < 10 || this.period > 60) {
      throw new Error('Unsupported or inconsistent MFA provisioning parameters');
    }
    decodeBase32(secret);
    this.secret = secret;
  }

  async nextCode(): Promise<string> {
    const periodMs = this.period * 1000;
    const now = Date.now();
    const step = Math.floor(now / periodMs);
    // A submitted step is reserved even if its response is lost. Do not retry it.
    const earliestStep = Math.max(step, this.lastSubmittedStep + 1);
    let readyAt = earliestStep * periodMs + 1000;
    if (earliestStep === step && periodMs - (now % periodMs) < 3000) {
      readyAt = (step + 1) * periodMs + 1000;
    }
    const wait = Math.max(0, readyAt - now);
    if (wait > periodMs + 1500) throw new Error('Fresh MFA time step exceeds the bounded wait');
    if (wait) await delay(wait);
    const submittedAt = Date.now();
    this.lastSubmittedStep = Math.floor(submittedAt / periodMs);
    return totpCode(this.secret, submittedAt, this.period, this.digits);
  }

  invalidCode(): string {
    // Exclude a wider window than the inspected backend's +/-1 step, including
    // the next network-boundary step; this is a rejection input, not brute force.
    const now = Date.now();
    const valid = new Set(Array.from({ length: 7 }, (_, i) =>
      totpCode(this.secret, now + (i - 3) * this.period * 1000, this.period, this.digits)));
    for (let value = 0; value < 100; value++) {
      const candidate = String(value).padStart(this.digits, '0');
      if (!valid.has(candidate)) return candidate;
    }
    throw new Error('Unable to select an invalid MFA code');
  }
}
