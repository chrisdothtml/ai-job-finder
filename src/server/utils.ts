import crypto from 'node:crypto';
import fsSync from 'node:fs';
import path from 'node:path';
import { userStorageDir } from '../constants.ts';
import { pathExistsSync } from '../utils/node.ts';

/**
 * Used for encrypting sensitive user data (i.e. an API token)
 * before saving to disk or web browser storage.
 *
 * This isn't bulletproof security, but it does at least avoid
 * storing sensitive data in plaintext (in a format that can't
 * easily be deduced), which is worth something.
 */
export class TokenEncrypter {
  private secret = this.getUserSecret();
  private algo = 'aes-256-gcm' as const;

  private getUserSecret(): string {
    const secretFilePath = path.join(userStorageDir, 'secret');
    if (pathExistsSync(secretFilePath)) {
      return fsSync.readFileSync(secretFilePath, 'utf-8').trim();
    }

    const secret = crypto.randomBytes(32).toString('base64url');

    fsSync.writeFileSync(secretFilePath, secret);
    return secret;
  }

  encryptString(value: string): string {
    const key = Buffer.from(this.secret, 'base64url');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algo, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);

    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString(
      'base64url'
    );
  }

  decryptString(payload: string): string {
    const key = Buffer.from(this.secret, 'base64url');
    const raw = Buffer.from(payload, 'base64url');

    const decipher = crypto.createDecipheriv(
      this.algo,
      key,
      raw.subarray(0, 12)
    );

    decipher.setAuthTag(raw.subarray(12, 28));

    return Buffer.concat([
      decipher.update(raw.subarray(28)),
      decipher.final(),
    ]).toString('utf8');
  }
}

export const tokenEncryptor = new TokenEncrypter();
