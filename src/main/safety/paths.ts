import { resolve, sep, dirname } from 'node:path';
import { realpath, stat, lstat } from 'node:fs/promises';
import { PROTECTED_ROOTS } from '@shared/constants';

export class UnsafePathError extends Error {
  code = 'UNSAFE_PATH' as const;

  constructor(message: string) {
    super(message);
    this.name = 'UnsafePathError';
  }
}

/**
 * True if `target` is equal to or nested inside `root`, compared on fully
 * resolved paths so `..` segments and trailing slashes can't fool it.
 */
export function isPathWithinRoot(target: string, root: string): boolean {
  const normTarget = resolve(target);
  const normRoot = resolve(root);
  if (normTarget === normRoot) return true;
  const withSep = normRoot.endsWith(sep) ? normRoot : normRoot + sep;
  return normTarget.startsWith(withSep);
}

/** Checked against a resolved-path prefix match, never a plain string prefix. */
export function isProtectedPath(target: string): boolean {
  const normalized = resolve(target);
  return PROTECTED_ROOTS.some((root) => isPathWithinRoot(normalized, root));
}

/**
 * Resolves and validates a path a user picked as a scan or watch root.
 * Rejects protected system paths, missing paths, and non-directories.
 * Resolves symlinks explicitly (via realpath) so a symlinked root can't be
 * used to sneak past the protected-path check.
 */
export async function assertSafeScanRoot(rawPath: string): Promise<string> {
  const resolved = resolve(rawPath);
  if (isProtectedPath(resolved)) {
    throw new UnsafePathError(`Refusing to use protected system path: ${resolved}`);
  }

  let real: string;
  try {
    real = await realpath(resolved);
  } catch {
    throw new UnsafePathError(`Path does not exist or is not accessible: ${resolved}`);
  }

  if (isProtectedPath(real)) {
    throw new UnsafePathError(`Refusing to use protected system path: ${real}`);
  }

  const info = await stat(real);
  if (!info.isDirectory()) {
    throw new UnsafePathError(`Not a directory: ${real}`);
  }

  return real;
}

/** Checks whether a filesystem entry is a symlink without following it. */
export async function isSymlink(path: string): Promise<boolean> {
  try {
    const info = await lstat(path);
    return info.isSymbolicLink();
  } catch {
    return false;
  }
}

export interface MoveValidationResult {
  ok: boolean;
  reason?: string;
}

/**
 * The pre-flight checks the context spec requires before any move:
 * validate source, validate destination, confirm neither touches a
 * protected root, and refuse to silently overwrite an existing file.
 */
export async function validateMove(
  sourcePath: string,
  destinationPath: string
): Promise<MoveValidationResult> {
  const src = resolve(sourcePath);
  const dest = resolve(destinationPath);

  if (isProtectedPath(src) || isProtectedPath(dest)) {
    return { ok: false, reason: 'Refusing to modify a protected system path.' };
  }

  try {
    await stat(src);
  } catch {
    return { ok: false, reason: 'Source file no longer exists.' };
  }

  const destDir = dirname(dest);
  try {
    const destDirReal = await realpath(destDir);
    if (isProtectedPath(destDirReal)) {
      return { ok: false, reason: 'Destination folder is a protected system path.' };
    }
  } catch {
    return { ok: false, reason: 'Destination folder does not exist.' };
  }

  try {
    await stat(dest);
    return { ok: false, reason: 'A file already exists at the destination.' };
  } catch {
    // Destination does not exist — this is the expected, safe case.
  }

  return { ok: true };
}
