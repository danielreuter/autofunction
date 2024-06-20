import { z } from "zod";
import { AnySpec, Spec } from "../shared/types";
import { hash } from "../shared/utils";
import { AnyFn, Fn, createFn } from "../function/function";
import { finished } from "stream/promises";
import { RuntimeError } from "../function/error";
import { FnRepository } from "../repository/repository";
import { AnyLibrary } from "./library";

export type Compiler = <TSpec extends AnySpec>(
  spec: TSpec,
) => (input: z.input<TSpec["in"]>) => Promise<z.output<TSpec["out"]>>;

export type CompileFn<TSpec extends AnySpec> = Fn<TSpec>["compile"];
export type AnyCompileFn = CompileFn<AnySpec>;

export type CompilerConfig<
  TCompileFn extends AnyCompileFn,
  TImports extends Record<string, AnyLibrary>,
> = {
  compile: TCompileFn;
  imports: TImports;
};

export function createConfig<
  TCompileFn extends AnyCompileFn,
  TImports extends Record<string, AnyLibrary>,
>({
  compile,
  imports,
}: {
  compile: TCompileFn;
  imports: TImports;
}): CompilerConfig<TCompileFn, TImports> {
  return { compile, imports };
}

export type AnyCompilerConfig = CompilerConfig<any, any>;

export class CompilerBuilder<
  TCompileFn extends AnyCompileFn,
  TImports extends Record<string, AnyLibrary>,
  TConfig extends AnyCompilerConfig = CompilerConfig<TCompileFn, TImports>,
> {
  constructor(
    public workspace: FnRepository,
    public config: TConfig,
  ) {}

  compile(fn: AnyCompileFn): CompilerBuilder<AnyCompileFn, TImports> {
    return new CompilerBuilder(this.workspace, { ...this.config, compile: fn });
  }

  import<TLibrary extends AnyLibrary>(
    library: TLibrary,
  ): CompilerBuilder<
    TCompileFn,
    TImports & { [key in keyof TLibrary["name"]]: TLibrary }
  > {
    return new CompilerBuilder(this.workspace, {
      ...this.config,
      imports: {
        ...this.config.imports,
        [library.name]: library,
      },
    });
  }

  build(): Compiler {
    return (spec) => {
      const fn = createFn({ spec, ...this.config });
      this.workspace.declareFn(fn as any);
      return async (input) => {
        const execute = await this.workspace.requestExecutor(fn.id);
        const result = await execute(input);
        if (result.success) return result.output;
        throw new RuntimeError(result.error);
      };
    };
  }
}
