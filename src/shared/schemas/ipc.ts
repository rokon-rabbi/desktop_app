import { z } from 'zod';
import { FILE_CATEGORIES } from '@shared/constants';

/** A non-empty, absolute Linux path. Deeper safety checks happen in `main/safety/paths.ts`. */
export const absolutePathSchema = z
  .string()
  .min(1, 'Path must not be empty')
  .refine((p) => p.startsWith('/'), 'Path must be absolute');

export const scanIdSchema = z.string().uuid();
export const operationIdSchema = z.string().uuid();

export const scanStartSchema = z.object({
  rootPath: absolutePathSchema
});

export const scanFilesQuerySchema = z.object({
  scanId: scanIdSchema,
  search: z.string().max(500).optional(),
  category: z.enum([...FILE_CATEGORIES, 'All']).optional(),
  sortBy: z.enum(['name', 'size', 'modified', 'category']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(500).optional()
});

export const cleanupPlanRequestSchema = z.object({
  scanId: scanIdSchema,
  targetBytes: z.number().finite().positive()
});

export const organizePreviewRequestSchema = z.object({
  scanId: scanIdSchema
});

export const organizeMoveSchema = z.object({
  id: z.string(),
  sourcePath: absolutePathSchema,
  destinationPath: absolutePathSchema,
  category: z.enum(FILE_CATEGORIES),
  reason: z.string(),
  sizeBytes: z.number().nonnegative(),
  collision: z.boolean()
});

export const organizeApplyRequestSchema = z.object({
  moves: z.array(organizeMoveSchema).min(1).max(100000)
});

export const trashItemSchema = z.object({
  path: absolutePathSchema,
  sizeBytes: z.number().nonnegative()
});

export const trashSendRequestSchema = z.object({
  items: z.array(trashItemSchema).min(1).max(100000)
});

export const monitoringPathSchema = z.object({
  path: absolutePathSchema
});

export const settingsUpdateSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  monitoredFolders: z.array(absolutePathSchema).optional(),
  defaultScanRoots: z.array(absolutePathSchema).optional(),
  confirmBeforeApply: z.boolean().optional()
});
