import { describe, expect, it, beforeEach } from "vitest";
import { z } from "zod";
import { AnySpec } from "../shared/types";
import { library } from "../compiler/library";
import { randomUUID } from "crypto";
import { processSpec } from "./spec";

export const testSpec = {
  do: "square the number",
  in: z.number(),
  out: z.number(),
};

const desc = Array.from({ length: 4 }, () => randomUUID());
const val = Array.from({ length: 4 }, (v, i) => i);

export const testLibrary = library({
  name: "test",
  items: {
    v0: val[0],
    v1: val[1],
    v2: val[2],
    v3: val[3],
  },
  documentation: {
    v0: z.number().describe(desc[0]),
    v1: z.number().describe(desc[1]),
    v2: z.number().describe(desc[2]),
    v3: z.number().describe(desc[3]),
  },
});

const testLibrary2 = {
  ...testLibrary,
  name: "test2",
};

const processedSpec = processSpec(testSpec, {
  incorrectname1: testLibrary,
  incorrectname2: testLibrary2,
});

describe("Spec processing", () => {
  it("arguments should contain all library names", () => {
    expect(processedSpec.arguments).toEqual(["test", "test2"]);
  });

  it("`takes` schema should contain library names + input", () => {
    const takes = processedSpec.fullSpec._def.args.items[0];
    const actualKeys = Object.keys(takes._def.shape());
    expect(actualKeys).toEqual(["input", "test", "test2"]);
  });

  it("should contain all library descriptions", () => {
    const str = processedSpec.toString();
    desc.forEach((uuid) => {
      const matches = str.match(new RegExp(uuid, "g")) || [];
      // only matches once due to ref strategy
      expect(matches.length).toBe(1);
    });
  });
});
