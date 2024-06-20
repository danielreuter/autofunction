import { z } from "zod";
import { Simplify } from "./utils";
import { AnyLibrary } from "../compiler/library";
import { RuntimeError } from "../function/error";
import { Trace } from "../function/trace";

export abstract class Serializable<S> {
  readonly serialized!: Simplify<S>;
  abstract serialize(): Simplify<S>;
}

export type Serialized<T> =
  T extends Serializable<any> ? T["serialized"] : never;

export type Spec<TIn extends z.ZodTypeAny = z.ZodTypeAny> = {
  do: string;
  in: TIn;
  out: z.ZodTypeAny;
  err?: z.ZodTypeAny | undefined;
};

export type ProcessedSpec<TSpec extends Spec = Spec> = TSpec & {
  toString(): string;
  imports: Record<string, AnyLibrary>;
  arguments: string[];
  fullSpec: z.ZodFunction<any, any>;
};

export type AnySpec = Spec;

export type ExecutionResult<TSpec extends AnySpec> = Simplify<
  {
    input: z.input<TSpec["in"]>;
    trace: Trace;
  } & (
    | {
        success: true;
        output: z.output<TSpec["out"]>;
        error: null;
      }
    | {
        success: true;
        output: null;
        error: RuntimeError<any>; // todo: type this
      }
    | {
        success: false;
        output: null;
        error: RuntimeError<any>;
      }
  )
>;

type InferIfDefined<T extends z.ZodTypeAny | undefined> = T extends z.ZodTypeAny
  ? z.output<T>
  : undefined;

export type AnyTrace = Trace;

export interface DefaultLog {
  type: string;
  message: string;
}
