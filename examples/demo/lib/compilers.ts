import { openai } from "@ai-sdk/openai";
import { createCompiler, createDefaultConfig } from "autofunction";
import { utils } from "./libraries";

const compiler = createCompiler({
  path: process.env.REPO_PATH!,
});

const config = createDefaultConfig({
  model: openai("gpt-4o"),
});

export const auto = compiler(config).import(utils).build();

// export const rsc = compiler(config).import(components).build();

// const sumRandomNumbers = pipeline(auto, [
//   z.number().describe("a length of a list"),
//   z.number().array().describe("random numbers of the given list length"),
//   z.number().describe("sum of the numbers"),
// ]);
