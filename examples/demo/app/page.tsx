import Image from "next/image";
import { createDefaultConfig, createRepository } from "autofunction";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export default async function Home() {
  const repo = createRepository({
    path: process.env.REPO_PATH!,
  });

  const config = createDefaultConfig({
    model: openai("gpt-4o"),
  });

  const compiler = repo.createCompiler(config).build();

  const sum = compiler({
    do: "add the numbers given",
    in: z.number().array(),
    out: z.number(),
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-24">
      <h1 className="text-3xl font-bold">AUTOFUNCTION</h1>
      {await sum([1, 2, 3, 4])}
    </main>
  );
}
