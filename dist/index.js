(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (factory());
}(this, (function () { 'use strict';

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  var __awaiter = undefined && undefined.__awaiter || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }

      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }

      function step(result) {
        result.done ? resolve(result.value) : new P(function (resolve) {
          resolve(result.value);
        }).then(fulfilled, rejected);
      }

      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var ParallelError_1 = require("./ParallelError");

  var Timeout_1 = require("./Timeout");

  function isDelayedPromise(test) {
    return typeof test === "function" ? true : false;
  }

  var Parallel =
  /*#__PURE__*/
  function () {
    function Parallel() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {
        throw: true
      };

      _classCallCheck(this, Parallel);

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

    _createClass(Parallel, [{
      key: "get",
      value: function get(prop) {
        var validGets = new Set(["failed", "successful", "errors", "results", "failFast", "registrations"]);

        if (!validGets.has(prop)) {
          throw new Error("\"".concat(prop, "\" is not a valid property to get."));
        }

        return this["_".concat(prop)];
      }
    }, {
      key: "add",
      value: function add(name, promise, timeout) {
        try {
          this.register(name, promise, {
            timeout: timeout
          });
        } catch (e) {
          if (e.name === "NameAlreadyExists") {
            if (isDelayedPromise(promise)) {
              throw e;
            } else {
              var newName = Math.random().toString(36).substr(2, 10);
              console.error("wait-in-parallel: The promise just added as \"".concat(name, "\" is a duplicate name to one already being managed but since the Promise is already executing we will give it a new name of \"").concat(newName, "\" and continue to manage it!"));
              this.register(newName, promise, {
                timeout: timeout
              });
            }
          }
        }

        return this;
      }
    }, {
      key: "notifyOnFailure",
      value: function notifyOnFailure(fn) {
        this._failureCallbacks.push(fn);

        return this;
      }
    }, {
      key: "notifyOnSuccess",
      value: function notifyOnSuccess(fn) {
        this._successCallbacks.push(fn);

        return this;
      }
    }, {
      key: "clear",
      value: function clear() {
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
    }, {
      key: "failFast",
      value: function failFast(flag) {
        if (flag !== undefined) {
          this._failFast = flag;
        } else {
          this._failFast = true;
        }

        return this;
      }
    }, {
      key: "isDone",
      value: function isDone() {
        return __awaiter(this, void 0, void 0, function* () {
          this.startDelayedTasks();
          yield Promise.all(this._tasks);
          var hadErrors = this._failed.length > 0 ? true : false;

          if (hadErrors) {
            throw new ParallelError_1.default(this);
          }

          return this._results;
        });
      }
    }, {
      key: "register",
      value: function register(name, promise, options) {
        var _this = this;

        var existing = new Set(Object.keys(this._registrations));

        if (existing.has(name)) {
          var e = new Error("There is already a registered item using the name \"".concat(name, "\" in your Parallel object. Names must be unique, ignoring new addition."));
          e.name = "NameAlreadyExists";
          throw e;
        } else {
          this._registrations[name] = options;
        }

        if (isDelayedPromise(promise)) {
          this._registrations[name].deferred = promise;
        } else {
          var duration = options.timeout || 0;

          this._tasks.push(Timeout_1.default(promise, duration).then(function (result) {
            return _this.handleSuccess(name, result);
          }).catch(function (err) {
            return _this.handleFailure(name, err);
          }));
        }
      }
    }, {
      key: "handleSuccess",
      value: function handleSuccess(name, result) {
        this._successful.push(name);

        this._results[name] = result;
      }
    }, {
      key: "handleFailure",
      value: function handleFailure(name, err) {
        this._failed.push(name);

        this._errors[name] = err;

        if (this._failFast) {
          throw new ParallelError_1.default(this);
        }
      }
    }, {
      key: "startDelayedTasks",
      value: function startDelayedTasks() {
        var _this2 = this;

        Object.keys(this._registrations).map(function (name) {
          var registration = _this2._registrations[name];

          if (registration.deferred) {
            var duration = registration.timeout || 0;

            try {
              _this2._tasks.push(Timeout_1.default(registration.deferred(), duration).then(function (result) {
                return _this2.handleSuccess(name, result);
              }).catch(function (err) {
                return _this2.handleFailure(name, err);
              }));
            } catch (e) {
              _this2.handleFailure(name, e);
            }
          }
        });
      }
    }], [{
      key: "create",
      value: function create() {
        var obj = new Parallel();
        return obj;
      }
    }]);

    return Parallel;
  }();

  exports.default = Parallel;

})));
