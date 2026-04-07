import {
  type PipeTransform,
  type ArgumentMetadata,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import type { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema?: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    const schema = this.schema ?? (metadata.metatype as any)?.schema;

    if (!schema) return value;

    const result = schema.safeParse(value);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: result.error.issues,
      });
    }

    return result.data;
  }
}
