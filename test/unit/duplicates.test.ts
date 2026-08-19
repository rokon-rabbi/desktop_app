import { describe, expect, it, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findDuplicates } from '@main/duplicates';
import type { ScannedFile } from '@shared/types';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cleanspace-test-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function file(path: string, sizeBytes: number): ScannedFile {
  return {
    id: path,
    scanId: 'scan-1',
    path,
    filename: path.split('/').pop() ?? path,
    extension: 'txt',
    sizeBytes,
    category: 'Documents',
    parentFolder: path.slice(0, path.lastIndexOf('/')),
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    accessedAt: new Date().toISOString(),
    isSymlink: false
  };
}

describe('findDuplicates', () => {
  it('confirms identical files as a duplicate group', async () => {
    const dir = await makeTempDir();
    const a = join(dir, 'a.txt');
    const b = join(dir, 'b.txt');
    await writeFile(a, 'identical content'.repeat(100));
    await writeFile(b, 'identical content'.repeat(100));
    const sizeBytes = (await stat(a)).size;

    const sizeGroups = new Map([[sizeBytes, [file(a, sizeBytes), file(b, sizeBytes)]]]);
    const groups = await findDuplicates('scan-1', sizeGroups, { onProgress: () => {} });

    expect(groups).toHaveLength(1);
    expect(groups[0]?.files.map((f) => f.path).sort()).toEqual([a, b].sort());
  });

  it('does not group same-size files with different content', async () => {
    const dir = await makeTempDir();
    const a = join(dir, 'a.txt');
    const b = join(dir, 'b.txt');
    await writeFile(a, 'AAAAAAAAAAAAAAAA');
    await writeFile(b, 'BBBBBBBBBBBBBBBB');

    const sizeGroups = new Map([[16, [file(a, 16), file(b, 16)]]]);
    const groups = await findDuplicates('scan-1', sizeGroups, { onProgress: () => {} });

    expect(groups).toHaveLength(0);
  });

  it('excludes a file that can no longer be read rather than guessing', async () => {
    const dir = await makeTempDir();
    const a = join(dir, 'a.txt');
    const missing = join(dir, 'missing.txt');
    await writeFile(a, 'content');

    const sizeGroups = new Map([[7, [file(a, 7), file(missing, 7)]]]);
    const groups = await findDuplicates('scan-1', sizeGroups, { onProgress: () => {} });

    expect(groups).toHaveLength(0);
  });
});
