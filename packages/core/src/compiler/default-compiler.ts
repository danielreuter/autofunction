import { z } from "zod";
import { LanguageModel, generateObject, generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { randomUUID } from "crypto";
import { RuntimeError } from "../function/error";
import dedent from "dedent";
import {
  AnyCompileFn,
  CompileFn,
  CompilerConfig,
  createConfig,
} from "./builder";

// todo: make a first-class generic version of this
export function createDefaultConfig({
  model,
}: {
  model: LanguageModel;
}): CompilerConfig<AnyCompileFn, {}> {
  return createConfig({
    imports: {},
    compile: async ({ spec, parse, createTester }) => {
      // Initialize the tester with synthetic inputs
      const tester = await createTester(async (testSchema: any) => {
        const { object } = await generateObject({
          model,
          schema: z.object({
            testInputs: testSchema.array(),
          }),
          prompt: `\
            I am writing a function that implements this spec: 
            ${spec}
            Please write three inputs to test its behavior.
            They should just be run-of-the-mill inputs, nothing
            adversarial or edge-casey.
          `,
        });
        return object.testInputs;
      });

      // Try a few times to generate code that passes tests
      let attempts = 0;
      while (attempts < 4) {
        const code = await parse(async (instructions) => {
          const { text } = await generateText({
            model,
            prompt: instructions + spec + tester.history,
          });
          return text;
        });
        const results = await tester.test(code);
        if (results.every((result: any) => result.success)) {
          return code;
        }
        attempts++;
      }

      // Read test history and explain why compiler failed
      const { text } = await generateText({
        model,
        prompt: `\
          Explain succinctly why you think the code
          generation process failed to produce a function
          that meets this spec:
          ${spec}
          This is what the process looked like:
          ${tester.history}
        `,
      });
      throw RuntimeError.fromCompiler(text);
    },
  });
}
