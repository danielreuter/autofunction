import { z } from "zod";
import { modToJsonSchema } from "../modToJsonSchema";
import { describe, expect, it } from "vitest";

// Define all possible Zod types
const zodTypes = [
  z.string(),
  z.number(),
  z.boolean(),
  z.date(),
  z.undefined(),
  z.null(),
  z.array(z.string()),
  z.object({ key: z.string() }),
  z.union([z.string(), z.number()]),
  z.intersection(z.string(), z.number()),
  z.tuple([z.string(), z.number()]),
  z.record(z.string()),
  z.map(z.string(), z.number()),
  z.set(z.string()),
  z.function().args(z.string()).returns(z.boolean()),
  // Add more Zod types if needed
];

describe("Promise -> JSON schema", () => {
  zodTypes.forEach((type, index) => {
    it(`should include all information for type ${index}`, () => {
      const promiseType = type.promise();
      const { promise, ...promiseSchema } = modToJsonSchema(promiseType);
      const nonPromiseSchema = modToJsonSchema(type);

      expect(promiseSchema).toEqual(nonPromiseSchema);
      expect(promise).toEqual(true);
    });
  });
});
