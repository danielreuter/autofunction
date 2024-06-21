import { z } from "zod";
import {
  FnCache,
  createFnPath,
  createRepositoryIfDoesNotExist,
  deleteRepository,
} from "./cache";
import { describe, expect, it, beforeEach, afterAll, beforeAll } from "vitest";
import { sleep } from "../shared/utils";
import path from "path";
import { Snapshot } from "../function";

require("dotenv").config();

/**
 *  Makes a path to a .functions directory inside of this
 *  repository directory. Point your TEST_PATH to the
 *  src/repository directory to correctly run tests.
 */
export function createTestPath() {
  const result = z.string().safeParse(process.env.TEST_PATH);
  if (!result.success) {
    throw new Error(
      "TEST_PATH not set in environment. You must set this to run the tests. It should point to 'src/repository'.",
    );
  }

  const lastSegment = path.basename(result.data);
  const secondLastSegment = path.basename(path.dirname(result.data));

  if (lastSegment !== "repository" || secondLastSegment !== "src") {
    console.error("hmmm", `${secondLastSegment}/${lastSegment}`);
    throw new Error("TEST_PATH must point to 'src/repository.'.");
  }

  return result.data
}

describe("Test fs read/delete operations", async () => {
  const fnPath = createFnPath(createTestPath())

  beforeAll(async () => {
    await deleteRepository(fnPath);
  });

  it("should create/delete arbitrarily many in sequence", async () => {
    for (let i = 0; i < 1000; i++) {
      const created = await createRepositoryIfDoesNotExist(fnPath);
      expect(created).toEqual({ dir: true, cache: true });
      const deleted = await deleteRepository(fnPath);
      expect(deleted).toEqual({ dir: true, cache: true });
    }
  });
});

const differentSnapshots = Array(1000)
  .fill(0)
  .map(
    (_, i) =>
      [
        `id-${i}`,
        Snapshot.compiling({ do: `description-${i}` })
      ] as const,
  );

const sameSnapshots = Array(1000)
  .fill(0)
  .map(
    (_, i) =>
      [
        `same-id`,
        Snapshot.compiling({ do: `description-${i}` })
      ] as const,
  );

describe("Test the cache", () => {
  let cache: FnCache;

  beforeEach(async () => {
    cache = await FnCache.create(createTestPath(), true);
  });

  afterAll(async () => {
    // delete the test directory
    await FnCache.create(createTestPath(), true);
  });

  it("should initialize with empty data", async () => {
    expect(cache.data).toEqual({});
    expect(cache.metadata).toBeDefined();
  });

  it("should get null for non-existing id", async () => {
    const id = "non-existing-id";
    const result = await cache.get(id);
    expect(result).toEqual(null);
  });

  it("callers to a lock should wait and get the result", async () => {
    const [id, snapshot] = differentSnapshots[0];
    cache.lock(id, async () => snapshot);
    const result = await cache.get(id);
    expect(result).toEqual(snapshot);
  });

  it("error during lock should crash the process", async () => {
    const error = new Error("Test error");
    let caughtError;
    try {
      await cache.lock("test-id", () => Promise.reject(error));
    } catch (e) {
      caughtError = e;
    }
    expect(caughtError).toEqual(error);
  });

  it("should handle concurrent writes", async () => {
    differentSnapshots.forEach(async ([id, snapshot]) => {
      const direct = cache.lock(id, async () => snapshot);
      const result = await cache.get(id);
      expect(snapshot).toEqual(await direct);
      expect(snapshot).toEqual(result);
    });
  });

  it("should deduplicate writes", async () => {
    const { timestamp, ...baseline } = sameSnapshots[0][1];
    sameSnapshots
      .map(([id, snapshot]) => cache.lock(id, async () => snapshot))
      .forEach(async (promise) => {
        const { timestamp, ...rest } = await promise;
        expect(rest).toEqual(baseline);
      });
  });

  it("should persist data across multiple instances", async () => {
    const promises = differentSnapshots.slice(0, 10).map(([id, snapshot]) => {
      return cache.lock(id, async () => snapshot);
    });
    await Promise.all(promises);
    await sleep(2000);
    const newCache = await FnCache.create(createTestPath(), false);
    expect(newCache.data).toEqual(cache.data);
  });
});

// describe("File writing error rate test", () => {
//   const path = createTestPath();
//   const largeFilePath = join(createPath(), 'largeFile.txt');
//   const largeFileContent = 'a'.repeat(1e7); // 10 MB file
//   const writePeriods = [10, 100, 200, 500]; // in milliseconds

//   for (const period of writePeriods) {
//     it(`should write a large file every ${period}ms without errors`, async () => {
//       let errorCount = 0;
//       const writeCount = 10;

//       for (let i = 0; i < writeCount; i++) {
//         try {
//           writeFileSync(largeFilePath, largeFileContent);
//           await new Promise(resolve => setTimeout(resolve, period));
//         } catch (error) {
//           console.log(`Error writing file: ${error}`);
//           errorCount++;
//         }
//       }

//       const errorRate = errorCount / writeCount;
//       console.log(`Error rate for period ${period}: ${errorRate}`);
//       expect(errorCount).toBe(0);
//     });
//   }
// });
