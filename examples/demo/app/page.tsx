import { z } from "zod";
import { auto } from "../lib/compilers";

export default async function Home() {
  const generateNumbers = auto({
    do: "make some random numbers",
    in: z.void(),
    out: z.number().array().array(),
  });
  const randomNumbers = await generateNumbers();

  const addNumbers = auto({
    do: "add some numbers",
    in: z.number().array(),
    out: z.number(),
  });
  const sum = await addNumbers([5, 3]);

  const concatStrings = auto({
    do: "concatenate strings with a slash between them",
    in: z.string().array(),
    out: z.string(),
  });
  const concatenatedString = await concatStrings([
    "Some",
    "concatenated",
    "string",
  ]);

  const multiplyNumbers = auto({
    do: "multiply two numbers",
    in: z.object({ a: z.number(), b: z.number() }),
    out: z.number(),
  });
  const product = await multiplyNumbers({ a: 7, b: 8 });

  const reverseString = auto({
    do: "reverse a string",
    in: z.string(),
    out: z.string(),
  });
  const reversedString = await reverseString("Hello");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-24">
      <h1 className="text-3xl font-bold">AUTOFUNCTION</h1>
      <h2 className="text-xl font-semibold">Sum of 5 and 3</h2>
      <p>{sum}</p>
      <h2 className="text-xl font-semibold">String concatenation</h2>
      <p>{concatenatedString}</p>
      <h2 className="text-xl font-semibold">Product of 7 and 8</h2>
      <p>{product}</p>
      <h2 className="text-xl font-semibold">Reversed Hello</h2>
      <p>{reversedString}</p>
      <h2 className="text-xl font-semibold">Random Numbers</h2>
      {randomNumbers.map((numbers, i) =>
        numbers.map((number, j) => <p key={"" + i + j}>{number}</p>),
      )}
    </main>
  );
}
