import { Code } from "./code";
import { RuntimeError } from "./error";
import { AnySpec } from "../shared/types";
import { TestResult } from "../compiler/tester";

export type FnSnapshotSuccess = {
  do: string;
  status: "success";
  code: Code;
  iterations: FnIteration<any>[];
};

export type FnSnapshotFailure = {
  do: string;
  status: "failure";
  error: RuntimeError<any>;
  iterations: FnIteration<any>[];
};

export type FnSnapshotCompiling = {
  do: string;
  status: "compiling";
};

export type FnSnapshot =
  | FnSnapshotSuccess
  | FnSnapshotFailure
  | FnSnapshotCompiling;

export type FnIteration<TSpec extends AnySpec> = {
  code?: Code;
  results?: Array<TestResult<TSpec>>;
};
