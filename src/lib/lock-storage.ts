/**
 * Local-device lock storage. PIN is stored as a SHA-256 hash + random salt
 * (not a password, just a 4-digit gate, but we still avoid storing it raw).
 * Biometric uses WebAuthn — we only persist the credential ID locally; the
 * private key never leaves the device's secure enclave.
 *
 * All keys are scoped per Supabase user id so multiple accounts on the same
 * device don't collide.
 */

const PREFIX = "yoyo:lock";

export const LAST_ACTIVITY_KEY = `${PREFIX}:last-activity`;
export const LOCKED_KEY = `${PREFIX}:locked`;

// 15 days in ms
export const INACTIVITY_SIGNOUT_MS = 15 * 24 * 60 * 60 * 1000;

function userKey(userId: string, suffix: string) {
  return `${PREFIX}:${userId}:${suffix}`;
}

// ─── PIN ────────────────────────────────────────────────

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function setPin(userId: string, pin: string): Promise<void> {
  if (!/^\d{4}$/.test(pin)) throw new Error("PIN must be 4 digits");
  const salt = randomSalt();
  const hash = await sha256Hex(`${salt}:${pin}`);
  localStorage.setItem(userKey(userId, "pin-salt"), salt);
  localStorage.setItem(userKey(userId, "pin-hash"), hash);
}

export async function verifyPin(userId: string, pin: string): Promise<boolean> {
  const salt = localStorage.getItem(userKey(userId, "pin-salt"));
  const hash = localStorage.getItem(userKey(userId, "pin-hash"));
  if (!salt || !hash) return false;
  const candidate = await sha256Hex(`${salt}:${pin}`);
  return candidate === hash;
}

export function hasPin(userId: string): boolean {
  return !!localStorage.getItem(userKey(userId, "pin-hash"));
}

export function clearPin(userId: string): void {
  localStorage.removeItem(userKey(userId, "pin-salt"));
  localStorage.removeItem(userKey(userId, "pin-hash"));
}

// ─── Biometric (WebAuthn) ───────────────────────────────

function b64urlFromBytes(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function bytesFromB64url(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

export function isBiometricSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.PublicKeyCredential &&
    typeof navigator !== "undefined" &&
    !!navigator.credentials
  );
}

export function hasBiometric(userId: string): boolean {
  return !!localStorage.getItem(userKey(userId, "bio-cred"));
}

export function clearBiometric(userId: string): void {
  localStorage.removeItem(userKey(userId, "bio-cred"));
}

export async function enrollBiometric(userId: string, userName: string): Promise<void> {
  if (!isBiometricSupported()) throw new Error("Biometric not supported on this device");
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  const userIdBytes = new TextEncoder().encode(userId);
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "YOYO ERP" },
      user: { id: userIdBytes, name: userName, displayName: userName },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60_000,
      attestation: "none",
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error("Enrollment cancelled");
  const rawId = b64urlFromBytes(new Uint8Array(cred.rawId));
  localStorage.setItem(userKey(userId, "bio-cred"), rawId);
}

export async function verifyBiometric(userId: string): Promise<boolean> {
  if (!isBiometricSupported()) return false;
  const credId = localStorage.getItem(userKey(userId, "bio-cred"));
  if (!credId) return false;
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60_000,
        userVerification: "required",
        allowCredentials: [{ type: "public-key", id: bytesFromB64url(credId).buffer as ArrayBuffer }],
      },
    });
    return !!assertion;
  } catch {
    return false;
  }
}

// ─── Activity / lock state ──────────────────────────────

export function markActivity(): void {
  try { localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now())); } catch {}
}
export function getLastActivity(): number {
  const v = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
  return Number.isFinite(v) ? v : 0;
}
export function setLocked(locked: boolean): void {
  try {
    if (locked) localStorage.setItem(LOCKED_KEY, "1");
    else localStorage.removeItem(LOCKED_KEY);
    window.dispatchEvent(new Event("yoyo:lock-change"));
  } catch {}
}
export function isLocked(): boolean {
  return localStorage.getItem(LOCKED_KEY) === "1";
}

export function clearAllLockData(userId: string): void {
  clearPin(userId);
  clearBiometric(userId);
  setLocked(false);
}