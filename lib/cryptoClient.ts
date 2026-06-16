// Web Crypto API AES-256-GCM Encryption Helper

// Helper to convert Uint8Array to Hex string
export function bufToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper to convert Hex string to Uint8Array
export function hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Derive AES-GCM key from passphrase and salt
async function getEncryptionKey(passphrase: string, saltBuf: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuf,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt payload
export async function encryptPayload(
  passphrase: string, 
  plaintext: string, 
  customSaltHex?: string, 
  customIvHex?: string
): Promise<{ ciphertext: string; salt: string; iv: string }> {
  const enc = new TextEncoder();
  const saltBuf = customSaltHex ? hexToBuf(customSaltHex) : window.crypto.getRandomValues(new Uint8Array(16));
  const ivBuf = customIvHex ? hexToBuf(customIvHex) : window.crypto.getRandomValues(new Uint8Array(12));
  
  const key = await getEncryptionKey(passphrase, saltBuf);
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: ivBuf
    },
    key,
    enc.encode(plaintext)
  );

  return {
    ciphertext: bufToHex(new Uint8Array(encrypted)),
    salt: bufToHex(saltBuf),
    iv: bufToHex(ivBuf)
  };
}

// Decrypt payload
export async function decryptPayload(passphrase: string, ciphertextHex: string, saltHex: string, ivHex: string): Promise<string> {
  const dec = new TextDecoder();
  const saltBuf = hexToBuf(saltHex);
  const ivBuf = hexToBuf(ivHex);
  const ciphertextBuf = hexToBuf(ciphertextHex);

  const key = await getEncryptionKey(passphrase, saltBuf);
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBuf
    },
    key,
    ciphertextBuf
  );

  return dec.decode(decrypted);
}
