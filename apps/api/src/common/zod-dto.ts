import type { z } from 'zod';

export function createZodDto<T extends z.ZodType>(schema: T) {
  class ZodDto {
    static schema = schema;

    static create(input: unknown): z.infer<T> {
      return schema.parse(input);
    }
  }

  return ZodDto as unknown as {
    new (): z.infer<T>;
    schema: T;
    create(input: unknown): z.infer<T>;
  };
}
