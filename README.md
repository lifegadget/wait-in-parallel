# wait-in-parallel

![travis](https://img.shields.io/travis/lifegadget/wait-in-parallel.svg) ![coveralls](https://coveralls.io/repos/github/lifegadget/wait-in-parallel/badge.svg?branch=master) ![license](http://img.shields.io/badge/license-MIT-brightgreen.svg)

For Javascript developers who've accepted with open arms the addition of `async/await` and **TypeScript**, our lives have gotten _so much better_ but there are still some edge cases where you need to be more careful with asynchronous behavior or just where you'd like to have a concise way of expressing parallel execution that's easy to grok.

This is an attempt at that.

Maybe you think you don't need this help. Maybe you don't. But let's be honest, the `async/await` semantics are great when we're doing one thing after another ... not quite as good we're doing things in parallel. Yes you can do:

```js
await Promise.all([thing1, thing2, thing3]);
await Promise.all([anotherThing1, anotherThing2]);
```

What about the looping trap? Eh, what trap? I gave it a name to make it sound more formal and scary. Basically what I mean is when you are looping around anything and one of the steps within the loop is _asynchronous_:

```js
things.maps(async thing => await process(thing));
doSomethingElse();
```

Without really intending to i've fired off a set of parallel executions and then immediately executed `doSomethingElse`. Probably not what you wanted. What if I could instead:

```js
things.maps(thing => inParallel.add(process(thing)));
await inParallel.isDone();
doSomethingElse();
```

Yeah well that's what I've been saying all along. You need this. Treat yourself. Show yourself that you really _do_ care. Or don't; up to you.

## Installation

```
# yarn
yarn add wait-in-parallel
# npm
yarn install --save wait-in-parallel
```

## Basic Usage

This package exposes a `Parallel` Object which exposed as the default export of `wait-in-parallel`:

```ts
import Parallel from "wait-in-parallel";
const inParallel = new Parallel();
```

#### Adding Parallel executions

```ts
inParallel.add("red", addThing("red"));
inParallel.add("blue", addThing("blue"));
```

#### Waiting for completion

Waiting is very basic ... use the `await` keyword off of the `isDone` property ... and if you care about the returned promises then they will be returned with the resolution the await:

```ts
const results = await inParallel.isDone();
```

So in this case imagine the `addThing` function resolves eventually with a random number, you'd get a `results` variable that would look like:

```js
{
  red: 42,
  blue: 99
}
```

Imagine, however, that the "blue" promise failed. Then instead of completing the `await` block would error. In this example we didn't have it surrounded by a `try/catch` block but had we then what we could have caught would look like:

```js
{
  name: "ParallelError",
  message: " 1 of 2 promises failed; failing messages were: [ blue ] ",
  failed: [ "blue" ],
  successful: [ "red" ],
  incomplete: [],
  errors: { blue: "TypeError: the blue type could't be found" },
  stacks: { blue: [ ... ] },
  // from promises which DID succeed
  results: {
    red: 42
  }
}
```

## Advanced Usage

#### Fail Fast

As you probably noticed in the "basic" use case the _strategy_ assumed in running in parallel is to run each promise to completion regardless if there is a failure. That _may_ be what be what you want but there are certainly cases where you'd prefer to "fail fast" at the point where the first promise to fail represents failure.

This is possible, and is achieved by calling `failFast()` the fluent interface:

```ts
try {
  const result = await inParallel
    .create()
    .failFast()
    .add("red", addThing("red"))
    .add("blue", addThing("blue"))
    .isDone();
  // success
} catch (e) {
  // failure
}
```

Now the await will fail as soon as our call to `addThing("blue")` fails regardless of whether "red" has completed or not. If it hasn't completed then you'll see it in the `incomplete` array from above.

#### Fail Slow ... but let me know

It may be that you do really want to wait for all the promises to complete but you'd like to be alerted as the failures come in so you can handle that in an appropriate manner. No problem, this is what the `notifyOnFailure(fn)` feature is for:

```ts
try {
  const fn: IParallelFailureNotification = (which: string, error: Error) => {
    console.log(`The ${which} promise failed with error: ${error.message}`);
  };
  const result = await Parallel.create()
    .add("red", addThing("red"))
    .add("blue", addThing("blue"))
    .notifyOnFailure(fn)
    .isDone();
  // success
} catch (e) {
  // failure
}
```

#### Slow ... but I don't have ALL DAY

There are often cases where you need/want to wait for completion of all promises to complete but only to a point. In essence you want a "timeout" to fire on any of the promises if they're go beyond a certain timeframe. Well clearly you can just add this _timeout_ functionality to your promises but to make this functionality easier to implement there is an optional third parameter to the `.add()` method:

```ts
try {
  const result = await Parallel.create()
    .add("red", addThing("red"), 5000))   // timeout of 5 seconds
    .add("blue", addThing("blue"), 2000)) // timeout of 2 seconds
    .isDone();
  // success
} catch (e) {
  // failure
}
```

#### Mr Speedy Pants

When writing the above use case above I also realized an equally beneficial use case is using timeouts when you fail fast. No need for a code example on this one, I presume it's obvious how you'd do that. If it's not obvious to you it doesn't mean you are slow ... it just means you _might_ be. 😉

Anyway, let me spell it out:

* add the `failFast()` call
* surround one or more of you promises with `timeout(promise, delay)`

### Delayed Start

In the cases demonstrated so far every addition (aka, call to `add`) has passed in a promise which is executing. In this always-hurring world, right away makes sense most of the time but occationally it might make sense to delay execution of the promises. This can be done by passing in a synchronous function which resolves to an asynchronous function:

```ts
const delayedPromise = () => async () => Promise.resolve();
```

This allows you to allows you to load up a number of parallel execution groups but they don't start executing until the call to `.isDone()` is called:

```ts
import Parallel, { delayed } from "wait-in-parallel";

const group1 = Parallel.create()
  .add(delayed(() => job1))
  .add(delayed(() => job2));
const group2 = Parallel.create()
  .add(delayed(() => job3))
  .add(delayed(() => job4));

setTimeout(console.log(await group2.isDone()), 500);
```

In the above example, nothing is executed for 500ms, then **group2** is kicked off and when it completes it logs to the console. `job1` and `job2` are never executed as **group1** is still delayed ... awaiting the start signal.

## Other Notes

* this library is available in both `commonjs` and `es2015` module definitions
* you don't _need_ to use TypeScript, I just think you _should_

## License

Copyright (c) 2018 LifeGadget Ltd

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
