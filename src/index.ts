import { IDictionary } from "common-types";

export interface IParallelDone {
  hadErrors: boolean;
  failed: string[];
  successfull: string[];
  errors: IDictionary<Error[]>;
  error?: Error;
}

export type ParallelTask<T> = Promise<T>;
export type ParallelDelayedTask<T> = () => Promise<T>;

export default class Parallel {
  private _tasks: any[] = [];
  private _errors: IDictionary<Error> = {};
  private _results: IDictionary = {};
  private _successful: string[] = [];
  private _failed: string[] = [];
  private _registrations: IDictionary = {};

  constructor(private options: IDictionary = { throw: true }) {
    if (options.throw === undefined) {
      options.throw = true;
    }
  }

  public addCallback<T = any>(name: string, options = {}) {
    const cb = (err: any, data: T) => {
      if (err) {
        this.handleFailure<T>(name, err);
      } else {
        this.handleSuccess<T>(name, data);
      }
    };
    this.register(name, options);

    return Promise.resolve(cb);
  }

  public add<T = any>(
    name: string,
    promise: ParallelTask<T> | ParallelDelayedTask<T>,
    options = {}
  ) {
    try {
      this.register(name, options);
      if (typeof promise === "function") {
        promise(); // start execution
      }
    } catch (e) {
      if (e.name === "NameAlreadyExists") {
        if (typeof promise === "function") {
          throw e;
        } else {
          const newName = Math.random()
            .toString(36)
            .substr(2, 10);
          console.warn(
            `The promise just added as "${name}" is a duplicate name to one already being managed but since the Promise is already executing we will give it a new name of "${newName}" and continue to manage it!`
          );
          this.register(newName, options);
          name = newName;
        }
      }
    }

    this._tasks.push(
      typeof promise === "function"
        ? promise()
            .then(result => this.handleSuccess<T>(name, result))
            .catch(err => this.handleFailure<T>(name, err))
        : promise
            .then(result => this.handleSuccess<T>(name, result))
            .catch(err => this.handleFailure<T>(name, err))
    );
  }

  public clear() {
    this._tasks = [];
    this._errors = {};
    this._results = {};
    this._successful = [];
    this._failed = [];
    this._registrations = {};
  }

  public async isDone() {
    return new Promise(async resolve => {
      await Promise.all(this._tasks);
      const hadErrors = this._failed.length > 0 ? true : false;
      let message =
        this._failed.length === 0
          ? `All parallel tasks were successful`
          : `${this._failed.length} of ${this._failed.length +
              this._successful.length} parallel tasks failed. Tasks failing were: \n`;
      let error = hadErrors ? new Error() : null;
      if (hadErrors) {
        if (this._failed.length === 1) {
          error = this._errors[this._failed[0]];
        } else {
          error.name = "MultipleError";
          message += Object.keys(this._errors)
            .map(task => `${task.toUpperCase()}: ${this._errors[task]}`)
            .join("\n");
          error.message = message;
        }
      }
      if (hadErrors && this.options.throw) {
        throw error;
      }

      resolve({
        hadErrors,
        failed: this._failed,
        successful: this._successful,
        errors: this._errors,
        results: this._results,
        error,
        message
      });
    });
  }

  private register(name: string, options: IDictionary) {
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
  }

  private handleSuccess<T>(name: string, result: T) {
    this._successful.push(name);
    this._results[name] = result as T;
  }

  private handleFailure<T>(name: string, err: Error) {
    this._failed.push(name);
    this._errors[name] = err;
  }
}
