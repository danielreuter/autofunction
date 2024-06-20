import { FnRepository } from "./repository";
import { describe, expect, it, beforeEach } from "vitest";
import { createTestPath } from "./cache.test";

export function createTestFnRepository() {
  return new FnRepository({ path: createTestPath(), test: true });
}
