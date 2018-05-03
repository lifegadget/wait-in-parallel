// tslint:disable:no-implicit-dependencies
import Parallel, { IParallelFailureNotification } from "../src/index";
import * as chai from "chai";
import { wait } from "common-types";
import ParallelError from "../src/ParallelError";

const expect = chai.expect;

const s1 = async () => {
  await wait(10);
  return 1;
};
const s2 = async () => {
  await wait(100);
  return 2;
};
const f1 = async () => {
  await wait(50);
  throw new Error("whoops");
};

describe("Fail Fast → ", () => {
  it("One of the promises fails inbetween the successes; fails immediately", async () => {
    // Promise scenario
    try {
      const results = await Parallel.create()
        .failFast()
        .add("s1", s1())
        .add("s2", s2())
        .add("f1", f1())
        .isDone();
      throw new Error("should not have reached here!");
    } catch (e) {
      expect(e.name).to.equal("ParallelError");
      expect((e as ParallelError).failed).to.include("f1");
      expect((e as ParallelError).successful).to.include("s1");
      expect((e as ParallelError).incomplete).to.include("s2");
      expect((e as ParallelError).errors).to.haveOwnProperty("f1");
      expect((e as ParallelError).errors.f1).to.haveOwnProperty("message");
      expect((e as ParallelError).errors.f1.message).to.equal("whoops");
      expect((e as ParallelError).results.s1).to.equal(1);
    }
    // Delayed Promise scenario
    try {
      const results = await Parallel.create()
        .add("s1", s1)
        .add("s2", s2)
        .add("f1", f1)
        .isDone();
      throw new Error("should not have reached here!");
    } catch (e) {
      expect(e.name).to.equal("ParallelError");
      expect((e as ParallelError).failed).to.include("f1");
      expect((e as ParallelError).successful).to.include("s1");
      expect((e as ParallelError).successful).to.include("s2");
      expect((e as ParallelError).errors).to.haveOwnProperty("f1");
      expect((e as ParallelError).errors.f1).to.haveOwnProperty("message");
      expect((e as ParallelError).errors.f1.message).to.equal("whoops");
      expect((e as ParallelError).results.s1).to.equal(1);
      expect((e as ParallelError).results.s2).to.equal(2);
    }
  });
});
