function _typeof(obj) {
  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
    _typeof = function (obj) {
      return typeof obj;
    };
  } else {
    _typeof = function (obj) {
      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    };
  }

  return _typeof(obj);
}

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

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
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

var common_types_1 = require("common-types");

var ParallelError_1 = require("./ParallelError");

var TimeoutError_1 = require("./TimeoutError");

var ParallelError_2 = require("./ParallelError");

exports.ParallelError = ParallelError_2.ParallelError;

function isDelayedPromise(test) {
  return typeof test === "function" ? true : false;
}

function ensureObject(something) {
  return _typeof(something) === "object" ? something : {
    value: something
  };
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
    key: "_get",
    value: function _get$$1(prop) {
      var validGets = new Set(["failed", "successful", "errors", "results", "failFast", "registrations", "notifyOnFailure", "notifyOnSuccess"]);

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
          throw new ParallelError_1.ParallelError(this);
        }

        return this._results;
      });
    }
  }, {
    key: "isDoneAsArray",
    value: function isDoneAsArray(includeTaskIdAs) {
      return __awaiter(this, void 0, void 0, function* () {
        var hash = yield this.isDone();
        var results = [];
        Object.keys(hash).map(function (key) {
          var keyValue = hash[key];
          results.push(includeTaskIdAs ? Object.assign({}, ensureObject(keyValue), _defineProperty({}, includeTaskIdAs, key)) : keyValue);
        });
        return results;
      });
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
    key: "register",
    value: function register(name, promise, options) {
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

        this._tasks.push(this.promiseOnATimer(promise, name));
      }
    }
  }, {
    key: "_handleSuccess",
    value: function _handleSuccess(name, result) {
      this._successful.push(name);

      this._results[name] = result;
    }
  }, {
    key: "_handleFailure",
    value: function _handleFailure(name, err) {
      this._failed.push(name);

      this._errors[name] = Object.assign({}, err, {
        message: err.message,
        name: err.name,
        stack: err.stack
      });

      if (this._failFast) {
        throw new ParallelError_1.ParallelError(this);
      }
    }
  }, {
    key: "startDelayedTasks",
    value: function startDelayedTasks() {
      var _this = this;

      Object.keys(this._registrations).map(function (name) {
        var registration = _this._registrations[name];

        if (registration.deferred) {
          try {

            _this._tasks.push(_this.promiseOnATimer(registration.deferred(), name));
          } catch (e) {
            _this._handleFailure(name, e);
          }
        }
      });
    }
  }, {
    key: "promiseOnATimer",
    value: function promiseOnATimer(p, name) {
      var _this2 = this;

      var registration = this._registrations[name];

      var handleSuccess = function handleSuccess(result) {
        return _this2._handleSuccess(name, result);
      };

      var handleFailure = function handleFailure(err) {
        return _this2._handleFailure(name, err);
      };

      var timeout = function timeout(d) {
        return __awaiter(_this2, void 0, void 0, function* () {
          yield common_types_1.wait(d);
          throw new TimeoutError_1.default(registration.deferred, d);
        });
      };

      var duration = registration.timeout || 0;
      var timedPromise;

      try {
        if (duration > 0) {
          timedPromise = Promise.race([p, timeout(duration)]).then(handleSuccess).catch(handleFailure);
        } else {
          timedPromise = p.then(handleSuccess).catch(handleFailure);
        }

        this._tasks.push(timedPromise);

        return timedPromise;
      } catch (e) {
        this._handleFailure(name, e);
      }
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
