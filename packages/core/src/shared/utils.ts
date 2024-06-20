import { createHash } from "crypto";
import { z } from "zod";
import { AnySpec } from "./types";
import { modToJsonSchema } from "../mod/modToJsonSchema";

export function hash(schemas: z.ZodTypeAny[], strings?: string[]): string {
  const hash = createHash("sha256");
  hash.update(
    JSON.stringify({
      schemas: schemas.map((schema) => modToJsonSchema(schema)),
      strings,
    }),
  );
  return hash.digest("hex");
}

export function hashSpec(spec: AnySpec): string {
  return hash([spec.in, spec.out, ...(spec.err ? [spec.err] : [])], [spec.do]);
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function stripOuterFunction(code: string) {
  return code.split("\n").slice(1, -1).join("\n");
}

export type OneOrMany<T> = T | T[];

export type Update<T, TUpdate> = Simplify<
  {
    [K in Exclude<keyof T, keyof TUpdate>]: T[K];
  } & TUpdate
>;

export type Simplify<T> = {
  // @ts-ignore - "Type parameter 'K' has a circular constraint", not sure why
  [K in keyof T]: T[K];
} & {};

export type SimplifyMappedType<T> = [T] extends [unknown] ? T : never;

export type ShallowRecord<K extends keyof any, T> = SimplifyMappedType<{
  [P in K]: T;
}>;

export type Assume<T, U> = T extends U ? T : U;

export type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

export interface CompilerTypeError<T extends string> {
  $compilerTypeError: T;
}

export type Or<T1, T2> = T1 extends true
  ? true
  : T2 extends true
    ? true
    : false;

export type IfThenElse<If, Then, Else> = If extends true ? Then : Else;

export type PromiseOf<T> = T extends Promise<infer U> ? U : T;

export type Writable<T> = {
  -readonly [P in keyof T]: T[P];
};

export type ValidateShape<T, ValidShape, TResult = T> = T extends ValidShape
  ? Exclude<keyof T, keyof ValidShape> extends never
    ? TResult
    : CompilerTypeError<`Invalid key(s): ${Exclude<
        keyof T & (string | number | bigint | boolean | null | undefined),
        keyof ValidShape
      >}`>
  : never;

export type KnownKeysOnly<T, U> = {
  [K in keyof T]: K extends keyof U ? T[K] : never;
};

export type IsAny<T> = 0 extends 1 & T ? true : false;
