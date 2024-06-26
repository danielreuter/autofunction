# autofunction

Autofunction is an experimental framework for metaprogramming with language models. It provides a high-level API for defining functions that write themselves—autofunctions. 

The library emphasizes the use of *types* to prompt programming agents, allowing you to create precise, reusable requests for functions whose behavior your application can validate at runtime.

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

An autofunction is declared by writing a _spec_, which describes the function you want using a mixture of natural language and [Zod schemas](https://github.com/colinhacks/zod), allowing the application to enforce rigid type constraints on the function's behavior. 

A compiler takes this spec and generates an asynchronous function that implements it—an autofunction.

Start by configuring a location in your filesystem where autofunctions can store their code. They will only ever read from or write to this one place:

```ts
import { createAutofunction } from 'autofunction';

const autofunction = createAutofunction({
  repo: 'C:/some/absolute/path',
})
```

To then declare an autofunction, first provide a compiler in the form of a [language model via Vercel's AI SDK](https://sdk.vercel.ai/docs/ai-sdk-core/overview). The following uses GPT-4o to implement a trivial autofunction that sums an array of numbers:

```ts
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';

const sum = autofunction
  .compiler(openai("gpt-4o")) 
  .take(z.number().array())   
  .then({
    do: "sum the numbers",    
    output: z.number()       
  })         
  .implement()                

await sum([1, 2, 3, 4]); // returns 10, hopefully
```

The `take` method accepts a Zod schema that will be used to type and validate inputs to the function. `then` is used to [specify one or more logical tasks for the compiler to implement](#tasks). Each task has a `do` description and an `output` type that will be validated.

A spec, then, consists of a sequence of calls to `take` and `then`, describing precisely some expected flow of data through the function.

The return type of the function will be inferred from the `output` of the final `then` statement—alternatively you can add a call to `return` to the chain to specify it explicitly, perhaps leaving it blank:

```ts
const sum = autofunction
  .compiler(openai("gpt-4o"))
  .take(z.number().array())
  .then({
    do: "sum the numbers",
    output: z.number()
  })
  .return(z.number()) // explicitly specify the return type
  .implement()
```

If you only plan to use one language model, you can call `compiler` once and reuse the resulting object across declarations:

```ts
const gpt4o = autofunction.compiler(openai("gpt-4o"))

const sum = gpt4o
  .take(z.number().array())
  .then({
    do: "sum the numbers",
    output: z.number()
  })
  .implement()

const multiply = gpt4o
  .take(z.number().array())
  .then({
    do: "multiply the numbers",
    output: z.number()
  })
  .implement()
```

You can think of a spec as a three-sided contract between you, the application, and the language model, ensuring that all parties are in agreement about the function's intended behavior. 

In the case of `sum`, the application knows to expect a number as an output, otherwise emitting an error that the compiler can learn from. TypeScript will also infer the correct input and output types at compile-time.

The language model for its part sees the spec in the following format:

```txt
Please implement a JavaScript function for me. I've written up what I want it to do as a JSON schema:
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
  },
  "description": "sum the numbers"
}
``
I've already written the following code: 
```js
async function f(input) {
  // Any previously generated code goes here
}
``
```

When `sum` is called, it checks its code repository for an implementation of its current spec. If no existing code is found, then it will compile itself, using the specified language model to generate and test new code. In either case if all goes well it will execute the code and return the result. 

This setup allows compilers to autonomously iterate on the code they write, learning from tests, execution traces, and actual application data in lieu of direct oversight.

You will notice, then, that the first call to an autofunction whose spec has just been changed, however slightly, will take some time, while any subsequent calls will be fast.

```ts
const sum = gpt4o
  .take(z.number().array())
  .then({
    do: "sum the numbers",
    output: z.number()
  })
  .implement()

await sum([[1, 2], [3, 4]]); // execution: 2647ms (had to compile)
await sum([[1, 2, 3], [4]]); // execution: 2ms
await sum([[1], [2, 3, 4]]); // execution: 2ms
```

Specs are like standing orders—when you alter the types they are composed of, any dependent functions will recompile instead of simply breaking. 

Types, then, allow you to broadcast your ideas to any number of language models in a format that inherently constrains their behavior.

You can manually override model-generated implementations by passing a function to `implement`:

```ts
const sum = gpt4o
  .take(z.number().array())
  .then({
    do: "sum the numbers",
    output: z.number()
  })
  .implement(async (numbers) => {
    return numbers.reduce((a, b) => a + b, 0)
  })
```

Functions hardcoded like this bypass the compilation process entirely, and are implicitly typed by Zod.

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
const getData = gpt4o
  .import(redis)
  .take(z.string())
  .then({
    do: "Fetch a value from Redis",
    output: data
  })
  .implement()
```

The Redis database will now be in-scope at runtime, and its documentation will be made available at compile-time. 

Autofunctions can `import` any number of libraries—-the only restriction is that they must have different names. 

> If any library items are too complicated to document using Zod, you can declare them as an `any` type using `z.any()`. Note, though, that the only information a model will have about `any` types will be whatever you have attached to them using `describe`.

## Tasks

The object passed into each `then` statement is a *task*, which encapsulates all of the context the compiler needs in order to write a particular form of logic. It contains the following properties:

- `do`: some instructions
- `output`: the output type of the task
- `import` (optional): any necessary resources, e.g. database APIs
- `error` (optional): the type of error the task can throw
- `compiler` (optional): a special compiler to use

Each call to `then` will be compiled in separate sessions with the language model. All previously generated code will be made available to the model during each task, but it will only see the context of the task at hand.

Suppose you've described your whole frontend design system in a library object called `components`, and that you would now like to automate a first pass for each of your higher-order components. You could encapsulate this logic in a task, and you could do something similar with your database API:

```js
import { z } from 'zod';
import { components } from '@/my-design-system';
import { data, db } from '@/my-database';

function ui(desc: string): Task {
  return {
    do: `make this React component: ${desc}`,
    output: z.custom<JSX.Element>(),
    import: { components }
  }
}

const fetchData = {
  do: "fetch data from the database",
  output: data,
  import: { db }
}

const Dashboard = gpt4o
  .take(data.pick({ id: true }))
  .then(fetchData)
  .then(ui("a nice data dashboard"))
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

It's worth noting that reusing tasks across your application is similar to how you might normally reuse functions. However, tasks are implemented *contextually* by the compiler, which means that two autofunctions that run the same task will likely do so slightly differently.

Because the simple fetcher above doesn't rely on context, we could have equivalently passed `fetchData` in as a function for the compiler to call:

```ts
const Dashboard = gpt4o
  .take(
    z
      .function()
      .describe("fetches data from the database")
      .args(z.string())
      .returns(data.promise())
  )
  .then({
    do: "fetch data",
    output: data
  })
  .then(ui("a nice data dashboard"))
  .implement()
```

### Handling errors

Coming soon... 

However do note in the meantime that if any error is encountered during the compilation process, it will be assumed that the spec you have written *is impossible to implement*, and the compiler will throw that same error every time it is called with that spec.

You will have to change this spec slightly to trigger a recompilation. This avoids expensive infinite loops.

## SQL stuff

Some SQL queries don't require any intelligence. To delete a row from a table, for instance, you just need to know the table and the row's primary key.

Below, however, we will focus on the two kinds of queries that require some thought:

1. Inserting into one or more tables that have foreign key constraints
2. Selects with multiple joins or derived fields

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

We can then write e.g. an `insert` task that takes any number of table fragments—objects containing only the mandatory columns of a table—and inserts them into the database in the correct sequence, and a `find` task that takes a type and determines how to select it from the database. 

Note `then` optionally take a *task constructor* as an argument, which is a function that takes the previous type in the chain and returns a new task.

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
const postTweet = gpt4o 
  .take({
    post: fragment(post),
    mentions: many(fragment(mention)),
    hashtags: many(fragment(hashtag)),
  })
  .then(insertMany)
  .return(find(tweet)) 
  .implement()
```