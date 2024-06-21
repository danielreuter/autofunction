import lodash from "lodash";
import fs from "fs";
import { RuntimeError, RuntimeErrorPayload } from "../function/error";
import path from "path";
import { FnSnapshot } from "../function/data";
import { deserializeDisk, serializeDisk } from "./serialization";

export interface FnDisk {
  metadata: {
    lastUpdated: number;
  };
  data: Record<string, FnSnapshot>;
}

export class FnCache {
  metadata: FnDisk["metadata"] = { lastUpdated: Date.now() };
  data: Record<string, FnSnapshot>;
  pending: Record<string, { promise: Promise<FnSnapshot> }> = {};
  dir: string;

  constructor(dir: string, disk: FnDisk) {
    this.dir = dir;
    this.data = disk.data;
    this.metadata = disk.metadata;
  }

  async get(id: string): Promise<FnSnapshot | null> {
    if (this.pending[id]) return await this.pending[id].promise;
    return this.data[id] ?? null;
  }

  get disk(): FnDisk {
    return {
      metadata: this.metadata,
      data: this.data,
    }
  }

  writeData = lodash.debounce(
    async () => {
      try {
        await createRepositoryIfDoesNotExist(this.dir);
        await fs.promises.writeFile(
          path.join(this.dir, "cache.json"),
          JSON.stringify(this.disk),
          "utf8",
        );
      } catch (error) {
        console.error(error);
        throw RuntimeError.internal("Failed to write to cache file", error);
      }
    },
    200,
    { leading: true, trailing: true },
  );

  /**
   * Locks the cache for a specific ID and generates a new snapshot based on the provided payload generator.
   * If another compiler has the lock, the method waits for the lock to be released before proceeding.
   *
   * @param id - The ID of the function to lock.
   * @param payloadGenerator - Emits new function events from a compilation process
   * @returns A promise that resolves to the updated snapshot after the lock is released.
   */
  async lock(
    id: string,
    generateSnapshot: () => Promise<FnSnapshot>,
    initialSnapshot?: FnSnapshot,
  ): Promise<FnSnapshot> {
    // Do nothing if another compiler has the lock
    if (this.pending[id]) return await this.pending[id].promise;

    // Create a deferred promise
    let resolveSnapshot!: (value: FnSnapshot) => void;
    const promise = new Promise<FnSnapshot>((resolve) => {
      resolveSnapshot = resolve;
    });
    this.pending[id] = { promise };

    if (initialSnapshot) {
      this.data[id] = initialSnapshot;
    }

    // Generate new snapshot, resolve promise
    const updatedSnapshot = await generateSnapshot();
    resolveSnapshot(updatedSnapshot);

    this.data[id] = updatedSnapshot;
    this.writeData();

    // Release lock
    delete this.pending[id];

    return updatedSnapshot;
  }

  // async constructor
  static async create(_dir: string, test: boolean) {
    const dir = createFnPath(_dir)
    if (test) {
      await deleteRepository(dir); // start fresh
    }
    const disk = await readRepositoryDisk(dir);
    return new FnCache(dir, disk);
  }
}

export const createFnPath = (dir: string) => path.join(dir, ".functions");

const exists = (path: string) => fs.existsSync(path);

export async function deleteRepository(dir: string) {
  return await retry(async () => {
    const deleted = { dir: false, cache: false };
    const cachePath = path.join(dir, "cache.json");
    if (exists(dir)) {
      if (exists(cachePath)) {
        fs.unlinkSync(cachePath);
        deleted.cache = true;
      }
      fs.rmdirSync(dir);
      deleted.dir = true;
    }
    return deleted;
  });
}

export async function createRepositoryIfDoesNotExist(dir: string) {
  const created = { dir: false, cache: false };
  if (!exists(dir)) {
    await retry(async () => {
      await fs.promises.mkdir(dir, { recursive: true });
    });
    created.dir = true;
  }

  const cachePath = path.join(dir, "cache.json");
  if (!exists(cachePath)) {
    const disk = {
      metadata: {}, 
      data: {}
    }
    await retry(async () => {
      await fs.promises.writeFile(cachePath, JSON.stringify(disk), "utf8");
    });
    created.cache = true;
  }
  return created;
}

export async function readRepositoryDisk(
  dir: string,
): Promise<FnDisk> {
  await createRepositoryIfDoesNotExist(dir);
  return await retry(async () => {
    const serializedDisk = await fs.promises.readFile(
      path.join(dir, "cache.json"),
      "utf8",
    );
    const parsedDisk = JSON.parse(serializedDisk);
    return deserializeDisk(parsedDisk);
  });
}

async function retry<T>(
  fn: () => Promise<T>,
  retries: number[] = [200, 500, 3000],
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries.length === 0) {
      throw error;
    }
    const [nextDelay, ...remainingRetries] = retries;
    await new Promise((resolve) => setTimeout(resolve, nextDelay));
    return await retry(fn, remainingRetries);
  }
}
