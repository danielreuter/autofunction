import { z } from "zod";
import { AnyLibrary } from "../compiler/library";
import { AnySpec, ProcessedSpec } from "../shared/types";
import { modToJsonSchema } from "../mod/modToJsonSchema";

export function processSpec<TSpec extends AnySpec>(
  spec: TSpec,
  imports: Record<string, AnyLibrary>,
): ProcessedSpec {
  const processedImports = Object.entries(imports ?? {}).reduce(
    (acc, [_, { name, documentation }]) => ({
      ...acc,
      [name]: z.object(documentation),
    }),
    {} as any,
  );
  // todo: add errors
  // processedImports["createError"] = z.function()
  return {
    ...spec,
    toString() {
      return JSON.stringify(modToJsonSchema(this.fullSpec));
    },
    imports,
    arguments: Object.keys(processedImports),
    fullSpec: z
      .function()
      .describe(`A function that does the following: ${spec.do}`)
      .args(
        z
          .object({
            input: spec.in,
            ...processedImports,
          })
          .describe("`input` will be prevalidated."),
      )
      .returns(spec.out.promise()),
  };
}
