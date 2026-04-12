import type { Response } from 'express';

export class InsufficientSparksError extends Error {
  readonly code = 'INSUFFICIENT_SPARKS' as const;

  constructor(
    message: string,
    readonly required: number,
    readonly available: number
  ) {
    super(message);
    this.name = 'InsufficientSparksError';
  }
}

export const isInsufficientSparksError = (e: unknown): e is InsufficientSparksError =>
  e instanceof InsufficientSparksError;

export const sendInsufficientSparks = (res: Response, err: InsufficientSparksError) =>
  res.status(402).json({
    error: err.message,
    code: err.code,
    required: err.required,
    available: err.available,
  });
