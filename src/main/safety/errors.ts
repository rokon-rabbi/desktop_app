import type { AppError } from '@shared/types';
import { UnsafePathError } from './paths';
import { logger } from './logger';

const NODE_ERROR_MESSAGES: Record<string, string> = {
  EACCES: 'CleanSpace does not have permission to access this location.',
  EPERM: 'CleanSpace does not have permission to perform this action.',
  ENOENT: 'This file or folder no longer exists.',
  ENOSPC: 'There is not enough free disk space to complete this action.',
  EEXIST: 'A file already exists at the destination.',
  EISDIR: 'Expected a file but found a folder.',
  ENOTDIR: 'Expected a folder but found a file.',
  EXDEV: 'Could not move the file across filesystems.',
  EMFILE: 'Too many files are open at once. Try again in a moment.',
  EBUSY: 'The file is currently in use by another program.'
};

interface NodeErrnoLike {
  code?: string;
  message?: string;
}

/**
 * Turns a caught error into a structured, user-safe AppError while logging
 * the technical detail. Never lets a raw error message reach the renderer
 * silently — see context.md §21, Error Handling.
 */
export function toAppError(error: unknown, context: string): AppError {
  if (error instanceof AppOperationError) {
    return error.appError;
  }

  if (error instanceof UnsafePathError) {
    logger.warn('safety', error.message, { operation: context });
    return { code: error.code, message: error.message };
  }

  const err = error as NodeErrnoLike;
  const code = err?.code ?? 'UNKNOWN';
  const technical = err?.message ?? String(error);
  const message =
    NODE_ERROR_MESSAGES[code] ?? 'Something went wrong while accessing the filesystem.';

  logger.error('errors', technical, { operation: context, errorCode: code });

  return { code, message, technical };
}

export class AppOperationError extends Error {
  constructor(public readonly appError: AppError) {
    super(appError.message);
    this.name = 'AppOperationError';
  }
}
