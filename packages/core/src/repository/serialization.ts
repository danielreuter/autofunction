import { Code } from "../function/code";
import { RuntimeError } from "../function/error";
import { FnIteration } from "../function/data";
import { Trace } from "../function/trace";
import { ExecutionResult } from "../shared/types";
import { TestResult } from "../function";

export function serializeFnIteration(iteration: FnIteration<any>) {
  return {
    code: iteration.code?.serialize(),
    results: iteration.results?.map(serializeTestResult),
  };
}

export type SerializedFnIteration = ReturnType<typeof serializeFnIteration>;

export function deserializeFnIteration({
  code,
  results,
}: SerializedFnIteration): FnIteration<any> {
  return {
    code: code ? new Code(code) : undefined,
    results: results?.map(deserializeTestResult),
  };
}

export function serializeExecutionResult(result: ExecutionResult<any>) {
  return {
    ...result,
    output: JSON.stringify(result.output, null, 2),
    trace: { logs: result.trace.logs },
    error: result.error?.serialize(),
  };
}

export type SerializedExecutionResult = ReturnType<
  typeof serializeExecutionResult
>;

export function deserializeExecutionResult(
  data: SerializedExecutionResult,
): ExecutionResult<any> {
  return {
    ...data,
    output: JSON.parse(data.output),
    trace: new Trace(data.trace.logs),
    error: data.error ? RuntimeError.deserialize(data.error) : null,
  } as any; // todo
}

export function serializeTestResult(result: TestResult<any>) {
  const { id, description, testId, codeId, ...rest } = result;
  return {
    id,
    description,
    testId,
    codeId,
    data: serializeExecutionResult(rest),
  };
}

export type SerializedTestResult = ReturnType<typeof serializeTestResult>;

export function deserializeTestResult({
  id,
  description,
  testId,
  codeId,
  data,
}: SerializedTestResult): TestResult<any> {
  return {
    id,
    description,
    testId,
    codeId,
    ...deserializeExecutionResult(data),
  };
}
