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
import { FnIteration, Snapshot } from "../function/data";
import { sleep } from "../shared/utils";

export class FnRepository {
  cache: Promise<FnCache>;
  fns: Record<string, AnyFn>;

  constructor({ path, test, log }: { path: string; test: boolean, log?: boolean }) {
    this.cache = FnCache.create(path, test, log);
    this.fns = {};

    // Wait briefly then write new fn declarations to disk
    const delay = sleep(50);
    this.cache.then(async (cache) => {
      await delay;
      cache.writeData();
    });
  }

  async declareFn(fn: AnyFn) {
    this.fns[fn.id] = fn;
    const cache = await this.cache;
    const snapshot = await cache.get(fn.id);
    if (!snapshot) {
      const code = await this.runCompile(fn);
      return fn.createExecutor(code);
    } else {
      switch (snapshot.status) {
        case "success":
          return fn.createExecutor(snapshot.code);
        case "failure":
          throw snapshot.error;
        default:
          throw RuntimeError.internal("Failed to declare function");
      }
    }
  }

  /**
   * Runs the compilation process for a given function.
   * - Locks the cache until completion, eventually writing
   *   the event batch.
   * - Emits events at each compilation step.
   *
   * @param fn - The function to compile.
   */
  async runCompile(fn: AnyFn): Promise<Code> {
    const cache = await this.cache;
    const snapshot = await cache.lock(
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
          return Snapshot.success({ do: fn.fullSpec.do, code, iterations });
        } catch (err) {
          let error: RuntimeError<any>;
          if (err instanceof RuntimeError) error = err;
          else error = RuntimeError.fromCompiler("Failed to compile", err);
          return Snapshot.failure({ do: fn.fullSpec.do, error, iterations });
        }
      },
      Snapshot.compiling({ do: fn.fullSpec.do }),
    );

    switch (snapshot.status) {
      case "success":
        return snapshot.code;
      case "failure":
        throw snapshot.error;
      default:
        throw RuntimeError.internal("Compiling status stuck in limbo");
    }
  }

  static create({ path }: { path: string }): FnRepository {
    return new FnRepository({ path, test: false });
  }
}

export const createRepository = FnRepository.create;
