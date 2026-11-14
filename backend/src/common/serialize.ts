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
    const number = Number(value);
    return Number.isSafeInteger(number) ? number : value.toString();
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
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
        if (
          ['config', 'old_data', 'new_data'].includes(key) &&
          typeof entry === 'string'
        ) {
          try {
            return [key, toPlainValue(JSON.parse(entry))];
          } catch {
            /* Preserve non-JSON legacy text. */
          }
        }
        return [key, toPlainValue(entry)];
      }),
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
    return next.handle().pipe(map((data: unknown) => serialize(data)));
  }
}
