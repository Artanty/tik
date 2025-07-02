import { Response } from 'express';
import { ConfigValidationError } from './config-validator';

export function handleError(res: Response, error: unknown) {
  if (error instanceof ConfigValidationError) {
    return res.status(400).json({
      error: error.message,
      code: error.rule,
      maxAllowedLength: 1024,
      allowedFormat: 'Alphanumeric with basic punctuation',
      docs: 'https://your-api-docs.com/config-validation'
    });
  }

  // Handle other known errors
  if (error instanceof SyntaxError) {
    return res.status(400).json({
      error: 'Invalid JSON configuration',
      code: 'INVALID_SYNTAX'
    });
  }

  // Fallback for unknown errors
  console.error('Unhandled error:', error);
  return res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    requestId: res.locals.requestId // Optional request tracking
  });
}