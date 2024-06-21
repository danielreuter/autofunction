import { z } from "zod";

export type Library<
  TName extends string,
  TKeys extends string,
  TDocumentation extends Record<TKeys, z.ZodTypeAny>,
> = {
  name: TName;
  items: {
    [K in TKeys]: z.infer<TDocumentation[K]>;
  };
  documentation: TDocumentation;
};

export type AnyLibrary = Library<any, any, any>;

export function library<
  TName extends string,
  TKeys extends string,
  TDocumentation extends Record<TKeys, z.ZodType<any>>,
>({
  name,
  items,
  documentation,
}: Library<TName, TKeys, TDocumentation>): Library<
  TName,
  TKeys,
  TDocumentation
> {
  return { name, items, documentation };
}

// library has items and schema

// const logger = createLogger({
//   test: (test: Test) => {
//     return {
//       type: 'test' as const,
//       message: 'Test',
//     }
//   }
// })

// function f<T>(arg: T, callback: (arg: T) => void): void;
// function f<T>(callback: () => void): void;
// function f<T>(argOrCallback: T | (() => void), callback?: (arg: T) => void): void {
//   if (typeof argOrCallback === 'function') {
//     argOrCallback();
//   } else if (callback) {
//     callback(argOrCallback);
//   }
// }

// type FunctionOrGenerator<T> = T extends (...args: any[]) => Generator<infer U, any, any>
//   ? U
//   : T extends (...args: any[]) => infer U
//     ? U
//     : never;

// type Item<T> = {
//   prod: T;
//   test: FunctionOrGenerator<T>;
// };

// // Usage
// const item1: Item<number> = {
//   prod: 1,
//   test: function*() { yield 2; } // This is valid
// };

// const item2: Item<number> = {
//   prod: 1,
//   test: () => 2 // This is valid
// };

// const item3: Item<number> = {
//   prod: 1,
//   test: function*() { yield '2'; } // This is not valid
// };

// const item4: Item<number> = {
//   prod: 1,
//   test: () => '2' // This is not valid
// };

// db: dynamicItem({ // has to be void to get dynamic
//   prod: {
//     execute: item(async sql => await db.execute(sql)),
//   },
//   test: function* () {
//     const tx = db.transaction();
//     yield {
//       execute: item(async sql => await tx.execute(sql)),
//     };
//     tx.rollback();
//   },
// }),
