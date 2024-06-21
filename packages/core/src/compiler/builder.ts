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
  manualOverride?: (input: z.input<TSpec["in"]>) => Promise<z.output<TSpec["out"]>>
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
  config: TConfig

  constructor(
    public repo: FnRepository,
    config?: TConfig,
  ) {
    // todo - use TS to enforce minimum viability
    if (config) {
      this.config = config;
    } else {
      this.config = createConfig({
        compile: async () => {
          throw new Error("No compile function provided");
        },
        imports: {},
      }) as any;
    }
  }

  compile(fn: AnyCompileFn): CompilerBuilder<AnyCompileFn, TImports> {
    return new CompilerBuilder(this.repo, { ...this.config, compile: fn });
  }

  import<TLibrary extends AnyLibrary>(
    library: TLibrary,
  ): CompilerBuilder<
    TCompileFn,
    TImports & { [key in keyof TLibrary["name"]]: TLibrary }
  > {
    return new CompilerBuilder(this.repo, {
      ...this.config,
      imports: {
        ...this.config.imports,
        [library.name]: library,
      },
    });
  }

  build(): Compiler {
    return (spec, manualOverride) => {
      if (manualOverride) return manualOverride;
      const fn = createFn({ spec, ...this.config });
      const executorPromise = this.repo.declareFn(fn as any);
      return async (input) => {
        const execute = await executorPromise;
        const result = await execute(input);
        if (result.success) return result.output;
        throw new RuntimeError(result.error);
      };
    };
  }
}

/**
 * 
 * @param param0 Settings, including the path to the repository
 * @returns A compiler builder
 */
export function createCompiler({ path }: { path: string }) {
  const repo = new FnRepository({ path, test: false });
  return (config?: AnyCompilerConfig) => {
    return new CompilerBuilder(repo, config)
  }
}