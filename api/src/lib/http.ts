import type { ErrorRequestHandler, Request } from 'express';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import { logger } from './logger';

/** Error that maps to an RFC 9457 problem response. `code` is a stable, translatable key. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export function parse<S extends ZodTypeAny>(schema: S, value: unknown): z.infer<S> {
  return schema.parse(value);
}

export const body = <S extends ZodTypeAny>(req: Request, schema: S): z.infer<S> =>
  parse(schema, req.body);

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const traceId = String(req.id ?? '');
  if (err instanceof ZodError) {
    res.status(400).type('application/problem+json').json({
      type: 'about:blank',
      title: 'Validation failed',
      status: 400,
      code: 'validation_failed',
      errors: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      traceId,
    });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).type('application/problem+json').json({
      type: 'about:blank',
      title: err.message,
      status: err.status,
      code: err.code,
      traceId,
    });
    return;
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ type: 'about:blank', title: 'Malformed JSON', status: 400, code: 'bad_json', traceId });
    return;
  }
  logger.error({ err, traceId }, 'unhandled error');
  res.status(500).type('application/problem+json').json({
    type: 'about:blank',
    title: 'Internal error',
    status: 500,
    code: 'internal',
    traceId,
  });
};
