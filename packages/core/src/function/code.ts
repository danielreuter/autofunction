import { randomUUID } from "crypto";
import { Serializable, Serialized } from "../shared/types";

type CodeData = {
  id: string;
  fn: string;
};

export class Code extends Serializable<CodeData> {
  id: string;
  fn: string;

  constructor({ id, fn }: CodeData) {
    super();
    this.id = id;
    this.fn = fn;
  }

  toString(): string {
    return this.fn;
  }

  serialize() {
    return {
      id: this.id,
      fn: this.fn,
    };
  }

  static fromResponse(response: string): Code | null {
    const id = randomUUID();
    const fn = Code.extractBlock(response);
    if (!fn) return null;
    return new Code({ id, fn });
  }

  private static extractBlock(response: string): string | null {
    const codeMatch = response.match(
      /```(?:js|jsx|javascript|JavaScript)\s*([\s\S]*?)```/,
    );
    if (codeMatch && codeMatch[1]) {
      return codeMatch[1].trim(); // This captures the code block
    } else {
      return null;
    }
  }
}
