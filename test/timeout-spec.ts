// tslint:disable:no-implicit-dependencies
import { Parallel, IParallelFailureNotification } from "../src/index";
import * as chai from "chai";
import { wait } from "common-types";
import { ParallelError } from "../src/ParallelError";

const expect = chai.expect;

const aFn1 = async () => {
  await wait(75);
  return "howdy";
};

describe("Timeouts →", () => {
  it("when a timeout's time limit is exceeded it throws a TimeoutError", async () => {
    // immediate start
    const obj = Parallel.create()
      .add("slacker", aFn1(), 25)
      .add("slow-an-stead", aFn1);
    try {
      await obj.isDone();
      throw new Error("Timeout should have prevented this");
    } catch (e) {
      expect(e.name).to.equal("ParallelError");
      expect(e.errors.slacker.name).to.equal("TimeoutError");
    }
    // delayed start
    const obj2 = Parallel.create()
      .add("slacker", aFn1, 25)
      .add("slow-an-stead", aFn1);
    try {
      await obj2.isDone();
      throw new Error("Timeout should have prevented this");
    } catch (e) {
      expect(e.name).to.equal("ParallelError");
      expect(e.errors.slacker.name).to.equal("TimeoutError");
    }
  });

  it("when a timeout is set but completion is before time limit, no error is thrown", async () => {
    // immediate start
    const obj = Parallel.create().add("slacker", aFn1(), 150);
    const results = await obj.isDone();
    expect(results.slacker).is.equal("howdy");
    // delayed start
    const obj2 = Parallel.create().add("slacker", aFn1, 150);
    const results2 = await obj2.isDone();
    expect(results2.slacker).is.equal("howdy");
  });
});
