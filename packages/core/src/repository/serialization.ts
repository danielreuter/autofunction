import { Code } from "../function/code";
import { RuntimeError } from "../function/error";
import { FnIteration, FnSnapshot } from "../function/data";
import { Trace } from "../function/trace";
import { ExecutionResult } from "../shared/types";
import { TestResult } from "../function";
import { FnDisk } from "./cache";

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

export function serializeFnSnapshot(snapshot: FnSnapshot) {
  switch (snapshot.status) {
    case "success":
      return {
        ...snapshot,
        iterations: snapshot.iterations.map(serializeFnIteration),
      };
    case "failure":
      return {
        ...snapshot,
        iterations: snapshot.iterations.map(serializeFnIteration),
        error: snapshot.error.serialize(),
      };
    case "compiling":
      return snapshot;
  }
}

export type SerializedFnSnapshot = ReturnType<typeof serializeFnSnapshot>;

export function deserializeFnSnapshot(data: SerializedFnSnapshot): FnSnapshot {
  switch (data.status) {
    case "success":
      return {
        ...data,
        iterations: data.iterations.map(deserializeFnIteration),
      };
    case "failure":
      return {
        ...data,
        iterations: data.iterations.map(deserializeFnIteration),
        error: RuntimeError.deserialize(data.error),
      };
    case "compiling":
      return data;
  }
}

export function serializeDisk({ data, metadata }: FnDisk) {
  return {
    metadata,
    data: Object.fromEntries(
      Object.entries(data).map(([id, snapshot]) => [
        id,
        serializeFnSnapshot(snapshot),
      ]),
    ),
  };
}

export type SerializedDisk = ReturnType<typeof serializeDisk>;

export function deserializeDisk({ data, metadata }: SerializedDisk): FnDisk {
  return {
    metadata,
    data: Object.fromEntries(
      Object.entries(data).map(([id, snapshot]) => [
        id,
        deserializeFnSnapshot(snapshot),
      ]),
    ),
  };
}