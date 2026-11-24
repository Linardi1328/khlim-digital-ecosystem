import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
} from "@nestjs/common";

export interface RegistrationFieldError {
  field: string;
  code: string;
}

export interface RegistrationErrorExtra {
  fieldErrors?: RegistrationFieldError[];
  details?: Record<string, string | number | boolean | null>;
  retryAfter?: number;
}

/**
 * Machine-readable API error. `code` is the stable localization key;
 * `message` is English developer text and must never contain submitted data.
 */
export class RegistrationApiException extends HttpException {
  readonly code: string;

  constructor(
    status: number,
    code: string,
    message: string,
    extra: RegistrationErrorExtra = {},
  ) {
    super({ statusCode: status, code, message, ...extra }, status);
    this.code = code;
  }
}

export function validationFailed(
  fieldErrors: RegistrationFieldError[],
): RegistrationApiException {
  return new RegistrationApiException(
    400,
    "VALIDATION_FAILED",
    "Request validation failed",
    { fieldErrors },
  );
}

export function persistenceFailed(): RegistrationApiException {
  return new RegistrationApiException(
    503,
    "REGISTRATION_PERSISTENCE_FAILED",
    "The request could not be saved. Retry with the same idempotency key.",
    { retryAfter: 30 },
  );
}

export function temporarilyUnavailable(
  retryAfter = 30,
): RegistrationApiException {
  return new RegistrationApiException(
    503,
    "SERVICE_TEMPORARILY_UNAVAILABLE",
    "Service temporarily unavailable",
    { retryAfter },
  );
}

interface ResponseLike {
  setHeader(name: string, value: string): void;
  status(code: number): { json(body: unknown): void };
}

/** Adds `Retry-After` and renders the coded body for registration errors only. */
@Catch(RegistrationApiException)
export class RegistrationExceptionFilter implements ExceptionFilter {
  catch(exception: RegistrationApiException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<ResponseLike>();
    const body = exception.getResponse() as { retryAfter?: number };
    if (
      typeof body.retryAfter === "number" &&
      Number.isInteger(body.retryAfter) &&
      body.retryAfter > 0
    ) {
      response.setHeader("Retry-After", String(body.retryAfter));
    }
    response.status(exception.getStatus()).json(body);
  }
}

/**
 * Converts any unexpected failure (Prisma/pg errors can embed submitted data in
 * their messages) into a code-only exception. Only fixed database trigger codes
 * are recognised; the original error is never logged, rethrown or attached.
 */
export function sanitizeDatabaseError(
  error: unknown,
): RegistrationApiException {
  if (error instanceof RegistrationApiException) return error;
  const text = error instanceof Error ? error.message : "";
  const mapped: Array<[string, number, string]> = [
    ["CAPACITY_EXCEEDED", 409, "CAPACITY_EXCEEDED"],
    ["CAPACITY_BELOW_CONFIRMED", 409, "CAPACITY_BELOW_CONFIRMED"],
    ["INVALID_TRANSITION", 409, "INVALID_TRANSITION"],
    ["SESSION_NOT_AVAILABLE", 409, "SESSION_NOT_AVAILABLE"],
    ["SESSION_INCOMPLETE", 409, "SESSION_INCOMPLETE"],
    ["OFFERING_REGISTRATION_ONLY", 409, "OFFERING_REGISTRATION_ONLY"],
    ["OFFERING_HAS_LEGACY_USAGE", 409, "OFFERING_HAS_LEGACY_USAGE"],
  ];
  for (const [needle, status, code] of mapped) {
    if (text.includes(needle)) {
      return new RegistrationApiException(status, code, "Operation refused");
    }
  }
  return persistenceFailed();
}

export async function withSanitizedErrors<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof HttpException) throw error;
    throw sanitizeDatabaseError(error);
  }
}
