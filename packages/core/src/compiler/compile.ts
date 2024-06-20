import { Code } from "../function/code";
import { AnySpec, ProcessedSpec } from "../shared/types";
import { RuntimeError } from "../function/error";
import dedent from "dedent";

export function createParser(
  spec: ProcessedSpec,
  { handleSuccess }: { handleSuccess: (code: Code) => void },
) {
  return async function parse(
    generator: (instructions: string) => Promise<string>,
  ) {
    let attempts = 0;
    while (attempts < 4) {
      try {
        const instructions = dedent`
          ***Response format***
          Your response should be a function that takes a single argument of the same type as the input schema \
          and either returns data that matches the output spec or throws an error. 

          The function should be placed inside of triple-backticked JS code \
          and should destructure the input object like so:
          \`\`\`js
          function fnName({ input, ${spec.arguments.join(", ")}}) {
            // Your code here
            return output
          }
          \`\`\`
        `;

        const warning = Array.from(
          { length: attempts },
          () =>
            "Last time you forgot to follow the formatting instructions, please remember to follow them.",
        ).join("\n");

        const response = await generator(`${instructions}\n${warning}`);
        const code = Code.fromResponse(response);
        if (code) {
          handleSuccess(code);
          return code;
        }
      } catch (error) {
        throw RuntimeError.fromCompiler(
          "Unknown error occurred during code generation",
          error,
        );
      }
      attempts++;
    }
    throw RuntimeError.fromCompiler(
      "Failed to parse generated code. Please make sure that you passed your language model the function generation instructions provided by the `parse` method.",
    );
  };
}
