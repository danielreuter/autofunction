import { z } from "zod";

export type RuntimeErrorType =
  | "validation"
  | "internal"
  | "compiler"
  | "execution";

export type RuntimeErrorCode<T extends RuntimeErrorType> =
  T extends "validation"
    ?
        | "INPUT_VALIDATION_FAILURE"
        | "OUTPUT_VALIDATION_FAILURE"
        | "ERROR_VALIDATION_FAILURE"
    : T extends "internal"
      ? "INTERNAL_ERROR"
      : T extends "compiler"
        ? "COMPILER_ERROR"
        : T extends "execution"
          ? "UNEXPECTED_EXECUTION_ERROR" | "EXPECTED_EXECUTION_ERROR"
          : never;

export type RuntimeErrorData<T extends RuntimeErrorType> =
  T extends "validation"
    ? z.ZodIssue[]
    : T extends "internal"
      ? undefined
      : T extends "execution"
        ? any
        : T extends "compiler"
          ? undefined
          : never;

export type RuntimeErrorPayload<T extends RuntimeErrorType> = {
  code: RuntimeErrorCode<T>;
  message: string;
  cause?: unknown;
  data: RuntimeErrorData<T>;
};

export class RuntimeError<T extends RuntimeErrorType> extends Error {
  code: RuntimeErrorCode<T>;
  cause?: unknown;
  data: RuntimeErrorData<T>;

  constructor(payload: RuntimeErrorPayload<T>) {
    super(payload.message);
    this.name = "RuntimeError";
    this.code = payload.code;
    this.cause = payload.cause;
    this.data = payload.data;
  }

  static fromValidator(
    type: string,
    issues: z.ZodIssue[],
  ): RuntimeError<"validation"> {
    let code: RuntimeErrorCode<"validation">;
    let message: string;
    switch (type) {
      case "input":
        code = "INPUT_VALIDATION_FAILURE";
        message = "Failed to validate function input";
        break;
      case "output":
        code = "OUTPUT_VALIDATION_FAILURE";
        message = "Failed to validate function output";
        break;
      case "error":
        code = "ERROR_VALIDATION_FAILURE";
        message = "Failed to validate thrown error";
        break;
      default:
        throw new RuntimeError({
          code: "INTERNAL_ERROR",
          message: "Invalid validation error type",
          data: undefined,
        });
    }
    return new RuntimeError({
      code,
      message,
      data: issues,
    });
  }

  static fromExecutorExpected(data: any): RuntimeError<"execution"> {
    return new RuntimeError({
      code: "EXPECTED_EXECUTION_ERROR",
      message: "Execution error intentionally thrown",
      data,
    });
  }

  static fromExecutorUnexpected(error: unknown): RuntimeError<"execution"> {
    return new RuntimeError({
      code: "UNEXPECTED_EXECUTION_ERROR",
      message: "Unexpected execution error occurred",
      cause: error,
      data: undefined,
    });
  }

  static fromCompiler(
    message: string,
    cause?: unknown,
  ): RuntimeError<"compiler"> {
    return new RuntimeError({
      code: "COMPILER_ERROR",
      message,
      data: undefined,
      cause,
    });
  }

  static internal(message: string, cause?: unknown): RuntimeError<"internal"> {
    return new RuntimeError({
      code: "INTERNAL_ERROR",
      message,
      data: undefined,
      cause,
    });
  }

  serialize(): SerializedRuntimeError {
    let serializedCause: SerializedRuntimeError["cause"];
    if (this.cause instanceof Error) {
      serializedCause = {
        message: this.cause.message,
        name: this.cause.name,
        stack:
          "First section of the stack: " + this.cause.stack?.slice(0, 3000),
      };
    } else {
      serializedCause = { message: "Unknown error" };
    }

    return {
      code: this.code,
      message: this.message,
      cause: serializedCause,
      data: JSON.stringify(this.data, null, 2),
    };
  }

  static deserialize(data: SerializedRuntimeError): RuntimeError<any> {
    return new RuntimeError({
      code: data.code as any,
      message: data.message,
      cause: data.cause,
      data: JSON.parse(data.data),
    });
  }
}

export type SerializedRuntimeError = {
  code: string;
  message: string;
  cause?: {
    message?: string;
    name?: string;
    stack?: string;
  };
  data: string;
};
