'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var commonTypes = require('common-types');

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

const first = require("lodash.first");
function firstKey(dictionary) {
    return first(Object.keys(dictionary));
}
class ParallelError extends Error {
    constructor(context) {
        super();
        this.name = "ParallelError";
        const successful = context._get("successful");
        const failed = context._get("failed");
        const errors = context._get("errors");
        const results = context._get("results");
        const registrations = context._get("registrations");
        const getFirstErrorLocation = (stack) => {
            if (!stack) {
                return "";
            }
            const lines = stack.split(/\n/).map(l => l.replace(/^.*at /, "").split("("));
            lines.shift().filter(i => !i.includes("createError"));
            let [fn, where] = lines[0];
            where = where
                ? where
                    .split("/")
                    .slice(-1)[0]
                    .replace(")", "")
                : null;
            fn = fn.trim();
            return where ? `@ ${fn}::${where}` : `@ ${fn}`;
        };
        this.name = "ParallelError";
        const errorSummary = failed
            .map((f) => {
            const inspect = (e) => {
                const subErrors = [];
                const subError = e.errors;
                Object.keys(subError).map(k => subErrors.push(`${k}: ${subError[k].name} ${getFirstErrorLocation(subError[k].stack)}`));
                return subErrors.join(", ");
            };
            return errors[f].name === "ParallelError"
                ? `\n  - ${f} [ParallelError ${context.title ? context.title : ""} { ${inspect(errors[f])} }]`
                : `\n  - ${f} [${errors[f].code ? `${errors[f].name}:${errors[f].code}` : errors[f].name} ${getFirstErrorLocation(errors[f].stack)}]`;
        })
            .join(", ");
        this.message = `${context.title ? context.title + ": " : ""}${context._get("failed").length} of ${failed.length +
            successful.length} parallel tasks failed.\nTasks failing were: ${errorSummary}."`;
        this.message +=
            Object.keys(errors).length > 0
                ? `\n\nFirst error message was: ${(errors[firstKey(errors)].message)}`
                : "";
        this.errors = errors;
        this.failed = failed;
        this.successful = successful;
        this.results = results;
        if (context.failFast) {
            const complete = new Set([...successful, ...failed]);
            const incomplete = Object.keys(registrations).filter(k => !complete.has(k));
            this.incomplete = incomplete;
        }
    }
}

class TimeoutError extends Error {
    constructor(attemptedPromise, duration) {
        super();
        this.name = "TimeoutError";
        this.message = `Timed out after ${duration}ms`;
    }
}

function isDelayedPromise(test) {
    return typeof test === "function" ? true : false;
}
function ensureObject(something) {
    return typeof something === "object" ? something : { value: something };
}
class Parallel {
    constructor(title, options = { throw: true }) {
        this.title = title;
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
    static create(title) {
        const obj = new Parallel(title);
        return obj;
    }
    _get(prop) {
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
            try {
                yield Promise.all(this._tasks);
            }
            catch (e) {
                throw e;
            }
            const hadErrors = this._failed.length > 0 ? true : false;
            if (hadErrors) {
                throw new ParallelError(this);
            }
            return this._results;
        });
    }
    isDoneAsArray(includeTaskIdAs) {
        return __awaiter(this, void 0, void 0, function* () {
            const hash = yield this.isDone();
            const results = [];
            Object.keys(hash).map(key => {
                const keyValue = hash[key];
                results.push(includeTaskIdAs
                    ? Object.assign({}, ensureObject(keyValue), { [includeTaskIdAs]: key }) : keyValue);
            });
            return results;
        });
    }
    notifyOnFailure(fn) {
        this._failureCallbacks.push(fn);
        return this;
    }
    notifyOnSuccess(fn) {
        this._successCallbacks.push(fn);
        return this;
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
            this._tasks.push(this.promiseOnATimer(promise, name));
        }
    }
    _handleSuccess(name, result) {
        this._successful.push(name);
        this._results[name] = result;
    }
    _handleFailure(name, err) {
        this._failed.push(name);
        this._errors[name] = Object.assign({}, err, { message: err.message, name: err.name, stack: err.stack });
        if (this._failFast) {
            throw new ParallelError(this);
        }
    }
    startDelayedTasks() {
        Object.keys(this._registrations).map(name => {
            const registration = this._registrations[name];
            if (registration.deferred) {
                try {
                    this._tasks.push(this.promiseOnATimer(registration.deferred(), name));
                }
                catch (e) {
                    this._handleFailure(name, e);
                }
            }
        });
    }
    promiseOnATimer(p, name) {
        const registration = this._registrations[name];
        const handleSuccess = (result) => this._handleSuccess(name, result);
        const handleFailure = (err) => this._handleFailure(name, err);
        const timeout = (d) => __awaiter(this, void 0, void 0, function* () {
            yield commonTypes.wait(d);
            throw new TimeoutError(registration.deferred, d);
        });
        const duration = registration.timeout || 0;
        let timedPromise;
        try {
            if (duration > 0) {
                timedPromise = Promise.race([p, timeout(duration)])
                    .then(handleSuccess)
                    .catch(handleFailure);
            }
            else {
                timedPromise = p.then(handleSuccess).catch(handleFailure);
            }
            this._tasks.push(timedPromise);
            return timedPromise;
        }
        catch (e) {
            this._handleFailure(name, e);
        }
    }
}

exports.Parallel = Parallel;
exports.ParallelError = ParallelError;
//# sourceMappingURL=wait-in-parallel.cjs.js.map
