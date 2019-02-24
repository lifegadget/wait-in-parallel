import { IDictionary, wait } from "common-types";
import { ParallelError } from "./ParallelError";
import { TimeoutError } from "./TimeoutError";
export { ParallelError } from "./ParallelError";

function isDelayedPromise(test: any) {
  return typeof test === "function" ? true : false;
}
export interface IParallelDone {
  hadErrors: boolean;
  failed: string[];
  successfull: string[];
  errors: IDictionary<Error[]>;
  error?: Error;
}

export type DelayedPromise<T> = () => Promise<T>;
export type ParallelTask<T = any> = Promise<T> | DelayedPromise<T>;
export interface IParallelArrayType<T> {
  name: string;
  value: T;
  isArray: true;
}

export interface IParallelHashType<T> extends IDictionary<T> {
  isArray: undefined;
}

export type IParallelFailureNotification = (which: string, error: Error) => void;
export type IParallelSuccessNotification<T = any> = (which: string, result: T) => void;

function ensureObject(something: any): IDictionary {
  return typeof something === "object" ? something : { value: something };
}

export class Parallel<T = any> {
  private _tasks: any[] = [];
  private _errors: IDictionary<Error> = {};
  private _results: IDictionary = {};
  private _successful: string[] = [];
  private _failed: string[] = [];
  private _registrations: IDictionary = {};
  private _failFast: boolean = false;
  private _failureCallbacks: IParallelFailureNotification[] = [];
  private _successCallbacks: IParallelSuccessNotification[] = [];

  public static create(title?: string) {
    const obj = new Parallel(title);
    return obj;
  }

  constructor(public title?: string, private options: IDictionary = { throw: true }) {
    if (options.throw === undefined) {
      options.throw = true;
    }
  }

  /** a utility method to get certain private properties in the class */
  public _get(prop: string) {
    const validGets = new Set([
      "failed",
      "successful",
      "errors",
      "results",
      "failFast",
      "registrations",
      "notifyOnFailure",
      "notifyOnSuccess"
    ]);
    if (!validGets.has(prop)) {
      throw new Error(`"${prop}" is not a valid property to get.`);
    }
    return this[`_${prop}` as keyof this] as any;
  }

  public add<K = T>(name: string, promise: ParallelTask<K>, timeout?: number) {
    try {
      this.register<K>(name, promise, { timeout });
    } catch (e) {
      if (e.name === "NameAlreadyExists") {
        if (isDelayedPromise(promise)) {
          throw e;
        } else {
          const newName = Math.random()
            .toString(36)
            .substr(2, 10);
          console.error(
            `wait-in-parallel: The promise just added as "${name}" is a duplicate name to one already being managed but since the Promise is already executing we will give it a new name of "${newName}" and continue to manage it!`
          );
          this.register<K>(newName, promise, { timeout });
        }
      }
    }

    return this;
  }

  /**
   * Clears all the promises from this instance so it can be reused
   * for another parallel execution
   */
  public clear() {
    this._tasks = [];
    this._errors = {};
    this._results = {};
    this._successful = [];
    this._failed = [];
    this._registrations = {};
    this._failureCallbacks = [];
    this._successCallbacks = [];

    return this;
  }

  /**
   * Sets the mode of the parallelism to fail as soon as the first promise fails
   *
   * @param flag turns the state on or off but defaults to on (aka, fail fast) if left off
   */
  public failFast(flag?: boolean) {
    if (flag !== undefined) {
      this._failFast = flag;
    } else {
      this._failFast = true;
    }
    return this;
  }

  /**
   * Waits for all parallel tasks to complete and then returns
   * results. If failure occurs and error will be thrown.
   */
  public async isDone() {
    this.startDelayedTasks();
    try {
      await Promise.all(this._tasks);
    } catch (e) {
      throw e;
    }
    const hadErrors = this._failed.length > 0 ? true : false;
    if (hadErrors) {
      throw new ParallelError(this);
    }

    return this._results as IParallelHashType<T>;
  }

  public async isDoneAsArray(includeTaskIdAs?: string) {
    const hash = await this.isDone();
    const results: T[] = [];
    Object.keys(hash).map(key => {
      const keyValue: any = hash[key];
      results.push(
        includeTaskIdAs
          ? { ...ensureObject(keyValue), ...{ [includeTaskIdAs]: key } }
          : keyValue
      );
    });
    return results;
  }

  public notifyOnFailure(fn: IParallelFailureNotification) {
    this._failureCallbacks.push(fn);
    return this;
  }

  public notifyOnSuccess(fn: IParallelSuccessNotification) {
    this._successCallbacks.push(fn);
    return this;
  }

  private register<K = T>(name: string, promise: ParallelTask<K>, options: IDictionary) {
    const existing = new Set(Object.keys(this._registrations));
    if (existing.has(name)) {
      const e = new Error(
        `There is already a registered item using the name "${name}" in your Parallel object. Names must be unique, ignoring new addition.`
      );
      e.name = "NameAlreadyExists";
      throw e;
    } else {
      this._registrations[name] = options;
    }

    if (isDelayedPromise(promise)) {
      this._registrations[name].deferred = promise;
    } else {
      const duration = options.timeout || 0;
      this._tasks.push(this.promiseOnATimer(promise, name));
    }
  }

  private _handleSuccess<T>(name: string, result: T) {
    this._successful.push(name);
    this._results[name] = result as T;
  }

  private _handleFailure<T>(name: string, err: Error) {
    this._failed.push(name);
    this._errors[name] = {
      ...err,
      message: err.message,
      name: err.name,
      stack: err.stack
    };
    if (this._failFast) {
      throw new ParallelError(this);
    }
  }

  private startDelayedTasks() {
    Object.keys(this._registrations).map(name => {
      const registration = this._registrations[name];
      const handleSuccess = (result: any) => this._handleSuccess(name, result);
      const handleFailure = (err: Error) => this._handleFailure(name, err);
      const timeout = async (d: number) => {
        await wait(d);
        throw new TimeoutError(registration.deferred, d);
      };
      if (registration.deferred) {
        try {
          let p: any = () => registration.deferred();
          this._tasks.push(this.promiseOnATimer(registration.deferred(), name));
        } catch (e) {
          this._handleFailure(name, e);
        }
      }
    });
  }

  private promiseOnATimer(p: any, name: string) {
    const registration = this._registrations[name];
    const handleSuccess = (result: any) => this._handleSuccess(name, result);
    const handleFailure = (err: Error) => this._handleFailure(name, err);
    const timeout = async (d: number) => {
      await wait(d);
      throw new TimeoutError(registration.deferred, d);
    };

    const duration = registration.timeout || 0;
    let timedPromise;
    try {
      if (duration > 0) {
        timedPromise = Promise.race([p, timeout(duration)])
          .then(handleSuccess)
          .catch(handleFailure);
      } else {
        timedPromise = p.then(handleSuccess).catch(handleFailure);
      }
      this._tasks.push(timedPromise);
      return timedPromise;
    } catch (e) {
      this._handleFailure(name, e);
    }
  }
}
