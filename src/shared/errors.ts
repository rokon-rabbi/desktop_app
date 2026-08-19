import type { AppError } from './types';

/** Thrown in the renderer when an IPC call's IpcResult has success: false. */
export class CleanSpaceIpcError extends Error {
  code: string;
  technical: string | undefined;

  constructor(appError: AppError) {
    super(appError.message);
    this.name = 'CleanSpaceIpcError';
    this.code = appError.code;
    this.technical = appError.technical;
  }
}
