import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseBigIntPipe implements PipeTransform<string, bigint> {
  transform(value: string): bigint {
    if (
      !/^[1-9]\d{0,18}$/.test(value) ||
      BigInt(value) > 9223372036854775807n
    ) {
      throw new BadRequestException(
        'Mã định danh phải là số nguyên dương trong phạm vi cho phép.',
      );
    }
    return BigInt(value);
  }
}
