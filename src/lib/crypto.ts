// AES-GCM 加密辅助：用于设置导出/导入。仅作用于导出文件，不写回 chrome.storage.sync。
//
// 产物结构（外层 JSON）：
//   {
//     "format": "translator-encrypted-v1",
//     "kdf": "PBKDF2-SHA256",
//     "iterations": 200000,
//     "salt": "<base64>",
//     "iv": "<base64>",
//     "ciphertext": "<base64>"
//   }

export const ENCRYPTED_FORMAT = 'translator-encrypted-v1' as const;
const KDF_NAME = 'PBKDF2-SHA256' as const;
const PBKDF2_ITERATIONS = 200_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const KEY_BITS = 256;

export interface EncryptedPayload {
  format: typeof ENCRYPTED_FORMAT;
  kdf: typeof KDF_NAME;
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

function randomBuffer(length: number): ArrayBuffer {
  const buf = new ArrayBuffer(length);
  crypto.getRandomValues(new Uint8Array(buf));
  return buf;
}

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const buf = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buf;
}

function utf8Encode(text: string): ArrayBuffer {
  const bytes = new TextEncoder().encode(text);
  const buf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buf).set(bytes);
  return buf;
}

async function deriveAesKey(passphrase: string, salt: ArrayBuffer, iterations: number): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    utf8Encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: KEY_BITS },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptJSON(plaintext: string, passphrase: string): Promise<string> {
  if (!passphrase) {
    throw new Error('PASSPHRASE_REQUIRED');
  }
  const salt = randomBuffer(SALT_BYTES);
  const iv = randomBuffer(IV_BYTES);
  const key = await deriveAesKey(passphrase, salt, PBKDF2_ITERATIONS);
  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    utf8Encode(plaintext)
  );
  const payload: EncryptedPayload = {
    format: ENCRYPTED_FORMAT,
    kdf: KDF_NAME,
    iterations: PBKDF2_ITERATIONS,
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(cipherBuf),
  };
  return JSON.stringify(payload, null, 2);
}

export async function decryptJSON(ciphertext: string, passphrase: string): Promise<string> {
  if (!passphrase) {
    throw new Error('PASSPHRASE_REQUIRED');
  }
  let payload: EncryptedPayload;
  try {
    payload = JSON.parse(ciphertext) as EncryptedPayload;
  } catch {
    throw new Error('UNSUPPORTED_ENCRYPTED_FORMAT');
  }
  if (payload.format !== ENCRYPTED_FORMAT || payload.kdf !== KDF_NAME) {
    throw new Error('UNSUPPORTED_ENCRYPTED_FORMAT');
  }
  const salt = base64ToBuffer(payload.salt);
  const iv = base64ToBuffer(payload.iv);
  const data = base64ToBuffer(payload.ciphertext);
  const iterations = Number.isInteger(payload.iterations) && payload.iterations > 0
    ? payload.iterations
    : PBKDF2_ITERATIONS;
  const key = await deriveAesKey(passphrase, salt, iterations);
  let plainBuf: ArrayBuffer;
  try {
    plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  } catch {
    throw new Error('DECRYPT_FAILED');
  }
  return new TextDecoder().decode(plainBuf);
}

export function isEncryptedPayload(parsed: unknown): parsed is EncryptedPayload {
  return Boolean(
    parsed &&
      typeof parsed === 'object' &&
      (parsed as { format?: unknown }).format === ENCRYPTED_FORMAT
  );
}
