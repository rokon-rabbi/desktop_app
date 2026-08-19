import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { PARTIAL_HASH_BYTES } from '@shared/constants';

/** Hashes only the first PARTIAL_HASH_BYTES of a file — cheap enough to run on every same-size candidate. */
export async function hashPartial(path: string): Promise<string> {
  const hash = createHash('sha256');
  const stream = createReadStream(path, { start: 0, end: PARTIAL_HASH_BYTES - 1 });
  for await (const chunk of stream) {
    hash.update(chunk as Buffer);
  }
  return hash.digest('hex');
}

/** Hashes the whole file. Only called on candidates that already share size and partial hash. */
export async function hashFull(path: string): Promise<string> {
  const hash = createHash('sha256');
  const stream = createReadStream(path);
  for await (const chunk of stream) {
    hash.update(chunk as Buffer);
  }
  return hash.digest('hex');
}
