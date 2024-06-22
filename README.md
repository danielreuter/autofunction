# autofunction

This library provides a way to define functions that write themselves. We will refer to this class of functions as _autofunctions_.

Autofunctions are declared by passing a specification into an AI-based compiler, which can use live data from the main thread to autonomously test and debug the code it writes. This pattern, while presenting serious security challenges, makes effective use of a language model's iteration speed to quickly converge to functions that work.

## Features

1. Open-source and fully customizable
2. No scripts required
3. Easily integrated with any AI provider or inference framework

## Installation

```bash
npm install autofunction
```

## Overview

- [Risks](#risks)
- [Usage](#usage)
- [Building a compiler](#building-a-compiler)
  - [Default configuration](#default-configuration)
  - [Imports](#importing-custom-libraries)
  - [Customizing the `compile` function](#compile)
  - [Handling errors](#handling-errors)
- [VS Code extension](#vs-code-extension)


## Risks

Autofunctions use JavaScript's built-in `eval` function to dynamically run and test themselves. `eval` will be called from the main thread of your application, which means that the code being evaluated will likely be able to do anything with any of the files contained anywhere in your codebase. By default it will have root access.

This is generally considered very bad practice—the [official JavaScript documentation of the `eval` function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval) even has a section called ["Never use direct eval()!"](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#never_use_direct_eval!). **_You are strongly encouraged to read this before continuing, because that is precisely what this library does, extensively._**


## Usage

An autofunction is defined by passing a _spec_ into a _compiler_.

This spec will describe some desired function using a mixture of natural language and [Zod schemas](https://github.com/colinhacks/zod), allowing the application to enforce rigid type constraints on the function's input and output behavior.

A compiler will take a spec in this format and return an AI-generated asynchronous function that implements it—an autofunction.

You can define a simple compiler in ten lines of code (see [default configuration](#default-configuration)).

Here's how you might ultimately use a compiler, in this case one named `auto`:

```ts
import { z } from 'zod';
import { auto } from 'path/to/your/compilers';

const sum = auto({
  do: 'sum the numbers given', // what the function *does*
  in: z.number().array(),      // what the function *takes*
  out: z.number(),             // what the function *returns*
});

await sum([1, 2, 3, 4]); // returns 10, hopefully
```

When an autofunction like `sum` is called, it first checks its code repository for an implementation of its assigned spec. If no existing code is found, then it will compile, using a language model to generate and test new code. In either case if all goes well it will execute the code and return the result.

The novel feature of this setup is that compilers can autonomously iterate on the code they write, learning from tests, execution traces, and actual application data in lieu of direct oversight.

You will notice, then, that the first call to an autofunction whose spec has just been changed, however slightly, will take some time, while any subsequent calls will be fast.

```ts
const sum = compiler({
  do: 'sum the numbers given',
  in: z.number().array().array(), // now takes *nested* arrays
  out: z.number(),
});

await sum([[1, 2], [3, 4]]); // execution: 2647ms (had to compile)
await sum([[1, 2, 3], [4]]); // execution: 2ms
await sum([[1], [2, 3, 4]]); // execution: 2ms
```

The code that implements an autofunction is not contained in its declaration—it is instead written to the `.functions` directory and dynamically imported at runtime. 

To view and edit this code, you can download the [Autofunction VS Code extension](#vs-code-extension). This will render relevant commands directly above each call to a compiler, including a link to extensive debugging information in the event of an error.

You can manually override AI-generated code at any time by passing a function into the compiler as its second argument:

```ts
const sum = compiler({
  do: 'sum the numbers given',
  in: z.number().array(),
  out: z.number(),
}, (numbers) => {
  return numbers.reduce((a, b) => a + b, 0)
});
```

`sum` will now just call the function you provided, bypassing the compilation process entirely. This hardcoded function will be implicitly typed and validated by Zod.

The VS Code extension provides a "Paste code" command that will pass the current AI-generated implementation in as the manual override. You should use this before deploying functions to production if your environment cannot reliably read from the filesystem at runtime, e.g. in a serverless environment.

## Building a compiler

A compiler is a function that takes a spec and returns an autofunction.

You will likely want to create a number of compilers, each with its own set of instructions and resources. Think of them as dynamic libraries, tailored to programming particular types of functions using particular sets of tools. You might give them generic names like:
- `rsc`—generates React Server Components using your component library
- `transform`—handles data transformations using `lodash`
- `sql`—executes SQL queries against a database using `drizzle-orm`
- `datetime`—manipulates datetime strings and objects using the `date-fns` library

Testing strategies may differ across compilers. For instance, `sql` might wrap its tests in transactions, while `transform` could test against twenty inputs generated adversarially from the actual dataset its functions will operate on.

### Initialization

The entry point to the library is the `createCompiler` function. Point it to a location in your filesystem where it can store its code—make sure to use an *absolute path*. 

```ts
import { createCompiler } from 'autofunction';

// creates 'C:/some/absolute/path/.functions'
const compiler = createCompiler({
  path: 'C:/some/absolute/path', 
})
```

`compiler` here is a helper function that initializes a blank compiler configuration that you will then iteratively build up by calling its methods.

At a high level that might look like the following, which defines a new compiler called `auto`:

```ts
const auto = compiler() // start with a blank configuration
  .import(...)  // import library A
  .import(...)  // import library B
  .compile(...) // define code generation and testing logic
  .build()      // convert to a function, ending the process
```

The configuration process ends with a call to `build`, which returns a fully configured compiler that you can use elsewhere to define autofunctions. 

Each configuration method—`import` and `compile`, currently—returns a new configuration object with an additional setting applied, leaving its parent unmodified. This allows you to neatly define small logical building blocks that you can reuse across compilers.

### Default configuration

The library exposes a default `CompilerConfig`. Its `compile` method tries to write a valid function five times, testing each attempt against a handful of synthetic inputs and passing the full execution history into context.

You can initialize it with a language model of your choice using [one of Vercel's AI providers](https://sdk.vercel.ai/providers/ai-sdk-providers), e.g. GPT-4o, as in the following example:

```ts
import { openai } from '@ai/openai';
import { createCompiler, createDefaultConfig } from 'autofunction';

const compiler = createCompiler({
  path: 'C:/some/absolute/path', // change this
});

const config = createDefaultConfig({
  model: openai('gpt-4o'),
});

const auto = compiler(config).build();

// usage
const sum = auto({
  do: 'sum the numbers given',
  in: z.number().array(),
  out: z.number(),
});

await sum([1, 2, 3, 4]); // returns 10, hopefully
```

In this code we passed an initial configuration into the `compiler` helper function—doing so allows you to optionally define a default configuration that can then be extended with additional settings.

### `import`

Compilers can import resources from elsewhere in your application using the `import` method.

You can document these resources precisely using the `library` helper. It takes three properties:

- `name`—a unique name for the library
- `items`—any resources you would like to make available to the compiler to use in its code, e.g. objects or functions
- `documentation`—an object containing Zod schemas that describe the specific types of the items, e.g. the input/output schemas of any functions, or the exact shapes of any objects

Using Zod schemas to structure documentation in this way means that TypeScript can complain if any descriptions are incorrectly specified, ensuring you don't accidentally mislead your models. 

[Zod's `describe` method](https://zod.dev/?id=describe) can be used to inform the compiler about any additional details that are not directly captured by the data types. 

The following example uses [Drizzle ORM](https://github.com/drizzle-team/drizzle-orm) to create a library containing everything a language model needs to execute queries against a PostgreSQL database.

> This code will work, but may result in unexpected behavior if the model makes a mistake—be careful. The next version of the API will make it easier to proxy/throttle sensitive resources during testing.

```ts
import { library } from 'autofunction';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';

// Set up the connection
const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString);

// Create the Drizzle database object
const db = drizzle(client);

const drizzleLib = library({
  name: 'drizzle', // some unique name for your library
  items: {
    db: db,   // pass in Drizzle's database object
    sql: sql, // pass in Drizzle's SQL templating function
  },
  documentation: {
    db: z
      .object({
        execute: z
          .function()
          .describe('Executes a SQL query')
          .args(z.any().describe('A SQL query string'))
          .returns(
            z
              .any()
              .array()
              .promise()
              .describe('An array containing the result set'),
          ),
      })
      .describe('The Drizzle database object'),
    sql: z
      .function()
      .describe('Formats and sanitizes a SQL query string')
      .args(z.any().describe('Template string array'))
      .returns(z.any().describe('A SQL query string')),
  },
});
```

You can now import `drizzleLib` into any of your compilers using the `import` method. Here we will use it to make a `sql` compiler, which will write and test escaped queries against your database.

```ts
const sql = compiler()
  .import(drizzleLib)
  .compile(...) // logic that writes and tests queries
  .build();
```

The library will now be in-scope for any code generated by the `sql` compiler, and its documentation will be made available at compile-time. 

Compilers can `import` any number of libraries. The only restriction is that they must have different names. 

> If any library items are too complicated to document using Zod, you can declare them as an `any` type using `z.any()`. Note, though, that the only information a model will have about `any` types will be whatever you have attached to them using `describe`.

To make use of the `sql` compiler, you could use the `drizzle-zod` plugin to tie Zod schemas to the shape of your database and then use those in the specs you write.

### `compile`

You can customize each compiler's AI code generation and testing logic, though this will remain undocumented until the testing API is more stable. Consult the [source code](./packages/core/src/compiler/default-compiler.ts) for more information.

### Handling errors

Coming soon... 

However do note in the meantime that if any error is encountered during the compilation process, it will be assumed that the spec you have written *is impossible to implement*, and the compiler will throw that same error every time it is called with that spec.

You will have to change this spec slightly to trigger a recompilation. This avoids expensive infinite loops.

## VS Code extension

The [Autofunction VS Code extension](https://marketplace.visualstudio.com/items?itemName=Autofunction.autofunction) displays the compilation status of each autofunction directly in your code editor, right above each call to a compiler.

If the compiler has not been called yet since the last time you saved your workspace, then the status it displays will be "Not called yet." This is because it is unclear whether the autofunction needs to recompile until it is executed alongside the changes you've made. Once it is called in your application, this status will be replaced with a more informative one. 

If compilation was successful, then you can use "Paste code" to paste the AI-generated implementation into your file as a manual override. 

If compilation has failed, you can use "Copy error to clipboard" to copy an exhaustive set of execution traces from the compilation process to paste into a Markdown file to view, or into some chat assistant's context window to debug. 