import { Fn, AnyFn } from "../function/function";
import { createParser } from "../compiler/compile";
import { createTesterInitializer } from "../compiler/tester";
import { randomUUID } from "crypto";
import { FnCache } from "./cache";
import { RuntimeError } from "../function/error";
import {
  AnyCompilerConfig,
  CompilerBuilder,
  CompilerConfig,
} from "../compiler/builder";
import { Code } from "../function/code";
import { FnIteration } from "../function/data";
import { sleep } from "../shared/utils";

export class FnRepository {
  cache: Promise<FnCache>;
  fns: Record<string, AnyFn>;

  constructor({ path, test }: { path: string; test: boolean }) {
    this.cache = FnCache.create(path, test);
    this.fns = {};

    // Wait briefly then write new fn declarations to disk
    const delay = sleep(50);
    this.cache.then(async (cache) => {
      await delay;
      cache.writeData();
    });
  }

  async getFnCode(id: string): Promise<Code | undefined> {
    const cache = await this.cache;
    const snapshot = await cache.get(id);
    if (snapshot?.status === "success") {
      return snapshot.code;
    }
  }

  async declareFn(fn: AnyFn) {
    this.fns[fn.id] = fn;

    // Compile declared fn if code DNE
    const code = await this.getFnCode(fn.id);
    if (code) {
      return fn.createExecutor(code);
    } else {
      await this.runCompile(fn);
    }
  }

  async requestExecutor(fnId: string) {
    const fn = this.fns[fnId];
    const code = await this.getFnCode(fnId);
    if (code) {
      return fn.createExecutor(code);
    } else {
      await this.runCompile(fn);
      // todo: sketchy auto-recompilation
      const newCode = await this.getFnCode(fnId);
      if (!newCode) {
        // this is obscuring deeper errors
        throw RuntimeError.internal(
          "Recompilation succeeded but didn't properly write code",
        );
      }
      return fn.createExecutor(newCode);
    }
  }

  createCompiler(config: AnyCompilerConfig) {
    return new CompilerBuilder(this, config);
  }

  /**
   * Runs the compilation process for a given function.
   * - Locks the cache until completion, eventually writing
   *   the event batch.
   * - Emits events at each compilation step.
   *
   * @param fn - The function to compile.
   */
  async runCompile(fn: AnyFn) {
    const cache = await this.cache;
    await cache.lock(
      fn.id,
      async () => {
        const iterations: FnIteration<any>[] = [];
        const spec = fn.fullSpec;

        // Inject event emitters to track compiler operations
        const parse = createParser(spec, {
          handleSuccess: (code) => {
            // push({ type: "add-code", code });
          },
        });

        const createTester = createTesterInitializer(fn, {
          handleAddTest: (test) => {
            // push({ type: "add-test", test });
          },
          handleIteration: iterations.push,
        });

        try {
          const code = await fn.compile({ spec, parse, createTester });
          return { status: "success", do: fn.fullSpec.do, code, iterations };
        } catch (err) {
          let error: RuntimeError<any>;
          if (err instanceof RuntimeError) error = err;
          else error = RuntimeError.fromCompiler("Failed to compile", err);
          return { status: "failure", do: fn.fullSpec.do, error, iterations };
        }
      },
      {
        status: "compiling",
        do: fn.fullSpec.do,
      },
    );
  }

  static create({ path }: { path: string }): FnRepository {
    return new FnRepository({ path, test: false });
  }
}

export const createRepository = FnRepository.create;
