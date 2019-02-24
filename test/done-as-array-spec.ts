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

const aPerson = async () => {
  await wait(200);
  return {
    id: `id-${Math.floor(Math.random() * 100000)}`,
    name: `Joe Schmoe`
  };
};

const emptyPromise = new Promise((resolve, reject) => {
  resolve("empty");
});

describe("isDoneAsArray() → ", () => {
  it("no param to isDoneAsArray() and primitive values works", async () => {
    const restore = helpers.captureStderr();
    const results = await Parallel.create()
      .add("uno", afn1())
      .add("dos", afn2())
      .add("tres", afn1())
      .add("quatro", afn2())
      .isDoneAsArray();
    const stdOut = restore();
    expect(results).to.be.an("array");
    expect(results.length).to.equal(4);
    expect(results)
      .to.include(1)
      .and.to.include(2);
  });

  it("no param to isDoneAsArray() and object values works", async () => {
    const restore = helpers.captureStderr();
    const results = await Parallel.create()
      .add("uno", aPerson())
      .add("dos", aPerson())
      .add("tres", aPerson())
      .add("quatro", aPerson())
      .isDoneAsArray();
    const stdOut = restore();
    expect(results).to.be.an("array");
    expect(results.length).to.equal(4);
    results.map(r => expect(r).to.haveOwnProperty("id"));
    results.map(r => expect(r).to.haveOwnProperty("name"));
    results.map(r => expect(r).to.not.haveOwnProperty("value"));
  });

  it("param to isDoneAsArray(param) and object values works", async () => {
    const restore = helpers.captureStderr();
    const results = await Parallel.create()
      .add("uno", aPerson())
      .add("dos", aPerson())
      .add("tres", aPerson())
      .add("quatro", aPerson())
      .isDoneAsArray("taskId");
    const stdOut = restore();
    expect(results).to.be.an("array");
    expect(results.length).to.equal(4);
    results.map(r => expect(r).to.haveOwnProperty("id"));
    results.map(r => expect(r).to.haveOwnProperty("name"));
    results.map(r => expect(r).to.haveOwnProperty("taskId"));
    expect(results.map(r => r.taskId)).to.contain("uno");
    expect(results.map(r => r.taskId)).to.contain("tres");
    results.map(r => expect(r).to.not.haveOwnProperty("value"));
  });

  it("param to isDoneAsArray(param) and primitive values creates name/value pair", async () => {
    const restore = helpers.captureStderr();
    const results = await Parallel.create()
      .add("uno", afn1())
      .add("dos", afn2())
      .add("tres", afn1())
      .add("quatro", afn2())
      .isDoneAsArray("taskId");
    const stdOut = restore();
    expect(results).to.be.an("array");
    expect(results.length).to.equal(4);
    results.map(r => expect(r).to.haveOwnProperty("taskId"));
    results.map(r => expect(r).to.haveOwnProperty("value"));
    expect(results.map(r => r.taskId)).to.contain("uno");
    expect(results.map(r => r.taskId)).to.contain("tres");
    results.map(r => expect(r.value).to.be.within(1, 2));
  });
});
