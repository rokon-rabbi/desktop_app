import { describe, expect, it, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildOrganizePreview } from '@main/organizer/preview';
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

function file(overrides: Partial<ScannedFile> & Pick<ScannedFile, 'path' | 'filename' | 'category' | 'parentFolder'>): ScannedFile {
  return {
    id: Math.random().toString(36),
    scanId: 'scan-1',
    extension: '',
    sizeBytes: 10,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    accessedAt: new Date().toISOString(),
    isSymlink: false,
    ...overrides
  };
}

describe('buildOrganizePreview', () => {
  it('proposes a move into the category subfolder', async () => {
    const root = await makeTempDir();
    const files = [
      file({ path: join(root, 'a.pdf'), filename: 'a.pdf', category: 'Documents', parentFolder: root })
    ];
    const preview = await buildOrganizePreview('scan-1', root, files);
    expect(preview.moves).toHaveLength(1);
    expect(preview.moves[0]?.destinationPath).toBe(join(root, 'Documents', 'a.pdf'));
  });

  it('skips files already in their category folder', async () => {
    const root = await makeTempDir();
    const categoryDir = join(root, 'Documents');
    const files = [
      file({ path: join(categoryDir, 'a.pdf'), filename: 'a.pdf', category: 'Documents', parentFolder: categoryDir })
    ];
    const preview = await buildOrganizePreview('scan-1', root, files);
    expect(preview.moves).toHaveLength(0);
    expect(preview.skipped).toHaveLength(1);
  });

  it('skips symlinks instead of moving them', async () => {
    const root = await makeTempDir();
    const files = [
      file({ path: join(root, 'link.pdf'), filename: 'link.pdf', category: 'Documents', parentFolder: root, isSymlink: true })
    ];
    const preview = await buildOrganizePreview('scan-1', root, files);
    expect(preview.moves).toHaveLength(0);
    expect(preview.skipped[0]?.reason).toMatch(/symbolic link/i);
  });

  it('auto-renames on a same-destination collision within the move set, and flags it', async () => {
    const root = await makeTempDir();
    const subA = join(root, 'a');
    const subB = join(root, 'b');
    await mkdir(subA);
    await mkdir(subB);
    const files = [
      file({ path: join(subA, 'report.pdf'), filename: 'report.pdf', category: 'Documents', parentFolder: subA }),
      file({ path: join(subB, 'report.pdf'), filename: 'report.pdf', category: 'Documents', parentFolder: subB })
    ];
    const preview = await buildOrganizePreview('scan-1', root, files);
    expect(preview.moves).toHaveLength(2);
    const destinations = preview.moves.map((m) => m.destinationPath);
    expect(new Set(destinations).size).toBe(2);
    expect(preview.moves.some((m) => m.collision)).toBe(true);
  });

  it('flags a collision with a real file already on disk at the destination', async () => {
    const root = await makeTempDir();
    const categoryDir = join(root, 'Documents');
    await mkdir(categoryDir);
    await writeFile(join(categoryDir, 'a.pdf'), 'existing file');
    const files = [file({ path: join(root, 'a.pdf'), filename: 'a.pdf', category: 'Documents', parentFolder: root })];
    const preview = await buildOrganizePreview('scan-1', root, files);
    expect(preview.moves[0]?.collision).toBe(true);
    // Renamed, not left pointed at the occupied path — Apply must never
    // silently overwrite the pre-existing file.
    expect(preview.moves[0]?.destinationPath).toBe(join(categoryDir, 'a (2).pdf'));
  });
});
