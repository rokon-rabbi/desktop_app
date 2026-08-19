import { describe, expect, it, afterEach } from 'vitest';
import { mkdtemp, rm, symlink, mkdir, writeFile, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  assertSafeScanRoot,
  isPathWithinRoot,
  isProtectedPath,
  UnsafePathError,
  validateMove
} from '@main/safety/paths';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cleanspace-test-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('isPathWithinRoot', () => {
  it('matches the root itself and nested paths', () => {
    expect(isPathWithinRoot('/home/user', '/home/user')).toBe(true);
    expect(isPathWithinRoot('/home/user/Downloads/file.txt', '/home/user')).toBe(true);
  });

  it('does not match a sibling path with a shared prefix', () => {
    expect(isPathWithinRoot('/home/userExtra/file.txt', '/home/user')).toBe(false);
  });

  it('resolves ".." segments before comparing', () => {
    expect(isPathWithinRoot('/home/user/Downloads/../../etc/passwd', '/home/user')).toBe(false);
  });
});

describe('isProtectedPath', () => {
  it('flags known system roots', () => {
    expect(isProtectedPath('/etc/passwd')).toBe(true);
    expect(isProtectedPath('/proc/1/mem')).toBe(true);
    expect(isProtectedPath('/usr/bin/bash')).toBe(true);
  });

  it('does not flag a user home directory', () => {
    expect(isProtectedPath('/home/user/Downloads')).toBe(false);
  });

  it('does not flag a path that merely shares a protected root as a string prefix', () => {
    expect(isProtectedPath('/etcetera/file.txt')).toBe(false);
  });
});

describe('assertSafeScanRoot', () => {
  it('rejects protected system paths', async () => {
    await expect(assertSafeScanRoot('/etc')).rejects.toThrow(UnsafePathError);
  });

  it('rejects a path that does not exist', async () => {
    await expect(assertSafeScanRoot('/this/path/does/not/exist/hopefully')).rejects.toThrow(UnsafePathError);
  });

  it('rejects a path that is a file, not a directory', async () => {
    const dir = await makeTempDir();
    const file = join(dir, 'file.txt');
    await writeFile(file, 'hello');
    await expect(assertSafeScanRoot(file)).rejects.toThrow(UnsafePathError);
  });

  it('accepts a valid, existing directory', async () => {
    const dir = await makeTempDir();
    const real = await assertSafeScanRoot(dir);
    expect(real).toBe(await realpath(dir));
  });

  it('rejects a root that is a symlink pointing at a protected path', async () => {
    const dir = await makeTempDir();
    const link = join(dir, 'sneaky');
    await symlink('/etc', link);
    await expect(assertSafeScanRoot(link)).rejects.toThrow(UnsafePathError);
  });
});

describe('validateMove', () => {
  it('rejects when the source no longer exists', async () => {
    const dir = await makeTempDir();
    const result = await validateMove(join(dir, 'missing.txt'), join(dir, 'dest.txt'));
    expect(result.ok).toBe(false);
  });

  it('rejects when the destination folder does not exist', async () => {
    const dir = await makeTempDir();
    const source = join(dir, 'source.txt');
    await writeFile(source, 'data');
    const result = await validateMove(source, join(dir, 'nope', 'dest.txt'));
    expect(result.ok).toBe(false);
  });

  it('rejects when a file already exists at the destination', async () => {
    const dir = await makeTempDir();
    const source = join(dir, 'source.txt');
    const dest = join(dir, 'dest.txt');
    await writeFile(source, 'data');
    await writeFile(dest, 'already here');
    const result = await validateMove(source, dest);
    expect(result.ok).toBe(false);
  });

  it('accepts a valid move: existing source, empty destination, existing destination dir', async () => {
    const dir = await makeTempDir();
    const destDir = join(dir, 'sub');
    await mkdir(destDir);
    const source = join(dir, 'source.txt');
    await writeFile(source, 'data');
    const result = await validateMove(source, join(destDir, 'dest.txt'));
    expect(result.ok).toBe(true);
  });

  it('rejects a move touching a protected path', async () => {
    const result = await validateMove('/etc/passwd', '/etc/passwd.bak');
    expect(result.ok).toBe(false);
  });
});
