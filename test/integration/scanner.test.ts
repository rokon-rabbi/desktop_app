import { describe, expect, it, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanFolder } from '@main/scanner';
import type { ScannedFileInsert } from '@main/database/repositories/fileRepository';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cleanspace-scan-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('scanFolder', () => {
  it('recursively finds files across nested directories, including empty ones', async () => {
    const root = await makeTempDir();
    await mkdir(join(root, 'sub', 'nested'), { recursive: true });
    await mkdir(join(root, 'empty'));
    await writeFile(join(root, 'top.txt'), 'a');
    await writeFile(join(root, 'sub', 'mid.pdf'), 'bb');
    await writeFile(join(root, 'sub', 'nested', 'deep.jpg'), 'ccc');

    const batches: ScannedFileInsert[] = [];
    const outcome = await scanFolder('scan-1', root, {
      onBatch: (files) => batches.push(...files),
      onProgress: () => {}
    });

    expect(outcome.cancelled).toBe(false);
    expect(outcome.filesScanned).toBe(3);
    expect(batches.map((f) => f.filename).sort()).toEqual(['deep.jpg', 'mid.pdf', 'top.txt']);
  });

  it('does not recurse into a symlinked directory but does record a symlinked file', async () => {
    const root = await makeTempDir();
    const outsideDir = await makeTempDir();
    await writeFile(join(outsideDir, 'secret.txt'), 'nope');
    await symlink(outsideDir, join(root, 'linked-dir'));

    const realFile = join(root, 'real.txt');
    await writeFile(realFile, 'hello');
    await symlink(realFile, join(root, 'linked-file.txt'));

    const batches: ScannedFileInsert[] = [];
    await scanFolder('scan-1', root, {
      onBatch: (files) => batches.push(...files),
      onProgress: () => {}
    });

    const names = batches.map((f) => f.filename).sort();
    expect(names).toEqual(['linked-file.txt', 'real.txt']);
    expect(batches.find((f) => f.filename === 'linked-file.txt')?.isSymlink).toBe(true);
  });

  it('skips an inaccessible subdirectory without failing the whole scan', async () => {
    const root = await makeTempDir();
    const restricted = join(root, 'restricted');
    await mkdir(restricted);
    await writeFile(join(restricted, 'secret.txt'), 'x');
    await writeFile(join(root, 'visible.txt'), 'y');

    const originalMode = 0o755;
    const fsSync = await import('node:fs');
    fsSync.chmodSync(restricted, 0o000);

    try {
      const batches: ScannedFileInsert[] = [];
      const outcome = await scanFolder('scan-1', root, {
        onBatch: (files) => batches.push(...files),
        onProgress: () => {}
      });

      // Running as root bypasses permission bits, so tolerate either outcome
      // but require the scan to complete without throwing either way.
      expect(outcome.cancelled).toBe(false);
      expect(batches.some((f) => f.filename === 'visible.txt')).toBe(true);
    } finally {
      fsSync.chmodSync(restricted, originalMode);
    }
  });
});
