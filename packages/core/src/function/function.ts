import { z } from "zod";
import { Code } from "./code";
import { AnyLibrary } from "../compiler/library";
import { AnySpec, ExecutionResult, ProcessedSpec } from "../shared/types";
import { createParser } from "../compiler/compile";
import { createTesterInitializer } from "../compiler/tester";
import { processSpec } from "./spec";
import { hashSpec, stripOuterFunction } from "../shared/utils";
import { RuntimeError } from "./error";
import { Trace } from "./trace";

export type CompileFnArgs<TSpec extends AnySpec> = {
  spec: TSpec;
  parse: ReturnType<typeof createParser>;
  // @ts-ignore self-reference
  createTester: ReturnType<typeof createTesterInitializer>;
};

export type Fn<TSpec extends AnySpec> = {
  id: string;
  fullSpec: ProcessedSpec;
  compile: (args: CompileFnArgs<TSpec>) => Promise<Code>;
  createExecutor: (
    code: Code,
  ) => (input: z.input<TSpec["in"]>) => Promise<z.output<TSpec["out"]>>;
};

export type AnyFn = Fn<AnySpec>;

export function createFn<TSpec extends AnySpec>({
  spec,
  imports,
  compile,
}: {
  spec: TSpec;
  imports: Record<string, AnyLibrary>;
  compile: (args: CompileFnArgs<TSpec>) => Promise<Code>;
}): Fn<TSpec> {
  const fullSpec = processSpec(spec, imports);
  return {
    id: hashSpec(spec),
    fullSpec,
    compile,
    createExecutor(code) {
      return async function execute(
        unvalidatedInput,
      ): Promise<ExecutionResult<TSpec>> {
        const trace = new Trace();

        const inputParseResult = spec.in.safeParse(unvalidatedInput);
        if (!inputParseResult.success) {
          const error = RuntimeError.fromValidator(
            "input",
            inputParseResult.error.issues,
          );
          return {
            success: false,
            output: null,
            error,
            input: unvalidatedInput,
            trace,
          };
        }
        const input = inputParseResult.data;

        const fn = new Function(
          "arg",
          `const { input, ${fullSpec.arguments.join(", ")} } = arg;
          ${stripOuterFunction(code.fn)}`,
        );

        try {
          const unvalidatedOutput = await fn({
            input,
            ...Object.values(imports).reduce((acc, { name, items }) => {
              acc[name] = items;
              return acc;
            }, {} as any),
          });
          const outputParseResult = spec.out.safeParse(unvalidatedOutput);
          if (!outputParseResult.success) {
            const error = RuntimeError.fromValidator(
              "output",
              outputParseResult.error.issues,
            );
            return { success: false, output: null, error, input, trace };
          }
          const output = outputParseResult.data;
          return { success: true, output, error: null, input, trace };
        } catch (e) {
          const error = RuntimeError.fromExecutorUnexpected(e);
          return { success: false, output: null, error, input, trace };
        }
      };
    },
  };
}
