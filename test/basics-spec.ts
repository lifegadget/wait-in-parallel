// tslint:disable:no-implicit-dependencies
import Parallel, { IParallelFailureNotification } from "../src/index";
import * as chai from "chai";
import { wait } from "common-types";
import * as helpers from "./testing/helpers";
import { pbkdf2 } from "crypto";

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
});
