// tslint:disable:no-implicit-dependencies
import { Parallel, IParallelFailureNotification } from "../src/index";
import * as chai from "chai";
import { wait } from "common-types";
import * as helpers from "./testing/helpers";

const expect = chai.expect;
const afn1 = async () => {
  await wait(100);
  return 1;
};

const afn2 = async () => {
  await wait(200);
  return 2;
};

const emptyPromise = new Promise((resolve, reject) => {
  resolve("empty");
});

describe("Basics →", () => {
  it("fluent interface works", () => {
    const obj = new Parallel();
    expect(obj.add("a", async () => undefined)).to.equal(obj);
    expect(obj.add("b", () => emptyPromise)).to.equal(obj);
    expect(obj.clear()).to.equal(obj);
    expect(obj.failFast()).to.equal(obj);
    expect(obj.failFast(true)).to.equal(obj);
    expect(obj.failFast(false)).to.equal(obj);
    const fn: IParallelFailureNotification = (which, error) => {};
    expect(obj.notifyOnFailure(fn)).to.equal(obj);
  });

  it("create() static class method instantiates", () => {
    const obj = Parallel.create();
    expect(obj.add).to.be.a("function");
    expect(obj.clear).to.be.a("function");
  });

  it("using get() utility function for invalid property throws error", async () => {
    const obj = Parallel.create("test title");
    try {
      obj._get("foobar");
      throw new Error("Foobar is not a valid get property");
    } catch (e) {
      expect(e.message).to.match(/not a valid property/);
    }
  });

  it("using get() utility function for a valid property works", async () => {
    const obj = Parallel.create().failFast();
    expect(obj._get("failFast")).to.equal(true);
  });

  it("two promises complete within a basic fail-slow scenario", async () => {
    const results = await Parallel.create()
      .add("one", afn1())
      .add("two", afn2())
      .isDone();

    expect(results.one).to.exist.and.equal(1);
    expect(results.two).to.exist.and.equal(2);
  });

  it("two promises with the same name send warning to console but still execute", async () => {
    const restore = helpers.captureStderr();
    const results = await Parallel.create()
      .add("dup", afn1())
      .add("dup", afn2())
      .isDone();
    const stdOut = restore();
    expect(stdOut).is.an("array");
    expect(stdOut).to.be.length(1);
    expect(stdOut[0]).to.match(/duplicate name/);
  });

  it("two delayed promises with the same name throw an error", async () => {
    const restore = helpers.captureStderr();
    try {
      const results = await Parallel.create()
        .add("dup", () => emptyPromise)
        .add("dup", afn2)
        .isDone();
      throw new Error("Duplicate task should have thrown error");
    } catch (e) {
      expect(e.name).to.equal("NameAlreadyExists");
      expect(e.message).to.match(/already a registered item/);
    }
  });

  it("nested errors are exposed to the message of final error", async () => {
    const f1 = () => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const e = new Error("I've fallen and I can't get up");
          e.name = "FictitiousError";
          reject(e);
        }, 10);
      });
    };
    const f2 = () => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const e = new Error("This sucks");
          e.name = "AngryError";
          reject(e);
        }, 20);
      });
    };
    const f3 = async () => {
      await wait(40);
      throw Error("dammit");
    };
    const f4 = async () => {
      await wait(60);
      const e = Error("gosh darn");
      e.name = "SillyError";
      throw e;
    };
    const s1 = () => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve("happy days");
        }, 30);
      });
    };

    const masterError = async () => {
      const p = Parallel.create("Master Error")
        .add("f3", f3)
        .add("f4", f4);
      await p.isDone();
    };

    try {
      const p = Parallel.create("Nested Errors")
        .add("success", s1)
        .add("fail1", f1)
        .add("fail2", f2)
        .add("fail4", masterError);
      await p.isDone();
      throw new Error("Error should have been thrown");
    } catch (e) {
      console.log(e);

      expect(e.message).to.include("fail1 [FictitiousError @");
      expect(e.message).to.include("fail4 [ParallelError { f3");
    }
  });
});
