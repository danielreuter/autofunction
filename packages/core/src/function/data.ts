import { Code } from "./code";
import { RuntimeError } from "./error";
import { AnySpec } from "../shared/types";
import { TestResult } from "../compiler/tester";

export type FnSnapshotSuccess = {
  do: string;
  timestamp: number;
  status: "success";
  code: Code;
  iterations: FnIteration<any>[];
};

export type FnSnapshotFailure = {
  do: string;
  timestamp: number;
  status: "failure";
  error: RuntimeError<any>;
  iterations: FnIteration<any>[];
};

export type FnSnapshotCompiling = {
  do: string;
  timestamp: number;
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

export class Snapshot {
  constructor() {}

  static success(
    data: Omit<FnSnapshotSuccess, "status" | "timestamp">,
  ): FnSnapshotSuccess {
    return {
      ...data,
      status: "success",
      timestamp: Date.now(),
    };
  }

  static failure(
    data: Omit<FnSnapshotFailure, "status" | "timestamp">,
  ): FnSnapshotFailure {
    return {
      ...data,
      status: "failure",
      timestamp: Date.now(),
    };
  }

  static compiling(
    data: Omit<FnSnapshotCompiling, "status" | "timestamp">,
  ): FnSnapshotCompiling {
    return {
      ...data,
      status: "compiling",
      timestamp: Date.now(),
    };
  }
}
