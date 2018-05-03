var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import ParallelError from "./ParallelError";
import timeout from "./Timeout";
function isDelayedPromise(test) {
    return typeof test === "function" ? true : false;
}
export default class Parallel {
    constructor(options = { throw: true }) {
        this.options = options;
        this._tasks = [];
        this._errors = {};
        this._results = {};
        this._successful = [];
        this._failed = [];
        this._registrations = {};
        this._failFast = false;
        this._failureCallbacks = [];
        this._successCallbacks = [];
        if (options.throw === undefined) {
            options.throw = true;
        }
    }
    static create() {
        const obj = new Parallel();
        return obj;
    }
    get(prop) {
        const validGets = new Set([
            "failed",
            "successful",
            "errors",
            "results",
            "failFast",
            "registrations"
        ]);
        if (!validGets.has(prop)) {
            throw new Error(`"${prop}" is not a valid property to get.`);
        }
        return this[`_${prop}`];
    }
    add(name, promise, timeout) {
        try {
            this.register(name, promise, { timeout });
        }
        catch (e) {
            if (e.name === "NameAlreadyExists") {
                if (isDelayedPromise(promise)) {
                    throw e;
                }
                else {
                    const newName = Math.random()
                        .toString(36)
                        .substr(2, 10);
                    console.error(`wait-in-parallel: The promise just added as "${name}" is a duplicate name to one already being managed but since the Promise is already executing we will give it a new name of "${newName}" and continue to manage it!`);
                    this.register(newName, promise, { timeout });
                }
            }
        }
        return this;
    }
    notifyOnFailure(fn) {
        this._failureCallbacks.push(fn);
        return this;
    }
    notifyOnSuccess(fn) {
        this._successCallbacks.push(fn);
        return this;
    }
    clear() {
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
    failFast(flag) {
        if (flag !== undefined) {
            this._failFast = flag;
        }
        else {
            this._failFast = true;
        }
        return this;
    }
    isDone() {
        return __awaiter(this, void 0, void 0, function* () {
            this.startDelayedTasks();
            yield Promise.all(this._tasks);
            const hadErrors = this._failed.length > 0 ? true : false;
            if (hadErrors) {
                throw new ParallelError(this);
            }
            return this._results;
        });
    }
    register(name, promise, options) {
        const existing = new Set(Object.keys(this._registrations));
        if (existing.has(name)) {
            const e = new Error(`There is already a registered item using the name "${name}" in your Parallel object. Names must be unique, ignoring new addition.`);
            e.name = "NameAlreadyExists";
            throw e;
        }
        else {
            this._registrations[name] = options;
        }
        if (isDelayedPromise(promise)) {
            this._registrations[name].deferred = promise;
        }
        else {
            const duration = options.timeout || 0;
            this._tasks.push(timeout(promise, duration)
                .then(result => this.handleSuccess(name, result))
                .catch((err) => this.handleFailure(name, err)));
        }
    }
    handleSuccess(name, result) {
        this._successful.push(name);
        this._results[name] = result;
    }
    handleFailure(name, err) {
        this._failed.push(name);
        this._errors[name] = err;
        if (this._failFast) {
            throw new ParallelError(this);
        }
    }
    startDelayedTasks() {
        Object.keys(this._registrations).map(name => {
            const registration = this._registrations[name];
            if (registration.deferred) {
                const duration = registration.timeout || 0;
                try {
                    this._tasks.push(timeout(registration.deferred(), duration)
                        .then((result) => this.handleSuccess(name, result))
                        .catch((err) => this.handleFailure(name, err)));
                }
                catch (e) {
                    this.handleFailure(name, e);
                }
            }
        });
    }
}
