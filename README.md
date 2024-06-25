# autofunction

Autofunction is an experimental framework for metaprogramming with language models. It provides a high-level API for defining functions that in some sense write themselves—autofunctions. 

The library emphasizes the use of *code* to prompt programming agents, allowing you to write precise, reusable commands whose implementations can be validated by the application at runtime.

Agents are run on the main thread, which means they can use live data to autonomously test and debug the code they write. This pattern, while presenting serious security challenges, makes effective use of a language model's iteration speed to quickly converge to functions that work.

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
- [Basic usage](#usage)
- [VS Code extension](#vs-code-extension)
- [Importing libraries](#importing-resources)
- [Tasks](#tasks)
- [Example: metaprogramming a SQL backend](#handling-errors)

## Risks

Autofunctions use JavaScript's built-in `eval` function to dynamically run and test themselves. `eval` will be called from the main thread of your application, which means that the code being evaluated will likely be able to do anything with any of the files contained anywhere in your codebase. By default it will have root access.

This is generally considered bad practice—the [official JavaScript documentation of the `eval` function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval) even has a section called ["Never use direct eval()!"](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#never_use_direct_eval!). **_You are strongly encouraged to read this before continuing, because that is precisely what this library does, extensively._**

## Usage

An autofunction is implemented by a passing a _spec_ into a _compiler_.

This spec describes some desired function using a sequence of natural language notes and [Zod schemas](https://github.com/colinhacks/zod), allowing the application to enforce rigid type constraints on the function's behavior. 

A compiler takes this spec and generates an asynchronous function that implements it—an autofunction.

Start by configuring a location in your filesystem where autofunctions can store their code. They will only ever read from or write to this one place:

```ts
import { createAutofunction } from 'autofunction';

const autofunction = createAutofunction({
  repo: 'C:/some/absolute/path',
})
```

To then declare an autofunction, first define its compiler using [a language model supported by Vercel's AI SDK](https://sdk.vercel.ai/docs/ai-sdk-core/overview). The following uses GPT-4o to implement a trivial autofunction that sums an array of numbers:

```ts
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';

const sum = autofunction
  .compiler(openai("gpt-4o")) // 1. the language model to use
  .take(z.number().array())   // 2. the type the function *takes*
  .note("Sum the numbers")    // 3. an inline note for the model
  .return(z.number())         // 4. the type the function *returns*
  .implement()                // 5. finally convert to a function

await sum([1, 2, 3, 4]); // returns 10, hopefully
```

Here the calls to `take`, `note`, and `return` are chained together to form the notion of a "spec," describing precisely some expected flow of data through the function.

You can think of a spec as a three-sided contract between you, the application, and the language model, ensuring that all parties are in agreement about the function's intended behavior.

In the case of `sum`, the application knows to expect a number as an output, otherwise emitting an error that the compiler can learn from. TypeScript will also infer the correct input and output types at compile-time.

The language model for its part sees the spec in the following format:

```txt
Please implement this function:
```js
async function f(input) {
  // Sum the numbers

}
``
Here is the function's expected interface phrased as an extended JSON schema:
```json
{
  "input": {
    "type": "array",
    "items": {
      "type": "number"
    }
  },
  "output": {
    "type": "number",
    "promise": true
  }
}
``
Write the full function in JavaScript inside of triple backticks.
```

When `sum` is called, it checks its code repository for an implementation of its current spec. If no existing code is found, then it will compile itself, using the specified language model to generate and test new code. In either case if all goes well it will execute the code and return the result. 

One novel feature of this setup is that compilers can autonomously iterate on the code they write, learning from tests, execution traces, and actual application data in lieu of direct oversight.

You will notice, then, that the first call to an autofunction whose spec has just been changed, however slightly, will take some time, while any subsequent calls will be fast.

```ts
const sum = autofunction
  .compiler("gpt-4o")
  .take(z.number().array().array()) // now takes *nested* arrays
  .comment("Sum the numbers")
  .return(z.number())
  .implement()

await sum([[1, 2], [3, 4]]); // execution: 2647ms (had to compile)
await sum([[1, 2, 3], [4]]); // execution: 2ms
await sum([[1], [2, 3, 4]]); // execution: 2ms
```

Specs, then, are like standing orders—when you change the shape of your data, any dependent functions will recompile. In this way an autofunction defines a family of functions parametrized by the types and notes in its spec, which can be changed without necessarily breaking the application.

You can stabilize the compilation process by specifying intermediate checkpoints of the function's data using the `then` method. It takes a type and instructs the model to generate an in-context utility function that returns that type. `then` statements are compiled in sequence. 

For instance, you could take the previous `sum` logic and extend it to detect whether the sum is even or odd:

```ts
const sumIsEven = autofunction
  .compiler("gpt-4o")
  .take(z.number().array())
  .note("Sum the numbers")
  .then(z.number())
  .note("Return true if the sum is even, false otherwise")
  .return(z.boolean())
  .implement()

await sumIsEven([1, 2, 3, 4]); // returns true, hopefully
```

Then what this looks like:

```txt
// 
```

This allows you to cut the space of possible intermediate computations the model can output.  

Autofunction declarations end with a call to `implement`, which optionally takes a hardcoded implementation of the function:

```ts
const sum = autofunction
  .compiler("gpt-4o")
  .take(z.number().array())
  .comment("Sum the numbers")
  .return(z.number())
  .implement(async (numbers) => {
    return numbers.reduce((a, b) => a + b, 0)
  })
```

Functions passed to `implement` in this way bypass the compilation process entirely, serving as a sort of manual override if the compiler keeps failing.

## VS Code extension

The code that implements an autofunction is not contained in its declaration—it is instead written to the `.functions` directory and dynamically imported at runtime. 

To view and edit this code, you can download the [Autofunction VS Code extension](#vs-code-extension). 

The extension displays a "Paste code" command above each autofunction that will inject the current model-generated code into your editor as an argument to `implement`, allowing you to freely edit it.

In the event of an error, the extension will display a link to extensive debugging information that you can paste into a Markdown file for you to read or into a chat window for another language model to inspect.

## Importing resources

Autofunctions can import resources from elsewhere in your application using the `import` method.

You can document these resources precisely using the `library` helper. It takes three properties:

- `name`—a unique name for the library
- `items`—any resources you would like to make available to the compiler to use in its code, e.g. objects or functions
- `documentation`—an object containing Zod schemas that describe the specific types of the items, e.g. the input/output schemas of any functions, or the exact shapes of any objects

Using Zod schemas to structure documentation in this way means that TypeScript can complain if any descriptions are incorrectly specified, ensuring you don't accidentally mislead your models. 

[Zod's `describe` method](https://zod.dev/?id=describe) can be used to inform the compiler about any additional details that are not directly captured by the data types. 

To illustrate with another trivial example, suppose your database is just a key-value store like Redis. You could give your autofunctions access to this database by creating a `library` object containing its query functions, and then importing it into your compiler:

```ts
import { Redis } from '@upstash/redis'
import { library } from 'autofunction';

const db = new Redis({
  url: 'https://alert-sailfish-50042.upstash.io',
  token: '********',
})

const data = z.object({
  id: z.string(),
}).describe("Some data type")

const redis = library({
  name: 'redis',
  items: { db },
  documentation: {
    db: z.object({
      get: z
        .function()
        .describe('Fetches a value from the database')
        .args(z.string())
        .returns(data.promise()),
      set: z
        .function()
        .describe('Sets a value in the database')
        .args(z.string(), data)
        .returns(z.void().promise()),
    }).describe('The Redis database object'),
  },
});
```

You can now import the `redis` library into your autofunctions using the `import` method. 

```ts
const getData = autofunction
  .compiler("gpt-4o")
  .import(redis)
  .take(z.string())
  .note("Fetch a value from Redis")
  .return(data)
  .implement()
```

The Redis database will now be in-scope at runtime, and its documentation will be made available at compile-time. 

Autofunctions can `import` any number of libraries---the only restriction is that they must have different names. 

> If any library items are too complicated to document using Zod, you can declare them as an `any` type using `z.any()`. Note, though, that the only information a model will have about `any` types will be whatever you have attached to them using `describe`.

## Tasks

You can share logic across autofunctions using *tasks*, which contain the following properties: 

- `do`: some instructions
- `output`: the output type of the task
- `import` (optional): any necessary resources, e.g. database APIs
- `error` (optional): the type of error the task can throw
- `compiler` (optional): a special compiler to use

Tasks serve the same purpose as types—they guide the generated logic and enforce rigid output constraints that will be checked at test-time. The difference is that they contain additional context to be passed into the compiler. 

You can chain tasks (or types) together using the `then` method. Each call to `then` and `return` will be compiled in separate calls to the language model, allowing you to break up difficult work into small, composable chunks. 

Suppose you've described your whole frontend design system in a library object called `components`, and that you would now like to automate a first pass for each of your higher-order components. You could encapsulate this logic in a task:

```js
import { z } from 'zod';
import { components } from '@/my-design-system';
import { data, db } from '@/my-database';

// make some task you can reuse across autofunctions
const ui = {
  do: "make a React component",
  output: z.custom<JSX.Element>(),
  import: { components }
}

const fetchData = {
  do: "fetch data from the database",
  output: data,
  import: { db }
}

const Dashboard = autofunction
  .compiler("gpt-4o")
  .take(data.pick({ id: true }))
  .then(fetchData)
  .comment("now we want a nice data dashboard")
  .return(ui)
  .implement()

// usage in e.g. a Next.js page
export default async function Page() {
  return (
    <main>
      <Dashboard id={"some-id"} />
    </main>
  )
}
```

It's worth noting that reusing tasks across your application is similar to how you might normally reuse functions. However, tasks are implemented *contextually* by the compiler, which means that two autofunctions that run the same task may do so slightly differently, leading presumably to some amount of code duplication.

### Handling errors

Coming soon... 

However do note in the meantime that if any error is encountered during the compilation process, it will be assumed that the spec you have written *is impossible to implement*, and the compiler will throw that same error every time it is called with that spec.

You will have to change this spec slightly to trigger a recompilation. This avoids expensive infinite loops.

## SQL stuff

Some SQL queries don't require any intelligence. To delete a row from a table, for example, you just need to know the table and the row's primary key.

Below, however, we will focus on the two kinds of queries that require some thought:

1. Inserting into one or more tables that have foreign key constraints
2. Selects with multiple joins or additional computations

First we will extend Zod with the notion of a `ZodTable`, which will hold the schema of a SQL table along with its relations to other tables. 

```ts
// implement
```

We can then use these types as the basic building blocks of our server-side logic by composing them using custom operators:

```ts
// define `one`
// define `many`

const tweet = one(post, {
  mentions: many(mention),
  hashtags: many(hashtag),
  author: one(publicUser),
  views: z.number().describe("View count")
})
```

This `tweet` type encapsulates all of the information a language model will need to know to manipulate it on the application server or query it from the database. 

We can then write e.g. an `insert` task that takes any record of table fragments--objects containing only the mandatory columns of a table--and inserts them into the database in the correct order, and a `find` task that takes a type and determines how to select it from the database. 

Note `then` and `return` optionally take a *task generator* as an argument, which is a function that takes the previous type in the chain and returns a new task.

```ts
function fragment<T extends ZodTableAny>(table: T): Fragment<T> {
  // filter out non-mandatory columns
}

function insert<
  TTables extends Record<string, ZodTableAny>
>(tables: TTables): Task {
  return {
    do: `insert into the tables in the right order...`,
    output: table,
    import: { 
      drizzle: (lib) => ({
        db: lib.db.pick({ insert: true })
      })
    },
    error: z.literal("Already exists"),
    examples: [...],
  }
}

function find(type: ZodTypeAny): Task {
  return {
    do: `select from the table...`,
    output: type,
    import: { 
      drizzle: (lib) => ({
        db: lib.db.pick({ execute: true }),
        sql: lib.sql
      })
    },
    error: z.literal("Not found"),
    examples: [...]
  }
}

// usage 
const postTweet = auto 
  .take({
    post: fragment(post),
    mentions: many(fragment(mention)),
    hashtags: many(fragment(hashtag)),
  })
  .then(insertMany)
  .return(find(tweet)) 
  .implement()
```