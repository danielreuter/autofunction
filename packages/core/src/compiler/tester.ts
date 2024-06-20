import { z } from "zod";
import {
  AnySpec,
  ExecutionResult,
  Serializable,
  Serialized,
  Spec,
} from "../shared/types";
import { ProcessedSpec } from "../shared/types";
import { randomUUID } from "crypto";
import { Fn } from "../function/function";
import { Code } from "../function/code";
import { trace } from "console";
import { FnIteration } from "../function";

export class Test<TSpec extends AnySpec = AnySpec> extends Serializable<{
  id: string;
  input: string;
  description: string;
}> {
  id: string;
  input: z.infer<TSpec["in"]>;
  description: string;

  constructor({
    id,
    input,
    description,
  }: {
    id: string;
    input: z.infer<TSpec["in"]>;
    description: string;
  }) {
    super();
    this.id = id;
    this.input = input;
    this.description = description;
  }

  serialize() {
    return {
      id: this.id,
      input: JSON.stringify(this.input, null, 2),
      description: this.description,
    };
  }

  static deserialize(data: Serialized<Test<AnySpec>>): Test<AnySpec> {
    return new Test({
      id: data.id,
      input: JSON.parse(data.input),
      description: data.description,
    });
  }
}

export type TestSchema<TSpec extends AnySpec> = z.ZodObject<{
  input: TSpec["in"];
  description: z.ZodString;
}>;

function createTestSchema<TSpec extends AnySpec>(
  spec: TSpec,
): TestSchema<TSpec> {
  return z.object({
    input: spec.in,
    description: z.string().describe("A description of the test case"),
  }) as any;
}

export type TestResult<TSpec extends AnySpec = AnySpec> = {
  id: string;
  description: string;
  testId: string;
  codeId: string;
} & ExecutionResult<TSpec>;

type TestHandlers<TSpec extends AnySpec> = {
  handleAddTest: (test: Test<TSpec>) => void;
  // handleTestResult: (result: TestResult<TSpec>) => void;
  handleIteration: (iteration: FnIteration<any>) => void;
};

export class Tester<TSpec extends AnySpec> {
  tests: Test<TSpec>[];

  _: {
    fn: Fn<TSpec>;
    handlers: TestHandlers<TSpec>;
  };

  history: {
    toString(): string;
    iterations: Array<{
      code: Code;
      results: TestResult<TSpec>[];
    }>;
  } = {
    toString() {
      if (this.iterations.length === 0) return "";
      return (
        `
        Here are your previous iterations:
      ` +
        this.iterations
          .map(({ code, results }, i) => {
            return `
          Iteration: ${i + 1}
          Code: ${code.fn}
          Tests: ${results.map((result) => {
            return `
              ${result.success ? "✅ Success" : "❌ Failure"}
              Trace: ${result.trace}
            `;
          })}
        `;
          })
          .join("\n")
      );
    },
    iterations: [],
  };

  constructor(
    fn: Fn<TSpec>,
    handlers: TestHandlers<TSpec>,
    initialTests: Test<TSpec>[],
  ) {
    this._ = {
      fn,
      handlers,
    };
    this.tests = initialTests;
    for (const test of initialTests) {
      this._.handlers.handleAddTest(test);
    }
  }

  async test(code: Code): Promise<TestResult<TSpec>[]> {
    const execute = this._.fn.createExecutor(code);
    const results = await Promise.all(
      this.tests.map(async (test) => {
        const result = await execute(test.input);
        const testResult = {
          id: randomUUID(),
          testId: test.id,
          codeId: code.id,
          ...result,
        };
        return testResult;
      }),
    );
    this.history.iterations.push({ code, results });
    this._.handlers.handleIteration({ code, results });
    return results;
  }
}

export function createTesterInitializer<TSpec extends Spec>(
  fn: Fn<TSpec>,
  handlers: TestHandlers<any>,
) {
  return async (
    generate: (
      schema: any, // todo: not working, TestSchema<TProcessedSpec>,
    ) => Promise<Omit<Test<TSpec>, "id">[]>,
  ): Promise<Tester<TSpec>> => {
    const testSchema = createTestSchema(fn.fullSpec);
    const rawTests = await generate(testSchema);
    const tests = rawTests.map((rawTest) => {
      const id = randomUUID();
      return { ...rawTest, id };
    });
    return new Tester(fn, handlers, tests);
  };
}
