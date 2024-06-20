import { ZodPromiseDef } from "zod";
import { JsonSchema7Type, parseDef } from "../parseDef";
import { Refs } from "../Refs";

export function parsePromiseDef(
  def: ZodPromiseDef,
  refs: Refs,
): (JsonSchema7Type & { promise: true }) | undefined {
  const innerSchema = parseDef(def.type._def, refs);
  if (!innerSchema) return undefined;
  return {
    ...innerSchema,
    promise: true,
  };
}
