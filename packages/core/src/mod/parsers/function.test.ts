import { z } from "zod";
import { modToJsonSchema } from "../modToJsonSchema";
import { describe, expect, it } from "vitest";

const testFunction = z
  .function()
  .describe("ABCDEFG")
  .args(z.string().describe("STRING"), z.number().describe("NUMBER"))
  .returns(z.void().promise().describe("VOID"));

describe("Function -> JSON schema", () => {
  it("should include all function information", () => {
    const { $schema, definitions, ...schema } = modToJsonSchema(testFunction);
    expect(schema).toEqual({
      type: "function",
      takes: {
        arg0: {
          type: "string",
          description: "STRING",
        },
        arg1: {
          type: "number",
          description: "NUMBER",
        },
      },
      returns: {
        type: "void",
        promise: true,
        description: "VOID",
      },
      description: "ABCDEFG",
    });
  });
});
