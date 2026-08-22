import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function toPlainValue(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (
    value &&
    typeof value === 'object' &&
    'toJSON' in value &&
    typeof (value as { toJSON?: unknown }).toJSON === 'function'
  ) {
    return (value as { toJSON: () => unknown }).toJSON();
  }

  if (Array.isArray(value)) {
    return value.map(toPlainValue);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(
        ([key, entry]) => [key, toPlainValue(entry)],
      ),
    );
  }

  return value;
}

export const serialize = <T>(value: T): T => {
  return toPlainValue(value) as T;
};

@Injectable()
export class SerializeInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((data) => serialize(data)),
    );
  }
}