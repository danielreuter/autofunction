import { Compiler } from "autofunction";
import { z } from "zod";
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function pipeline<
  TIn extends z.ZodTypeAny,
  TSchemas extends [z.ZodTypeAny, ...z.ZodTypeAny[]]
>(compiler: Compiler, schemas: TSchemas) {
  return async (input: z.input<TIn>) => {
    let currentInputSchema = schemas[0] as z.ZodTypeAny;
    let current = currentInputSchema.parse(input);
    for (const schema of schemas) {
      const transformFn = compiler({
        do: "",
        in: currentInputSchema,
        out: schema
      })
      current = await transformFn(current);
      currentInputSchema = schema;
    }
    return current;
  }
}

