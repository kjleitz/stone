(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
//     Underscore.js 1.8.3
//     http://underscorejs.org
//     (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind,
    nativeCreate       = Object.create;

  // Naked function reference for surrogate-prototype-swapping.
  var Ctor = function(){};

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.8.3';

  // Internal function that returns an efficient (for current engines) version
  // of the passed-in callback, to be repeatedly applied in other Underscore
  // functions.
  var optimizeCb = function(func, context, argCount) {
    if (context === void 0) return func;
    switch (argCount == null ? 3 : argCount) {
      case 1: return function(value) {
        return func.call(context, value);
      };
      case 2: return function(value, other) {
        return func.call(context, value, other);
      };
      case 3: return function(value, index, collection) {
        return func.call(context, value, index, collection);
      };
      case 4: return function(accumulator, value, index, collection) {
        return func.call(context, accumulator, value, index, collection);
      };
    }
    return function() {
      return func.apply(context, arguments);
    };
  };

  // A mostly-internal function to generate callbacks that can be applied
  // to each element in a collection, returning the desired result — either
  // identity, an arbitrary callback, a property matcher, or a property accessor.
  var cb = function(value, context, argCount) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return optimizeCb(value, context, argCount);
    if (_.isObject(value)) return _.matcher(value);
    return _.property(value);
  };
  _.iteratee = function(value, context) {
    return cb(value, context, Infinity);
  };

  // An internal function for creating assigner functions.
  var createAssigner = function(keysFunc, undefinedOnly) {
    return function(obj) {
      var length = arguments.length;
      if (length < 2 || obj == null) return obj;
      for (var index = 1; index < length; index++) {
        var source = arguments[index],
            keys = keysFunc(source),
            l = keys.length;
        for (var i = 0; i < l; i++) {
          var key = keys[i];
          if (!undefinedOnly || obj[key] === void 0) obj[key] = source[key];
        }
      }
      return obj;
    };
  };

  // An internal function for creating a new object that inherits from another.
  var baseCreate = function(prototype) {
    if (!_.isObject(prototype)) return {};
    if (nativeCreate) return nativeCreate(prototype);
    Ctor.prototype = prototype;
    var result = new Ctor;
    Ctor.prototype = null;
    return result;
  };

  var property = function(key) {
    return function(obj) {
      return obj == null ? void 0 : obj[key];
    };
  };

  // Helper for collection methods to determine whether a collection
  // should be iterated as an array or as an object
  // Related: http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
  // Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
  var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
  var getLength = property('length');
  var isArrayLike = function(collection) {
    var length = getLength(collection);
    return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
  };

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles raw objects in addition to array-likes. Treats all
  // sparse array-likes as if they were dense.
  _.each = _.forEach = function(obj, iteratee, context) {
    iteratee = optimizeCb(iteratee, context);
    var i, length;
    if (isArrayLike(obj)) {
      for (i = 0, length = obj.length; i < length; i++) {
        iteratee(obj[i], i, obj);
      }
    } else {
      var keys = _.keys(obj);
      for (i = 0, length = keys.length; i < length; i++) {
        iteratee(obj[keys[i]], keys[i], obj);
      }
    }
    return obj;
  };

  // Return the results of applying the iteratee to each element.
  _.map = _.collect = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length,
        results = Array(length);
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      results[index] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  };

  // Create a reducing function iterating left or right.
  function createReduce(dir) {
    // Optimized iterator function as using arguments.length
    // in the main function will deoptimize the, see #1991.
    function iterator(obj, iteratee, memo, keys, index, length) {
      for (; index >= 0 && index < length; index += dir) {
        var currentKey = keys ? keys[index] : index;
        memo = iteratee(memo, obj[currentKey], currentKey, obj);
      }
      return memo;
    }

    return function(obj, iteratee, memo, context) {
      iteratee = optimizeCb(iteratee, context, 4);
      var keys = !isArrayLike(obj) && _.keys(obj),
          length = (keys || obj).length,
          index = dir > 0 ? 0 : length - 1;
      // Determine the initial value if none is provided.
      if (arguments.length < 3) {
        memo = obj[keys ? keys[index] : index];
        index += dir;
      }
      return iterator(obj, iteratee, memo, keys, index, length);
    };
  }

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`.
  _.reduce = _.foldl = _.inject = createReduce(1);

  // The right-associative version of reduce, also known as `foldr`.
  _.reduceRight = _.foldr = createReduce(-1);

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var key;
    if (isArrayLike(obj)) {
      key = _.findIndex(obj, predicate, context);
    } else {
      key = _.findKey(obj, predicate, context);
    }
    if (key !== void 0 && key !== -1) return obj[key];
  };

  // Return all the elements that pass a truth test.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    predicate = cb(predicate, context);
    _.each(obj, function(value, index, list) {
      if (predicate(value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, _.negate(cb(predicate)), context);
  };

  // Determine whether all of the elements match a truth test.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (!predicate(obj[currentKey], currentKey, obj)) return false;
    }
    return true;
  };

  // Determine if at least one element in the object matches a truth test.
  // Aliased as `any`.
  _.some = _.any = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (predicate(obj[currentKey], currentKey, obj)) return true;
    }
    return false;
  };

  // Determine if the array or object contains a given item (using `===`).
  // Aliased as `includes` and `include`.
  _.contains = _.includes = _.include = function(obj, item, fromIndex, guard) {
    if (!isArrayLike(obj)) obj = _.values(obj);
    if (typeof fromIndex != 'number' || guard) fromIndex = 0;
    return _.indexOf(obj, item, fromIndex) >= 0;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      var func = isFunc ? method : value[method];
      return func == null ? func : func.apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matcher(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matcher(attrs));
  };

  // Return the maximum element (or element-based computation).
  _.max = function(obj, iteratee, context) {
    var result = -Infinity, lastComputed = -Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value > result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iteratee, context) {
    var result = Infinity, lastComputed = Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value < result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed < lastComputed || computed === Infinity && result === Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Shuffle a collection, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var set = isArrayLike(obj) ? obj : _.values(obj);
    var length = set.length;
    var shuffled = Array(length);
    for (var index = 0, rand; index < length; index++) {
      rand = _.random(0, index);
      if (rand !== index) shuffled[index] = shuffled[rand];
      shuffled[rand] = set[index];
    }
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (!isArrayLike(obj)) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // Sort the object's values by a criterion produced by an iteratee.
  _.sortBy = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iteratee(value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iteratee, context) {
      var result = {};
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index) {
        var key = iteratee(value, index, obj);
        behavior(result, value, key);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key].push(value); else result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, value, key) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key]++; else result[key] = 1;
  });

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (isArrayLike(obj)) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return isArrayLike(obj) ? obj.length : _.keys(obj).length;
  };

  // Split a collection into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var pass = [], fail = [];
    _.each(obj, function(value, key, obj) {
      (predicate(value, key, obj) ? pass : fail).push(value);
    });
    return [pass, fail];
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[0];
    return _.initial(array, array.length - n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[array.length - 1];
    return _.rest(array, Math.max(0, array.length - n));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, n == null || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, strict, startIndex) {
    var output = [], idx = 0;
    for (var i = startIndex || 0, length = getLength(input); i < length; i++) {
      var value = input[i];
      if (isArrayLike(value) && (_.isArray(value) || _.isArguments(value))) {
        //flatten current level of array or arguments object
        if (!shallow) value = flatten(value, shallow, strict);
        var j = 0, len = value.length;
        output.length += len;
        while (j < len) {
          output[idx++] = value[j++];
        }
      } else if (!strict) {
        output[idx++] = value;
      }
    }
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, false);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iteratee, context) {
    if (!_.isBoolean(isSorted)) {
      context = iteratee;
      iteratee = isSorted;
      isSorted = false;
    }
    if (iteratee != null) iteratee = cb(iteratee, context);
    var result = [];
    var seen = [];
    for (var i = 0, length = getLength(array); i < length; i++) {
      var value = array[i],
          computed = iteratee ? iteratee(value, i, array) : value;
      if (isSorted) {
        if (!i || seen !== computed) result.push(value);
        seen = computed;
      } else if (iteratee) {
        if (!_.contains(seen, computed)) {
          seen.push(computed);
          result.push(value);
        }
      } else if (!_.contains(result, value)) {
        result.push(value);
      }
    }
    return result;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(flatten(arguments, true, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var result = [];
    var argsLength = arguments.length;
    for (var i = 0, length = getLength(array); i < length; i++) {
      var item = array[i];
      if (_.contains(result, item)) continue;
      for (var j = 1; j < argsLength; j++) {
        if (!_.contains(arguments[j], item)) break;
      }
      if (j === argsLength) result.push(item);
    }
    return result;
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = flatten(arguments, true, true, 1);
    return _.filter(array, function(value){
      return !_.contains(rest, value);
    });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    return _.unzip(arguments);
  };

  // Complement of _.zip. Unzip accepts an array of arrays and groups
  // each array's elements on shared indices
  _.unzip = function(array) {
    var length = array && _.max(array, getLength).length || 0;
    var result = Array(length);

    for (var index = 0; index < length; index++) {
      result[index] = _.pluck(array, index);
    }
    return result;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    var result = {};
    for (var i = 0, length = getLength(list); i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // Generator function to create the findIndex and findLastIndex functions
  function createPredicateIndexFinder(dir) {
    return function(array, predicate, context) {
      predicate = cb(predicate, context);
      var length = getLength(array);
      var index = dir > 0 ? 0 : length - 1;
      for (; index >= 0 && index < length; index += dir) {
        if (predicate(array[index], index, array)) return index;
      }
      return -1;
    };
  }

  // Returns the first index on an array-like that passes a predicate test
  _.findIndex = createPredicateIndexFinder(1);
  _.findLastIndex = createPredicateIndexFinder(-1);

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iteratee, context) {
    iteratee = cb(iteratee, context, 1);
    var value = iteratee(obj);
    var low = 0, high = getLength(array);
    while (low < high) {
      var mid = Math.floor((low + high) / 2);
      if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
    }
    return low;
  };

  // Generator function to create the indexOf and lastIndexOf functions
  function createIndexFinder(dir, predicateFind, sortedIndex) {
    return function(array, item, idx) {
      var i = 0, length = getLength(array);
      if (typeof idx == 'number') {
        if (dir > 0) {
            i = idx >= 0 ? idx : Math.max(idx + length, i);
        } else {
            length = idx >= 0 ? Math.min(idx + 1, length) : idx + length + 1;
        }
      } else if (sortedIndex && idx && length) {
        idx = sortedIndex(array, item);
        return array[idx] === item ? idx : -1;
      }
      if (item !== item) {
        idx = predicateFind(slice.call(array, i, length), _.isNaN);
        return idx >= 0 ? idx + i : -1;
      }
      for (idx = dir > 0 ? i : length - 1; idx >= 0 && idx < length; idx += dir) {
        if (array[idx] === item) return idx;
      }
      return -1;
    };
  }

  // Return the position of the first occurrence of an item in an array,
  // or -1 if the item is not included in the array.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = createIndexFinder(1, _.findIndex, _.sortedIndex);
  _.lastIndexOf = createIndexFinder(-1, _.findLastIndex);

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (stop == null) {
      stop = start || 0;
      start = 0;
    }
    step = step || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var range = Array(length);

    for (var idx = 0; idx < length; idx++, start += step) {
      range[idx] = start;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Determines whether to execute a function as a constructor
  // or a normal function with the provided arguments
  var executeBound = function(sourceFunc, boundFunc, context, callingContext, args) {
    if (!(callingContext instanceof boundFunc)) return sourceFunc.apply(context, args);
    var self = baseCreate(sourceFunc.prototype);
    var result = sourceFunc.apply(self, args);
    if (_.isObject(result)) return result;
    return self;
  };

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError('Bind must be called on a function');
    var args = slice.call(arguments, 2);
    var bound = function() {
      return executeBound(func, bound, context, this, args.concat(slice.call(arguments)));
    };
    return bound;
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    var bound = function() {
      var position = 0, length = boundArgs.length;
      var args = Array(length);
      for (var i = 0; i < length; i++) {
        args[i] = boundArgs[i] === _ ? arguments[position++] : boundArgs[i];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return executeBound(func, bound, this, this, args);
    };
    return bound;
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var i, length = arguments.length, key;
    if (length <= 1) throw new Error('bindAll must be passed function names');
    for (i = 1; i < length; i++) {
      key = arguments[i];
      obj[key] = _.bind(obj[key], obj);
    }
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memoize = function(key) {
      var cache = memoize.cache;
      var address = '' + (hasher ? hasher.apply(this, arguments) : key);
      if (!_.has(cache, address)) cache[address] = func.apply(this, arguments);
      return cache[address];
    };
    memoize.cache = {};
    return memoize;
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){
      return func.apply(null, args);
    }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = _.partial(_.delay, _, 1);

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;

      if (last < wait && last >= 0) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          if (!timeout) context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) timeout = setTimeout(later, wait);
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a negated version of the passed-in predicate.
  _.negate = function(predicate) {
    return function() {
      return !predicate.apply(this, arguments);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var args = arguments;
    var start = args.length - 1;
    return function() {
      var i = start;
      var result = args[start].apply(this, arguments);
      while (i--) result = args[i].call(this, result);
      return result;
    };
  };

  // Returns a function that will only be executed on and after the Nth call.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Returns a function that will only be executed up to (but not including) the Nth call.
  _.before = function(times, func) {
    var memo;
    return function() {
      if (--times > 0) {
        memo = func.apply(this, arguments);
      }
      if (times <= 1) func = null;
      return memo;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = _.partial(_.before, 2);

  // Object Functions
  // ----------------

  // Keys in IE < 9 that won't be iterated by `for key in ...` and thus missed.
  var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString');
  var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString',
                      'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];

  function collectNonEnumProps(obj, keys) {
    var nonEnumIdx = nonEnumerableProps.length;
    var constructor = obj.constructor;
    var proto = (_.isFunction(constructor) && constructor.prototype) || ObjProto;

    // Constructor is a special case.
    var prop = 'constructor';
    if (_.has(obj, prop) && !_.contains(keys, prop)) keys.push(prop);

    while (nonEnumIdx--) {
      prop = nonEnumerableProps[nonEnumIdx];
      if (prop in obj && obj[prop] !== proto[prop] && !_.contains(keys, prop)) {
        keys.push(prop);
      }
    }
  }

  // Retrieve the names of an object's own properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve all the property names of an object.
  _.allKeys = function(obj) {
    if (!_.isObject(obj)) return [];
    var keys = [];
    for (var key in obj) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Returns the results of applying the iteratee to each element of the object
  // In contrast to _.map it returns an object
  _.mapObject = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys =  _.keys(obj),
          length = keys.length,
          results = {},
          currentKey;
      for (var index = 0; index < length; index++) {
        currentKey = keys[index];
        results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
      }
      return results;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = createAssigner(_.allKeys);

  // Assigns a given object with all the own properties in the passed-in object(s)
  // (https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
  _.extendOwn = _.assign = createAssigner(_.keys);

  // Returns the first key on an object that passes a predicate test
  _.findKey = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = _.keys(obj), key;
    for (var i = 0, length = keys.length; i < length; i++) {
      key = keys[i];
      if (predicate(obj[key], key, obj)) return key;
    }
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(object, oiteratee, context) {
    var result = {}, obj = object, iteratee, keys;
    if (obj == null) return result;
    if (_.isFunction(oiteratee)) {
      keys = _.allKeys(obj);
      iteratee = optimizeCb(oiteratee, context);
    } else {
      keys = flatten(arguments, false, false, 1);
      iteratee = function(value, key, obj) { return key in obj; };
      obj = Object(obj);
    }
    for (var i = 0, length = keys.length; i < length; i++) {
      var key = keys[i];
      var value = obj[key];
      if (iteratee(value, key, obj)) result[key] = value;
    }
    return result;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj, iteratee, context) {
    if (_.isFunction(iteratee)) {
      iteratee = _.negate(iteratee);
    } else {
      var keys = _.map(flatten(arguments, false, false, 1), String);
      iteratee = function(value, key) {
        return !_.contains(keys, key);
      };
    }
    return _.pick(obj, iteratee, context);
  };

  // Fill in a given object with default properties.
  _.defaults = createAssigner(_.allKeys, true);

  // Creates an object that inherits from the given prototype object.
  // If additional properties are provided then they will be added to the
  // created object.
  _.create = function(prototype, props) {
    var result = baseCreate(prototype);
    if (props) _.extendOwn(result, props);
    return result;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Returns whether an object has a given set of `key:value` pairs.
  _.isMatch = function(object, attrs) {
    var keys = _.keys(attrs), length = keys.length;
    if (object == null) return !length;
    var obj = Object(object);
    for (var i = 0; i < length; i++) {
      var key = keys[i];
      if (attrs[key] !== obj[key] || !(key in obj)) return false;
    }
    return true;
  };


  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a === 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className !== toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, regular expressions, dates, and booleans are compared by value.
      case '[object RegExp]':
      // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return '' + a === '' + b;
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive.
        // Object(NaN) is equivalent to NaN
        if (+a !== +a) return +b !== +b;
        // An `egal` comparison is performed for other numeric values.
        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a === +b;
    }

    var areArrays = className === '[object Array]';
    if (!areArrays) {
      if (typeof a != 'object' || typeof b != 'object') return false;

      // Objects with different constructors are not equivalent, but `Object`s or `Array`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
                               _.isFunction(bCtor) && bCtor instanceof bCtor)
                          && ('constructor' in a && 'constructor' in b)) {
        return false;
      }
    }
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.

    // Initializing stack of traversed objects.
    // It's done here since we only need them for objects and arrays comparison.
    aStack = aStack || [];
    bStack = bStack || [];
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] === a) return bStack[length] === b;
    }

    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);

    // Recursively compare objects and arrays.
    if (areArrays) {
      // Compare array lengths to determine if a deep comparison is necessary.
      length = a.length;
      if (length !== b.length) return false;
      // Deep compare the contents, ignoring non-numeric properties.
      while (length--) {
        if (!eq(a[length], b[length], aStack, bStack)) return false;
      }
    } else {
      // Deep compare objects.
      var keys = _.keys(a), key;
      length = keys.length;
      // Ensure that both objects contain the same number of properties before comparing deep equality.
      if (_.keys(b).length !== length) return false;
      while (length--) {
        // Deep compare each member
        key = keys[length];
        if (!(_.has(b, key) && eq(a[key], b[key], aStack, bStack))) return false;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return true;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (isArrayLike(obj) && (_.isArray(obj) || _.isString(obj) || _.isArguments(obj))) return obj.length === 0;
    return _.keys(obj).length === 0;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) === '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError.
  _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) === '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE < 9), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return _.has(obj, 'callee');
    };
  }

  // Optimize `isFunction` if appropriate. Work around some typeof bugs in old v8,
  // IE 11 (#1621), and in Safari 8 (#1929).
  if (typeof /./ != 'function' && typeof Int8Array != 'object') {
    _.isFunction = function(obj) {
      return typeof obj == 'function' || false;
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj !== +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return obj != null && hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iteratees.
  _.identity = function(value) {
    return value;
  };

  // Predicate-generating functions. Often useful outside of Underscore.
  _.constant = function(value) {
    return function() {
      return value;
    };
  };

  _.noop = function(){};

  _.property = property;

  // Generates a function for a given object that returns a given property.
  _.propertyOf = function(obj) {
    return obj == null ? function(){} : function(key) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of
  // `key:value` pairs.
  _.matcher = _.matches = function(attrs) {
    attrs = _.extendOwn({}, attrs);
    return function(obj) {
      return _.isMatch(obj, attrs);
    };
  };

  // Run a function **n** times.
  _.times = function(n, iteratee, context) {
    var accum = Array(Math.max(0, n));
    iteratee = optimizeCb(iteratee, context, 1);
    for (var i = 0; i < n; i++) accum[i] = iteratee(i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() {
    return new Date().getTime();
  };

   // List of HTML entities for escaping.
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };
  var unescapeMap = _.invert(escapeMap);

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  var createEscaper = function(map) {
    var escaper = function(match) {
      return map[match];
    };
    // Regexes for identifying a key that needs to be escaped
    var source = '(?:' + _.keys(map).join('|') + ')';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');
    return function(string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  };
  _.escape = createEscaper(escapeMap);
  _.unescape = createEscaper(unescapeMap);

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property, fallback) {
    var value = object == null ? void 0 : object[property];
    if (value === void 0) {
      value = fallback;
    }
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\u2028|\u2029/g;

  var escapeChar = function(match) {
    return '\\' + escapes[match];
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  // NB: `oldSettings` only exists for backwards compatibility.
  _.template = function(text, settings, oldSettings) {
    if (!settings && oldSettings) settings = oldSettings;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset).replace(escaper, escapeChar);
      index = offset + match.length;

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      } else if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      } else if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }

      // Adobe VMs need the match returned to produce the correct offest.
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + 'return __p;\n';

    try {
      var render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled source as a convenience for precompilation.
    var argument = settings.variable || 'obj';
    template.source = 'function(' + argument + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function. Start chaining a wrapped Underscore object.
  _.chain = function(obj) {
    var instance = _(obj);
    instance._chain = true;
    return instance;
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(instance, obj) {
    return instance._chain ? _(obj).chain() : obj;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    _.each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result(this, func.apply(_, args));
      };
    });
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
      return result(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  _.each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result(this, method.apply(this._wrapped, arguments));
    };
  });

  // Extracts the result from a wrapped and chained object.
  _.prototype.value = function() {
    return this._wrapped;
  };

  // Provide unwrapping proxy for some methods used in engine operations
  // such as arithmetic and JSON stringification.
  _.prototype.valueOf = _.prototype.toJSON = _.prototype.value;

  _.prototype.toString = function() {
    return '' + this._wrapped;
  };

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}.call(this));

},{}],2:[function(require,module,exports){
'use strict';

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _lexer = require('./lexer.js');

var _lexer2 = _interopRequireDefault(_lexer);

var _syntaxer = require('./syntaxer.js');

var _syntaxer2 = _interopRequireDefault(_syntaxer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// for testing it out in chrome/dev tools... don't judge
window.addEventListener('load', function () {
  window._ = _underscore2.default;
  window.Lexer = _lexer2.default;
  window.Syntaxer = _syntaxer2.default;
  window.fileText = "foo = 'me \"says\":'\ndef bar(baz):Str\n  abc = 'hi, how\\'s it going?'\n  return baz + abc\n\n# this is just a comment\nbar(foo)";
  window.lex = new _lexer2.default({ fileText: window.fileText });

  var brainstormXHR = new XMLHttpRequest();
  brainstormXHR.open('GET', '/brainstorm.stone');
  brainstormXHR.onreadystatechange = function (event) {
    if (event.target.readyState === 4) {
      window.stoneFileText = event.target.responseText;
      window.stoneLex = new _lexer2.default({ fileText: window.stoneFileText });
      window.stoneSyn = new _syntaxer2.default({ tokenList: window.stoneLex.traverse() });
    }
  };
  brainstormXHR.send();

  var simpleTestXHR = new XMLHttpRequest();
  simpleTestXHR.open('GET', '/test.stone');
  simpleTestXHR.onreadystatechange = function (event) {
    if (event.target.readyState === 4) {
      window.simpleTestText = event.target.responseText;
      window.simpleTestLex = new _lexer2.default({ fileText: window.simpleTestText });
      window.simpleTestSyn = new _syntaxer2.default({ tokenList: window.simpleTestLex.traverse() });
    }
  };
  simpleTestXHR.send();
});

},{"./lexer.js":3,"./syntaxer.js":4,"underscore":1}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var TOKEN = {
  types: ['whitespace', 'comment', 'word', 'string', 'number', 'regex', 'operator', 'grouping', 'delimiter'],

  ignorableTypes: ['whitespace', 'comment'],

  names: {
    word: {
      // primitive types
      Bool: 'Boolean',
      Boolean: 'Boolean',
      Null: 'Null',
      Num: 'Number',
      Number: 'Number',
      Obj: 'Object',
      Object: 'Object',
      Str: 'String',
      String: 'String',

      // special values
      false: 'false',
      null: 'null',
      this: 'this',
      true: 'true',
      super: 'super',

      // logical flow
      else: 'else',
      if: 'if',
      raise: 'raise',
      return: 'return',

      // declaration
      extends: 'extends',
      def: 'def',
      proto: 'proto',
      set: 'set',
      shaped: 'shaped'

      // anything else is 'identifier'
    },

    operator: {
      // dispatch
      '.': 'dot',
      ':': 'colon', // not sure if this is more dispatch or assignment

      // assignment
      '=': 'equals',

      // math
      '/': 'slash',
      '%': 'modulo',
      '-': 'minus',
      '+': 'plus',
      '*': 'star',
      '**': 'starStar',

      // comparison
      '==': 'equalTo',
      '>': 'greaterThan',
      '>=': 'greaterThanOrEqualTo',
      '<': 'lessThan',
      '<=': 'lessThanOrEqualTo',
      '!=': 'notEqualTo',

      // boolean
      '&&': 'and',
      '!': 'not',
      '||': 'or'
    },

    grouping: {
      '{': 'openBrace',
      '}': 'closeBrace',
      '[': 'openBracket',
      ']': 'closeBracket',
      '(': 'openParen',
      ')': 'closeParen'
    },

    delimiter: {
      ',': 'comma'
    }
  },

  firstCharMatches: {
    whitespace: /\s/,
    comment: /#/,
    word: /[_A-Za-z]/,
    string: /['"]/,
    number: /[\d.]/, // no negative; leading "-" will be unary operator
    regex: /\//,
    operator: /[-+*/=<>!&|%~$^:.]/,
    grouping: /[[\](){}]/,
    delimiter: /,/
  },

  fullMatches: {
    // (whitespace)+
    // => literal as-is; to be ignored
    whitespace: /^\s+/,

    // octothorpe, (anything)*, end of line
    // => literal as-is; to be ignored
    comment: /^#.*?(\n|$)/,

    // (underscore || letter), (word character)*
    // => match predefined set of key words, or variable as-is
    word: /^[_A-Za-z]\w*/,

    // a quote, (any escaped char || anything but the quote)*, the quote
    // => literal as-is
    string: /^'(\\.|[^'])*?'|^"(\\.|[^"])*?"/,

    // (digit)*, (decimal point)?, (digit)+
    // => literal as-is
    number: /^\d*\.?\d+/,

    // (operator)+
    // => match a set of predefined operators
    operator: /^[-+*/=<>!&|%~$^:.]+/,

    // (opening symbol || closing symbol)
    // can't do nested grouping with JS regexes easily; so handle
    // groups with code
    grouping: /^[[\](){}]/,

    // (comma || colon)
    // literal as-is
    delimiter: /^,/,

    // I apologize in advance for this monstrosity:
    // (adapted from https://stackoverflow.com/questions/17843691/javascript-regex-to-match-a-regex/17843773#17843773)
    // 1. \/           -- starting slash
    // 2. (?:          -- a group of...
    //   a. [^[/\\]      -- anything but (open bracket || slash || backslash), OR
    //   b. \\.          -- any escaped char, OR
    //   c. \[(?:        -- within brackets...
    //     i.  [^\]\\]     -- anything but (closing bracket || backslash), OR
    //     ii. \\.         -- any escaped char
    //   )*\]            -- ...any number of times before the closing bracket
    // )*              -- ...any number of times
    // 3. \/           -- closing slash
    // 4. [gimuy]{0,5} -- 0-5 flags
    regex: /^\/(?:[^[/\\]|\\.|\[(?:[^\]\\]|\\.)*\])*\/[gimuy]{0,5}/
  },

  typeIsSignificant: function typeIsSignificant(tokenType) {
    return !_underscore2.default.contains(this.ignorableTypes, tokenType);
  },
  firstCharRegexForType: function firstCharRegexForType(type) {
    return this.firstCharMatches[type];
  },
  fullRegexForType: function fullRegexForType(type) {
    return this.fullMatches[type];
  },


  // returns an array of token types
  typesForFirstChar: function typesForFirstChar(firstChar) {
    var _this = this;

    return _underscore2.default.filter(this.types, function (type) {
      var firstCharRegex = _this.firstCharRegexForType(type);
      return !!firstChar.match(firstCharRegex);
    });
  },


  // returns a token type for a string STARTING with a token
  typeForString: function typeForString(stringStartingWithToken) {
    var _this2 = this;

    var firstChar = stringStartingWithToken[0];
    var possibleTypes = this.typesForFirstChar(firstChar);
    return _underscore2.default.find(possibleTypes, function (type) {
      var matchedStr = _this2.matchStringByType(stringStartingWithToken, type);
      return !!matchedStr;
    });
  },


  // returns a leading substring that matches the type given
  matchStringByType: function matchStringByType(stringStartingWithToken, type) {
    var fullRegex = this.fullRegexForType(type);
    var matched = stringStartingWithToken.match(fullRegex);
    return matched ? matched[0] : '';
  },
  nameForLexemeByType: function nameForLexemeByType(lexeme, type) {
    var names = this.names[type];
    if (_underscore2.default.isUndefined(names)) return 'literal';

    var name = names[lexeme];
    if (type === 'word' && _underscore2.default.isUndefined(name)) return 'identifier';

    return name;
  }
};

var Lexer = function () {
  function Lexer(options) {
    _classCallCheck(this, Lexer);

    this.fileText = options.fileText;
    this.spacesPerTab = options.spacesPerTab || 2;
  }

  _createClass(Lexer, [{
    key: 'textUpTo',
    value: function textUpTo(charIndex) {
      return this.fileText.slice(0, charIndex + 1);
    }
  }, {
    key: 'linesUpTo',
    value: function linesUpTo(charIndex) {
      return this.textUpTo(charIndex).split(/\n/);
    }
  }, {
    key: 'textAfter',
    value: function textAfter(charIndex) {
      return this.fileText.slice(charIndex);
    }
  }, {
    key: 'lineAt',
    value: function lineAt(charIndex) {
      return _underscore2.default.last(this.linesUpTo(charIndex));
    }
  }, {
    key: 'lineNumAt',
    value: function lineNumAt(charIndex) {
      return this.linesUpTo(charIndex).length;
    }
  }, {
    key: 'colNumAt',
    value: function colNumAt(charIndex) {
      return this.lineAt(charIndex).length;
    }
  }, {
    key: 'indentLevelAt',
    value: function indentLevelAt(charIndex) {
      // replace tabs with spaces, then match leading single spaces
      var tabSpaces = ' '.repeat(this.spacesPerTab);
      var spacedLine = this.lineAt(charIndex).replace(/\t/g, tabSpaces);
      var indent = spacedLine.match(/^ +/);
      return indent ? indent[0].length : 0;
    }
  }, {
    key: 'tokenError',
    value: function tokenError(tokenProp, problemDesc, charIndex) {
      var lineNum = this.lineNumAt(charIndex);
      var colNum = this.colNumAt(charIndex);
      var line = this.lineAt(charIndex);
      var errorDesc = 'Token ' + tokenProp + ' at L' + lineNum + '/C' + colNum + ' is ' + problemDesc + '!';
      var errorLine = '\n  ' + line + '...';
      var errorMark = ' ' + ' '.repeat(line.length) + '^';
      throw [errorDesc, errorLine, errorMark].join("\n");
    }
  }, {
    key: 'tokenStartingAt',
    value: function tokenStartingAt(charIndex) {
      var line = this.lineNumAt(charIndex);
      var column = this.colNumAt(charIndex);
      var text = this.textAfter(charIndex);

      var type = TOKEN.typeForString(text);
      if (_underscore2.default.isUndefined(type)) throw this.tokenError('type', 'undefined', charIndex);

      var lexeme = TOKEN.matchStringByType(text, type);
      if (_underscore2.default.isEmpty(lexeme)) throw this.tokenError('lexeme', 'empty', charIndex);

      var name = TOKEN.nameForLexemeByType(lexeme, type);
      if (_underscore2.default.isUndefined(name)) throw this.tokenError('name', 'undefined', charIndex);

      var indent = this.indentLevelAt(charIndex);
      return { type: type, lexeme: lexeme, name: name, line: line, column: column, indent: indent };
    }
  }, {
    key: 'traverse',
    value: function traverse() {
      var tokenList = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      var currentCharIndex = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

      if (currentCharIndex >= this.fileText.length) return tokenList;
      var token = this.tokenStartingAt(currentCharIndex);
      if (TOKEN.typeIsSignificant(token.type)) tokenList.push(token);
      var nextCharIndex = currentCharIndex + token.lexeme.length;
      return this.traverse(tokenList, nextCharIndex);
    }
  }]);

  return Lexer;
}();

exports.default = Lexer;

},{"underscore":1}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _underscore = require("underscore");

var _underscore2 = _interopRequireDefault(_underscore);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function errorAt(token) {
  var message = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "Syntax error";

  var position = "L" + token.line + "/C" + token.column;
  return message + " at " + position;
}

function errorBetween(startToken, endToken) {
  var message = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "Syntax error";

  var startPos = "L" + startToken.line + "/C" + startToken.column;
  var endPos = "L" + endToken.line + "/C" + endToken.column;
  return message + " between " + startPos + " and " + endPos;
}

var Syntaxer = function () {
  function Syntaxer(options) {
    _classCallCheck(this, Syntaxer);

    this.tokenList = options.tokenList;
  }

  _createClass(Syntaxer, [{
    key: "hasGroupingSymbols",
    value: function hasGroupingSymbols(tokens) {
      return _underscore2.default.any(tokens, function (token) {
        return token.type === 'grouping';
      });
    }
  }, {
    key: "isGroup",
    value: function isGroup(tokens) {
      var openToken = _underscore2.default.first(tokens);
      var closeToken = _underscore2.default.last(tokens);
      return this.openTokenMatchesCloser(openToken, closeToken);
    }
  }, {
    key: "isOpenGroupToken",
    value: function isOpenGroupToken(token) {
      if (token.type !== 'grouping') return false;
      return _underscore2.default.contains(['openParen', 'openBracket', 'openBrace'], token.name);
    }
  }, {
    key: "isCloseGroupToken",
    value: function isCloseGroupToken(token) {
      if (token.type !== 'grouping') return false;
      return _underscore2.default.contains(['closeParen', 'closeBracket', 'closeBrace'], token.name);
    }
  }, {
    key: "openTokenMatchesCloser",
    value: function openTokenMatchesCloser(openToken, closeToken) {
      if (_underscore2.default.isUndefined(openToken) || _underscore2.default.isUndefined(closeToken)) return false;
      if (openToken.type !== 'grouping' || closeToken.type !== 'grouping') return false;
      var validCloserFor = { '(': ')', '[': ']', '{': '}' };
      var validOpeners = _underscore2.default.keys(validCloserFor);
      var openerIsValid = _underscore2.default.contains(validOpeners, openToken.lexeme);
      var closerIsValid = closeToken.lexeme === validCloserFor[openToken.lexeme];
      return openerIsValid && closerIsValid;
    }

    // Given a set of tokens, returns true if the tokens follow valid grouping rules (all open
    // grouping symbols are properly matched with closing symbols, or there are no groups), or
    // false if a group is not closed properly. Throws an error for orphaned closing symbols.

  }, {
    key: "hasBalancedGrouping",
    value: function hasBalancedGrouping(tokens) {
      var _this = this;

      var openStack = [];
      _underscore2.default.each(tokens, function (token) {
        if (token.type !== 'grouping') return;

        if (_this.isOpenGroupToken(token)) {
          openStack.push(token);
          return;
        }

        if (_this.openTokenMatchesCloser(_underscore2.default.last(openStack), token)) {
          openStack.pop();
        }
      });

      return _underscore2.default.isEmpty(openStack);
    }
  }, {
    key: "findAllBoundsInTokensWith",
    value: function findAllBoundsInTokensWith(findFirstBoundsInTokensFn, tokens) {
      var boundsPairs = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

      var previousPair = _underscore2.default.last(boundsPairs);
      var startIndex = _underscore2.default.isUndefined(previousPair) ? 0 : previousPair[1] + 1;
      var restOfTokens = tokens.slice(startIndex);
      if (_underscore2.default.isEmpty(restOfTokens)) return boundsPairs;

      var boundsOfFirstFn = findFirstBoundsInTokensFn(restOfTokens);
      if (_underscore2.default.isEmpty(boundsOfFirstFn)) return boundsPairs;

      var canonicalBounds = _underscore2.default.map(boundsOfFirstFn, function (boundary) {
        return boundary + startIndex;
      });
      boundsPairs.push(canonicalBounds);

      return this.findAllBoundsInTokensWith(findFirstBoundsInTokensFn, tokens, boundsPairs);
    }

    // Given a set of tokens, returns the indices of the first open grouping symbol and its
    // matching closing symbol... essentially the beginning and end of the first group. Returns
    // an array: [] if there are no groups, or [openSymbolIndex, closeSymbolIndex] otherwise.
    // It will throw an error if there is no matching closing symbol for an open group.

  }, {
    key: "boundsOfFirstGroupInTokens",
    value: function boundsOfFirstGroupInTokens(tokens) {
      var _this2 = this;

      var openIndex = _underscore2.default.findIndex(tokens, function (token) {
        return _this2.isOpenGroupToken(token);
      });
      if (openIndex < 0) return [];

      var openStack = [];
      var closeIndex = openIndex + _underscore2.default.findIndex(tokens.slice(openIndex), function (token) {
        if (token.type !== 'grouping') return false;

        if (_this2.isOpenGroupToken(token)) {
          openStack.push(token);
          return false;
        }

        if (_this2.openTokenMatchesCloser(_underscore2.default.last(openStack), token)) {
          openStack.pop();
          return _underscore2.default.isEmpty(openStack);
        }

        throw errorAt(token, "Unmatched " + token.name);
      });

      if (closeIndex < 0) {
        var openToken = tokens[openIndex];
        throw errorAt(openToken, "Unmatched " + openToken.name);
      }

      return [openIndex, closeIndex];
    }
  }, {
    key: "boundsOfAllGroupsInTokens",
    value: function boundsOfAllGroupsInTokens(tokens) {
      var boundsFinderFn = _underscore2.default.bind(this.boundsOfFirstGroupInTokens, this);
      return this.findAllBoundsInTokensWith(boundsFinderFn, tokens);
    }
  }, {
    key: "indexOfFirstFunctionColon",
    value: function indexOfFirstFunctionColon(tokens) {
      var _this3 = this;

      return _underscore2.default.findIndex(tokens, function (token, index) {
        if (token.name !== 'colon') return false;

        // regular function definitions MUST provide an argument group to the left
        // of the colon, and prop setter functions MUST provide a prop name to the
        // left of the colon, so if nothing's to the left, it's not a function
        var leftToken = tokens[index - 1];
        if (_underscore2.default.isUndefined(leftToken)) return false;

        var linesBeforeColon = _this3.linesBetween(token, leftToken);
        var columnsBeforeColon = _this3.columnsBetween(token, leftToken);
        if (linesBeforeColon > 0 || columnsBeforeColon > 0) return false;

        // for regular function definitions, e.g.,
        //   def foo(a, b):Str "#{a} foos #{b}!"   # hoisted, returns a string
        //   foo = (a, b):Str "#{a}#{b}"           # not hoisted, returns a string
        //   foo = (a, b): console.log(a, b)       # not hoisted, returns null
        //   foo = (a, b):                         # not hoisted, returns null, no-op is valid

        // if it provides an argument group before the colon, it's valid, and it
        // allows anything to follow (no-op is also valid)
        if (leftToken.name === 'closeParen') return true;

        // for prop setter definitions within proto shape body, e.g.,
        //   breed:Str set "#{breed} is da best!"  # explicit setter; prop name is passed as implicit argument
        //   breed:Str "husky"                     # defaults to 'husky'; short for breed:Str set breed || "husky"
        //   breed:Str                             # defaults to ''; short for breed:Str set breed

        // prop setter definitions MUST provide a non-null return type to the
        // right of the colon
        var rightToken = tokens[index + 1];
        if (_underscore2.default.isUndefined(rightToken)) return false;
        if (rightToken.type !== 'word') return false;

        // the return type must be DIRECTLY after the colon (in hashes there MUST
        // be a space after the colon, to differentiate them from return types)
        var linesAfterColon = _this3.linesBetween(token, rightToken);
        var columnsAfterColon = _this3.columnsBetween(token, rightToken);
        if (linesAfterColon > 0 || columnsAfterColon > 0) return false;

        return true;
      });
    }
  }, {
    key: "boundsOfFirstFunctionDefinitionInTokens",
    value: function boundsOfFirstFunctionDefinitionInTokens(tokens) {
      var _this4 = this;

      var colonIndex = this.indexOfFirstFunctionColon(tokens);
      if (colonIndex === -1) return [];

      var colonToken = tokens[colonIndex];

      var stopIndex = _underscore2.default.findIndex(tokens, function (currentToken, index) {
        if (index < colonIndex) return false;

        var nextToken = tokens[index + 1];
        if (_underscore2.default.isUndefined(nextToken)) return true;

        var currentTokens = tokens.slice(colonIndex, index + 1);
        if (!_this4.hasBalancedGrouping(currentTokens)) return false;
        if (nextToken.line === currentToken.line) return false;
        if (nextToken.indent > colonToken.indent) return false;

        return true;
      });

      if (tokens[colonIndex - 1].name !== 'closeParen') {
        return [colonIndex - 1, stopIndex]; // it's a prop definition
      }

      var tokensBeforeColon = _underscore2.default.first(tokens, colonIndex);
      var argOpenIndex = _underscore2.default.findLastIndex(tokensBeforeColon, function (token, index) {
        if (token.name !== 'openParen') return false;
        var currentTokens = tokensBeforeColon.slice(index);
        return _this4.hasBalancedGrouping(currentTokens);
      });

      var nameToken = tokens[argOpenIndex - 1];
      var defToken = tokens[argOpenIndex - 2];
      var isDeclaration = !!defToken && !!nameToken && defToken.name === 'def' && nameToken.name === 'identifier';
      if (!isDeclaration) {
        return [argOpenIndex, stopIndex]; // it's anonymous
      }

      return [argOpenIndex - 2, stopIndex];
    }
  }, {
    key: "boundsOfAllFunctionDefinitionsInTokens",
    value: function boundsOfAllFunctionDefinitionsInTokens(tokens) {
      var boundsFinderFn = _underscore2.default.bind(this.boundsOfFirstFunctionDefinitionInTokens, this);
      return this.findAllBoundsInTokensWith(boundsFinderFn, tokens);
    }
  }, {
    key: "indexOfFirstProto",
    value: function indexOfFirstProto(tokens) {
      var groupBoundsPairs = this.boundsOfAllGroupsInTokens(tokens);
      var fnDefBoundsPairs = this.boundsOfAllFunctionDefinitionsInTokens(tokens);
      var groupsArePresent = !_underscore2.default.isEmpty(groupBoundsPairs);
      var fnDefsArePresent = !_underscore2.default.isEmpty(fnDefBoundsPairs);

      return _underscore2.default.findIndex(tokens, function (token, index) {
        if (token.name !== 'proto') return false;

        var isInsideGroup = groupsArePresent && _underscore2.default.any(groupBoundsPairs, function (bounds) {
          return index > bounds[0] && index < bounds[1];
        });
        if (isInsideGroup) return false;

        var isInsideFnDef = fnDefsArePresent && _underscore2.default.any(fnDefBoundsPairs, function (bounds) {
          return index > bounds[0] && index < bounds[1];
        });
        if (isInsideFnDef) return false;

        return true;
      });
    }
  }, {
    key: "boundsOfFirstProtoDefinitionInTokens",
    value: function boundsOfFirstProtoDefinitionInTokens(tokens) {
      var startIndex = this.indexOfFirstProto(tokens);
      if (startIndex === -1) return [];

      var protoTokens = tokens.slice(startIndex);
      var validLeftTypes = ['word'];
      var validRightTypes = [];
      var indexOfFrom = this.indexOfBinaryOperation('protoDerivation', protoTokens, { validLeftTypes: validLeftTypes, validRightTypes: validRightTypes });
      var indexOfShaped = this.indexOfBinaryOperation('shapeDefinition', protoTokens, { validLeftTypes: validLeftTypes, validRightTypes: validRightTypes });
      var indexOfExtends = this.indexOfBinaryOperation('extensionDefinition', protoTokens, { validLeftTypes: validLeftTypes, validRightTypes: validRightTypes });

      var lastDescriptorIndex = _underscore2.default.max([indexOfFrom, indexOfShaped, indexOfExtends]);
      var descriptorToken = protoTokens[lastDescriptorIndex];
      if (lastDescriptorIndex === -1) return [startIndex, startIndex + 1];
      if (lastDescriptorIndex === indexOfFrom) return [startIndex, startIndex + indexOfFrom + 1];

      var restOfTokens = protoTokens.slice(lastDescriptorIndex);
      var boundsOfBlock = this.boundsOfFirstGroupInTokens(restOfTokens);
      if (_underscore2.default.isEmpty(boundsOfBlock)) {
        throw errorAt(descriptorToken, "Expected block for " + descriptorToken.name + " descriptor");
      }

      var canonicalBounds = _underscore2.default.map(boundsOfBlock, function (boundary) {
        return boundary + startIndex + lastDescriptorIndex;
      });
      var endIndex = canonicalBounds[1];
      return [startIndex, endIndex];
    }
  }, {
    key: "boundsOfAllProtoDefinitionsInTokens",
    value: function boundsOfAllProtoDefinitionsInTokens(tokens) {
      var boundsFinderFn = _underscore2.default.bind(this.boundsOfFirstProtoDefinitionInTokens, this);
      return this.findAllBoundsInTokensWith(boundsFinderFn, tokens);
    }
  }, {
    key: "indexOfBinaryOperation",
    value: function indexOfBinaryOperation(operationName, tokens, _ref) {
      var _this5 = this;

      var validLeftTypes = _ref.validLeftTypes,
          validRightTypes = _ref.validRightTypes;

      var operatorNames = {
        assignment: ['equals'],
        sequence: ['comma'],
        logicalOR: ['or'],
        logicalAND: ['and'],
        equalityComparison: ['equalTo', 'notEqualTo'],
        differentialComparison: ['greaterThan', 'greaterThanOrEqualTo', 'lessThan', 'lessThanOrEqualTo'],
        subtraction: ['minus'],
        addition: ['plus'],
        division: ['slash'],
        multiplication: ['star'],
        exponentiation: ['starStar'],
        hashPair: ['colon'],
        dispatch: ['dot'],
        protoDerivation: ['from'],
        shapeDefinition: ['shaped'],
        extensionDefinition: ['extends']
      }[operationName];

      if (_underscore2.default.isEmpty(operatorNames)) throw "Invalid binary operation '" + operationName + "'";

      var groupBoundsPairs = this.boundsOfAllGroupsInTokens(tokens);
      var fnDefBoundsPairs = this.boundsOfAllFunctionDefinitionsInTokens(tokens);
      var groupsArePresent = !_underscore2.default.isEmpty(groupBoundsPairs);
      var fnDefsArePresent = !_underscore2.default.isEmpty(fnDefBoundsPairs);

      return _underscore2.default.findIndex(tokens, function (token, index) {
        if (!_underscore2.default.contains(operatorNames, token.name)) return false;

        var isInsideGroup = groupsArePresent && _underscore2.default.any(groupBoundsPairs, function (bounds) {
          return index > bounds[0] && index < bounds[1];
        });
        if (isInsideGroup) return false;

        var isInsideFunctionDefinition = fnDefsArePresent && _underscore2.default.any(fnDefBoundsPairs, function (bounds) {
          return index > bounds[0] && index < bounds[1];
        });
        if (isInsideFunctionDefinition) return false;

        var leftToken = tokens[index - 1];
        if (_underscore2.default.isUndefined(leftToken)) return false;

        var rightToken = tokens[index + 1];
        if (_underscore2.default.isUndefined(rightToken)) return false;

        var leftIsValid = _underscore2.default.contains(validLeftTypes, leftToken.type) || leftToken.name === 'identifier' || _this5.isCloseGroupToken(leftToken);
        if (!leftIsValid) return false;

        var rightIsValid = _underscore2.default.contains(validRightTypes, rightToken.type) || rightToken.name === 'identifier' || _this5.isOpenGroupToken(rightToken);
        return leftIsValid && rightIsValid;
      });
    }
  }, {
    key: "indexOfComparisonOperation",
    value: function indexOfComparisonOperation(operationName, tokens) {
      var validLeftTypes = ['word', 'string', 'number', 'regex'];
      var validRightTypes = ['word', 'string', 'number', 'regex', 'operator'];
      return this.indexOfBinaryOperation(operationName, tokens, { validLeftTypes: validLeftTypes, validRightTypes: validRightTypes });
    }
  }, {
    key: "indexOfAssignment",
    value: function indexOfAssignment(tokens) {
      var validLeftTypes = ['word'];
      var validRightTypes = ['word', 'string', 'number', 'regex', 'operator'];
      return this.indexOfBinaryOperation('assignment', tokens, { validLeftTypes: validLeftTypes, validRightTypes: validRightTypes });
    }
  }, {
    key: "indexOfSequence",
    value: function indexOfSequence(tokens) {
      var validLeftTypes = ['word', 'string', 'number', 'regex'];
      var validRightTypes = ['word', 'string', 'number', 'regex', 'operator'];
      return this.indexOfBinaryOperation('sequence', tokens, { validLeftTypes: validLeftTypes, validRightTypes: validRightTypes });
    }
  }, {
    key: "indexOfLogicalOR",
    value: function indexOfLogicalOR(tokens) {
      return this.indexOfComparisonOperation('logicalOR', tokens);
    }
  }, {
    key: "indexOfLogicalAND",
    value: function indexOfLogicalAND(tokens) {
      return this.indexOfComparisonOperation('logicalAND', tokens);
    }
  }, {
    key: "indexOfEqualityComparison",
    value: function indexOfEqualityComparison(tokens) {
      return this.indexOfComparisonOperation('equalityComparison', tokens);
    }
  }, {
    key: "indexOfDifferentialComparison",
    value: function indexOfDifferentialComparison(tokens) {
      return this.indexOfComparisonOperation('differentialComparison', tokens);
    }
  }, {
    key: "indexOfSubtraction",
    value: function indexOfSubtraction(tokens) {
      var validLeftTypes = ['word', 'number', 'string'];
      var validRightTypes = ['word', 'number', 'string', 'regex', 'operator'];
      return this.indexOfBinaryOperation('subtraction', tokens, { validLeftTypes: validLeftTypes, validRightTypes: validRightTypes });
    }
  }, {
    key: "indexOfAddition",
    value: function indexOfAddition(tokens) {
      var validLeftTypes = ['word', 'number', 'string'];
      var validRightTypes = ['word', 'number', 'string', 'operator'];
      return this.indexOfBinaryOperation('addition', tokens, { validLeftTypes: validLeftTypes, validRightTypes: validRightTypes });
    }
  }, {
    key: "indexOfDivision",
    value: function indexOfDivision(tokens) {
      var validLeftTypes = ['word', 'number'];
      var validRightTypes = ['word', 'number', 'regex', 'operator'];
      return this.indexOfBinaryOperation('division', tokens, { validLeftTypes: validLeftTypes, validRightTypes: validRightTypes });
    }
  }, {
    key: "indexOfMultiplication",
    value: function indexOfMultiplication(tokens) {
      var validLeftTypes = ['word', 'number', 'string'];
      var validRightTypes = ['word', 'number', 'operator'];
      return this.indexOfBinaryOperation('multiplication', tokens, { validLeftTypes: validLeftTypes, validRightTypes: validRightTypes });
    }
  }, {
    key: "indexOfExponentiation",
    value: function indexOfExponentiation(tokens) {
      var validLeftTypes = ['word', 'number'];
      var validRightTypes = ['word', 'number', 'operator'];
      return this.indexOfBinaryOperation('exponentiation', tokens, { validLeftTypes: validLeftTypes, validRightTypes: validRightTypes });
    }
  }, {
    key: "indexOfHashColon",
    value: function indexOfHashColon(tokens) {
      var validLeftTypes = ['word', 'number', 'string', 'regex'];
      var validRightTypes = ['word', 'number', 'string', 'regex', 'operator'];
      var indexOfFirstColon = this.indexOfBinaryOperation('hashPair', tokens, { validLeftTypes: validLeftTypes, validRightTypes: validRightTypes });
      if (indexOfFirstColon === -1) return -1;

      var tokenBeforeColon = tokens[indexOfFirstColon - 1];
      if (_underscore2.default.isUndefined(tokenBeforeColon)) return -1;

      var tokenAfterColon = tokens[indexOfFirstColon + 1];
      if (_underscore2.default.isUndefined(tokenAfterColon)) return -1;

      var firstColonToken = tokens[indexOfFirstColon];
      var linesBeforeColon = this.linesBetween(tokenBeforeColon, firstColonToken);
      if (linesBeforeColon > 0) return -1;

      var linesAfterColon = this.linesBetween(firstColonToken, tokenAfterColon);
      var spacesAfterColon = this.columnsBetween(firstColonToken, tokenAfterColon);
      if (linesAfterColon === 0 && spacesAfterColon === 0) return -1;

      return indexOfFirstColon;
    }
  }, {
    key: "indexOfDispatch",
    value: function indexOfDispatch(tokens) {
      var validLeftTypes = ['word', 'number', 'string', 'regex'];
      var validRightTypes = ['word'];
      return this.indexOfBinaryOperation('dispatch', tokens, { validLeftTypes: validLeftTypes, validRightTypes: validRightTypes });
    }
  }, {
    key: "indexOfFunctionCall",
    value: function indexOfFunctionCall(tokens) {
      var offset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

      var boundsOfFirstGroup = this.boundsOfFirstGroupInTokens(tokens);
      if (_underscore2.default.isEmpty(boundsOfFirstGroup)) return -1;

      var indexOfOpenToken = boundsOfFirstGroup[0];
      var openToken = tokens[indexOfOpenToken];
      var leftToken = tokens[indexOfOpenToken - 1];
      if (openToken.name === 'openParen' && leftToken) {
        var validTypes = ['word', 'string', 'number'];
        var validNames = ['closeParen', 'closeBracket', 'closeBrace'];
        if (_underscore2.default.contains(validTypes, leftToken.type) || _underscore2.default.contains(validNames, leftToken.name)) {
          return indexOfOpenToken + offset;
        }
      }

      var indexOfCloseToken = boundsOfFirstGroup[1];
      var restOfTokens = tokens.slice(indexOfCloseToken);
      var currentOffset = indexOfCloseToken + offset;
      return this.indexOfFunctionCall(restOfTokens, currentOffset);
    }

    // Given a set of tokens, returns the tokens up to the end of the first line (or spanning
    // multiple lines if there are grouping symbols), to the end of the contiguous "statement".
    // Does not include the block of a function/proto definition, etc., as blocks are multiple
    // statements, so I'm just gonna treat the definition statement as a single entity for now
    // and validate/construct the definition block somewhere else.
    // EDIT: ...SLASH TODO: CONSIDER SURROUNDING FUNCTION DEFS W/ CURLY BRACES MAYBE

  }, {
    key: "firstStatementFromTokens",
    value: function firstStatementFromTokens(tokens) {
      var _this6 = this;

      if (_underscore2.default.isEmpty(tokens)) return [];

      var groupBoundsPairs = this.boundsOfAllGroupsInTokens(tokens);
      var fnDefBoundsPairs = this.boundsOfAllFunctionDefinitionsInTokens(tokens);
      var groupsArePresent = !_underscore2.default.isEmpty(groupBoundsPairs);
      var fnDefsArePresent = !_underscore2.default.isEmpty(fnDefBoundsPairs);

      var statementEndPos = _underscore2.default.findIndex(tokens, function (currentToken, index) {
        var nextToken = tokens[index + 1];
        if (_underscore2.default.isUndefined(nextToken)) return true;

        var isInsideGroup = groupsArePresent && _underscore2.default.any(groupBoundsPairs, function (bounds) {
          return index > bounds[0] && index < bounds[1];
        });
        if (isInsideGroup) return false;

        var isInsideFunctionDefinition = fnDefsArePresent && _underscore2.default.any(fnDefBoundsPairs, function (bounds) {
          return index > bounds[0] && index < bounds[1];
        });
        if (isInsideFunctionDefinition) return false;

        if (nextToken.line === currentToken.line) return false;

        var currentTokens = _underscore2.default.first(tokens, index + 1);
        return _this6.hasBalancedGrouping(currentTokens);
      });

      return _underscore2.default.first(tokens, statementEndPos + 1);
    }
  }, {
    key: "identityNode",
    value: function identityNode(token) {
      var validIdentityTypes = ['word', 'string', 'number', 'regex'];
      if (!_underscore2.default.contains(validIdentityTypes, token.type)) {
        throw errorAt(token, 'Expected to find valid identity token');
      }

      return {
        operation: 'identity',
        token: token
      };
    }
  }, {
    key: "unaryOperationNode",
    value: function unaryOperationNode(operationName, tokens) {
      var operatorToken = _underscore2.default.first(tokens);
      var rightTokens = _underscore2.default.rest(tokens);

      var validUnaryOperatorNames = ['plus', 'minus', 'not'];
      if (!_underscore2.default.contains(validUnaryOperatorNames, operatorToken.name)) {
        throw errorAt(operatorToken, "Expected to find " + operationName);
      }

      return {
        operation: operationName,
        token: operatorToken,
        rightNode: this.pemdasNodeFromStatement(rightTokens)
      };
    }
  }, {
    key: "binaryOperationNode",
    value: function binaryOperationNode(operationName, operatorIndex, tokens) {
      var tokenNames = {
        subtraction: ['minus'],
        addition: ['plus'],
        division: ['slash'],
        multiplication: ['star'],
        exponentiation: ['starStar'],
        assignment: ['equals'],
        dispatch: ['dot'],
        comparison: ['equalTo', 'greaterThan', 'greaterThanOrEqualTo', 'lessThan', 'lessThanOrEqualTo', 'notEqualTo'],
        boolean: ['and', 'or']
      }[operationName];

      var operatorToken = tokens[operatorIndex];
      if (!_underscore2.default.contains(tokenNames, operatorToken.name)) {
        throw errorAt(operatorToken, "Expected to find " + operationName);
      }

      var leftTokens = _underscore2.default.first(tokens, operatorIndex);
      if (_underscore2.default.isEmpty(leftTokens)) {
        throw errorAt(operatorToken, "Found no left-hand side for " + operationName);
      }

      var rightTokens = tokens.slice(operatorIndex + 1);
      if (_underscore2.default.isEmpty(rightTokens)) {
        throw errorAt(operatorToken, "Found no right-hand side for " + operationName);
      }

      return {
        operation: operationName,
        token: operatorToken,
        leftNode: this.pemdasNodeFromStatement(leftTokens),
        rightNode: this.pemdasNodeFromStatement(rightTokens)
      };
    }
  }, {
    key: "sequenceNode",
    value: function sequenceNode(firstCommaIndex, tokens) {
      var _this7 = this;

      var firstComma = tokens[firstCommaIndex];
      if (firstComma.name !== 'comma') {
        throw errorAt(firstComma, 'Expected to find comma');
      }

      var sequenceSets = _underscore2.default.reduce(tokens, function (sets, token) {
        if (token.name === 'comma') {
          sets.push([]);
        } else {
          _underscore2.default.last(sets).push(token);
        }

        return sets;
      }, [[]]);

      var sequenceNodes = _underscore2.default.map(sequenceSets, function (set) {
        return _this7.pemdasNodeFromStatement(set);
      });

      return {
        operation: 'sequence',
        startToken: _underscore2.default.first(tokens),
        endToken: _underscore2.default.last(tokens),
        sequenceNodes: sequenceNodes
      };
    }
  }, {
    key: "groupNode",
    value: function groupNode(operationName, tokens) {
      var correctOpenTokenName = {
        parenGroup: 'openParen',
        bracketGroup: 'openBracket',
        braceGroup: 'openBrace'
      }[operationName];

      var openToken = _underscore2.default.first(tokens);
      if (openToken.name !== correctOpenTokenName) {
        throw errorAt(openToken, "Expected " + operationName + " opening symbol");
      }

      var closeToken = _underscore2.default.last(tokens);
      if (!this.openTokenMatchesCloser(openToken, closeToken)) {
        throw errorAt(closeToken, "Expected " + operationName + " closing symbol");
      }

      var innerTokens = tokens.slice(1, -1);

      return {
        operation: operationName,
        openToken: openToken,
        closeToken: closeToken,
        innerNode: this.pemdasNodeFromStatement(innerTokens)
      };
    }
  }, {
    key: "startsWithPropDefinition",
    value: function startsWithPropDefinition(tokens) {
      var _tokens = _slicedToArray(tokens, 3),
          nameToken = _tokens[0],
          colonToken = _tokens[1],
          typeToken = _tokens[2];

      if (_underscore2.default.isUndefined(nameToken) || nameToken.name !== 'identifier') return false;
      if (_underscore2.default.isUndefined(colonToken) || colonToken.name !== 'colon') return false;
      if (_underscore2.default.isUndefined(typeToken) || typeToken.type !== 'word') return false;
      if (nameToken.line !== colonToken.line) return false;
      if (colonToken.line !== typeToken.line) return false;

      var spacesBeforeColon = this.columnsBetween(nameToken, colonToken);
      var spacesAfterColon = this.columnsBetween(colonToken, typeToken);
      if (spacesBeforeColon > 0 || spacesAfterColon > 0) return false;

      return true;
    }
  }, {
    key: "startsWithPropDefault",
    value: function startsWithPropDefault(tokens) {
      if (!this.startsWithPropDefinition(tokens)) return false;
      var defaultToken = tokens[3];
      if (defaultToken && defaultToken.name === 'set') return false;
      return true;
    }
  }, {
    key: "startsWithPropSetter",
    value: function startsWithPropSetter(tokens) {
      if (!this.startsWithPropDefinition(tokens)) return false;
      var setToken = tokens[3];
      if (_underscore2.default.isUndefined(setToken) || setToken.name !== 'set') return false;
      return true;
    }
  }, {
    key: "startsWithFnDeclaration",
    value: function startsWithFnDeclaration(tokens) {
      var _tokens2 = _slicedToArray(tokens, 2),
          defToken = _tokens2[0],
          nameToken = _tokens2[1];

      if (_underscore2.default.isUndefined(defToken) || defToken.name !== 'def') return false;
      if (_underscore2.default.isUndefined(nameToken) || nameToken.name !== 'identifier') return false;

      var argBounds = this.boundsOfFirstGroupInTokens(tokens);
      if (argBounds[0] !== 2) return false;

      var colonToken = tokens[argBounds[1] + 1];
      if (_underscore2.default.isUndefined(colonToken) || colonToken.name !== 'colon') return false;

      return true;
    }
  }, {
    key: "startsWithAnonFn",
    value: function startsWithAnonFn(tokens) {
      var argBounds = this.boundsOfFirstGroupInTokens(tokens);
      if (argBounds[0] !== 0) return false;

      var colonToken = tokens[argBounds[1] + 1];
      if (_underscore2.default.isUndefined(colonToken) || colonToken.name !== 'colon') return false;

      return true;
    }
  }, {
    key: "linesBetween",
    value: function linesBetween() {
      var firstToken = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var secondToken = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      return Math.abs(firstToken.line - secondToken.line);
    }
  }, {
    key: "columnsBetween",
    value: function columnsBetween() {
      var firstToken = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { lexeme: '' };
      var secondToken = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : { lexeme: '' };

      var _$sortBy = _underscore2.default.sortBy([firstToken, secondToken], 'column'),
          _$sortBy2 = _slicedToArray(_$sortBy, 2),
          startToken = _$sortBy2[0],
          endToken = _$sortBy2[1];

      var startCol = startToken.column + startToken.lexeme.length;
      var endCol = endToken.column;
      return endCol - startCol;
    }
  }, {
    key: "anonFnDefinitionNode",
    value: function anonFnDefinitionNode(tokens) {
      var argBounds = this.boundsOfFirstGroupInTokens(tokens);
      if (argBounds[0] !== 0) {
        throw errorAt(tokens[0], 'Expected arguments to begin the anonymous function');
      }

      var colonIndex = argBounds[1] + 1;
      var colonToken = tokens[colonIndex];
      if (_underscore2.default.isUndefined(colonToken) || colonToken.name !== 'colon') {
        throw errorAt(colonToken, 'Expected valid function definition');
      }

      var tokenAfterColon = tokens[colonIndex + 1];
      var linesAfterColon = this.linesBetween(colonToken, tokenAfterColon);
      var colsAfterColon = this.columnsBetween(colonToken, tokenAfterColon);
      var typeToken = linesAfterColon === 0 && colsAfterColon === 0 ? tokenAfterColon : undefined;
      var argTokens = tokens.slice(argBounds[0] + 1, argBounds[1]);
      var blockStartIndex = colonIndex + (_underscore2.default.isUndefined(typeToken) ? 1 : 2);
      var blockTokens = tokens.slice(blockStartIndex);

      return {
        operation: 'anonFnDefinition',
        colonToken: colonToken,
        typeToken: typeToken,
        argumentsNode: this.pemdasNodeFromStatement(argTokens),
        blockNodes: this.traverse(blockTokens)
      };
    }
  }, {
    key: "fnDeclarationNode",
    value: function fnDeclarationNode(tokens) {
      var defToken = tokens[0];
      if (_underscore2.default.isUndefined(defToken) || defToken.name !== 'def') {
        throw errorAt(defToken, 'Expected "def" to start the function declaration');
      }

      var nameToken = tokens[1];
      if (_underscore2.default.isUndefined(nameToken) || nameToken.name !== 'identifier') {
        throw errorAt(nameToken, 'Expected the function declaration to have a valid name');
      }

      var argBounds = this.boundsOfFirstGroupInTokens(tokens);
      if (argBounds[0] !== 2) {
        throw errorAt(nameToken, 'Expected arguments for function declaration after name');
      }

      var colonIndex = argBounds[1] + 1;
      var colonToken = tokens[colonIndex];
      if (_underscore2.default.isUndefined(colonToken) || colonToken.name !== 'colon') {
        throw errorAt(colonToken, 'Expected valid function declaration');
      }

      var tokenAfterColon = tokens[colonIndex + 1];
      var linesAfterColon = this.linesBetween(colonToken, tokenAfterColon);
      var colsAfterColon = this.columnsBetween(colonToken, tokenAfterColon);
      var typeToken = linesAfterColon === 0 && colsAfterColon === 0 ? tokenAfterColon : undefined;
      var argTokens = tokens.slice(argBounds[0] + 1, argBounds[1]);
      var blockStartIndex = colonIndex + (_underscore2.default.isUndefined(typeToken) ? 1 : 2);
      var blockTokens = tokens.slice(blockStartIndex);

      return {
        operation: 'fnDeclaration',
        nameToken: nameToken,
        colonToken: colonToken,
        typeToken: typeToken,
        argumentsNode: this.pemdasNodeFromStatement(argTokens),
        blockNodes: this.traverse(blockTokens)
      };
    }
  }, {
    key: "propDefaultNode",
    value: function propDefaultNode(tokens) {
      var nameToken = tokens[0];
      if (_underscore2.default.isUndefined(nameToken) || nameToken.name !== 'identifier') {
        throw errorAt(nameToken, 'Expected the prop default to have a valid name');
      }

      var colonToken = tokens[1];
      if (_underscore2.default.isUndefined(colonToken) || colonToken.name !== 'colon') {
        throw errorAt(colonToken, 'Expected valid prop default definition');
      }

      var typeToken = tokens[2];
      var linesAfterColon = this.linesBetween(colonToken, typeToken);
      var colsAfterColon = this.columnsBetween(colonToken, typeToken);
      var typePosIsValid = linesAfterColon === 0 && colsAfterColon === 0;
      if (_underscore2.default.isUndefined(typeToken) || !typePosIsValid || typeToken.type !== 'word') {
        throw errorAt(colonToken, 'Prop must specify a type');
      }

      var blockTokens = tokens.slice(3);

      return {
        operation: 'propDefault',
        nameToken: nameToken,
        colonToken: colonToken,
        typeToken: typeToken,
        blockNodes: this.traverse(blockTokens)
      };
    }
  }, {
    key: "propSetterNode",
    value: function propSetterNode(tokens) {
      var nameToken = tokens[0];
      if (_underscore2.default.isUndefined(nameToken) || nameToken.name !== 'identifier') {
        throw errorAt(nameToken, 'Expected the prop default to have a valid name');
      }

      var colonToken = tokens[1];
      if (_underscore2.default.isUndefined(colonToken) || colonToken.name !== 'colon') {
        throw errorAt(colonToken, 'Expected valid prop default definition');
      }

      var typeToken = tokens[2];
      var linesAfterColon = this.linesBetween(colonToken, typeToken);
      var colsAfterColon = this.columnsBetween(colonToken, typeToken);
      var typePosIsValid = linesAfterColon === 0 && colsAfterColon === 0;
      if (_underscore2.default.isUndefined(typeToken) || !typePosIsValid || typeToken.type !== 'word') {
        throw errorAt(colonToken, 'Prop must specify a type');
      }

      var setToken = tokens[3];
      var linesAfterType = this.linesBetween(typeToken, setToken);
      if (_underscore2.default.isUndefined(setToken) || linesAfterType !== 0) {
        throw errorAt(typeToken, 'Expected prop setter "set" keyword after specifying type');
      }

      var blockTokens = tokens.slice(4);

      return {
        operation: 'propSetter',
        nameToken: nameToken,
        colonToken: colonToken,
        typeToken: typeToken,
        blockNodes: this.traverse(blockTokens)
      };
    }
  }, {
    key: "functionCallNode",
    value: function functionCallNode(indexOfOpenToken, tokens) {
      var openToken = tokens[indexOfOpenToken];
      var leftToken = tokens[indexOfOpenToken - 1];

      if (!openToken || !leftToken || openToken.name !== 'openParen') {
        throw errorAt(openToken, 'Expected function call');
      }

      var validLeftTypes = ['word', 'string', 'number'];
      var validLeftNames = ['closeParen', 'closeBracket', 'closeBrace'];
      if (!(_underscore2.default.contains(validLeftTypes, leftToken.type) || _underscore2.default.contains(validLeftNames, leftToken.name))) {
        throw errorAt(leftToken, 'Invalid function callee');
      }

      var calleeTokens = _underscore2.default.first(tokens, indexOfOpenToken);
      var restOfTokens = tokens.slice(indexOfOpenToken);
      var boundsOfArgs = this.boundsOfFirstGroupInTokens(restOfTokens);

      if (_underscore2.default.isEmpty(boundsOfArgs)) {
        throw errorAt(openToken, 'Incomplete argument group for function call');
      }

      var closeToken = restOfTokens[boundsOfArgs[1]];
      var argumentsTokens = restOfTokens.slice(boundsOfArgs[0] + 1, boundsOfArgs[1]);

      return {
        operation: 'functionCall',
        openToken: openToken,
        closeToken: closeToken,
        calleeNode: this.pemdasNodeFromStatement(calleeTokens),
        argumentsNode: this.pemdasNodeFromStatement(argumentsTokens)
      };
    }
  }, {
    key: "hashPairNode",
    value: function hashPairNode(indexOfHashColon, tokens) {
      var colonToken = tokens[indexOfHashColon];
      if (colonToken.name !== 'colon') {
        throw errorAt(colonToken, 'Expected to find a hash pair colon');
      }

      var leftTokens = _underscore2.default.first(tokens, indexOfHashColon);
      if (_underscore2.default.isEmpty(leftTokens)) {
        throw errorAt(colonToken, 'Found no left-hand side (key) for the hash pair');
      }

      var rightTokens = tokens.slice(indexOfHashColon + 1);
      if (_underscore2.default.isEmpty(rightTokens)) {
        throw errorAt(colonToken, 'Found no right-hand side (value) for the hash pair');
      }

      return {
        operation: 'hashPair',
        token: colonToken,
        keyNode: this.pemdasNodeFromStatement(leftTokens),
        valueNode: this.pemdasNodeFromStatement(rightTokens)
      };
    }
  }, {
    key: "protoDefinitionNode",
    value: function protoDefinitionNode(tokens) {
      var protoToken = tokens[0];
      if (protoToken.name !== 'proto') {
        throw errorAt(protoToken, 'Expected proto definition');
      }

      var validLeftTypes = ['word'];
      var validRightTypes = [];
      var indexOfFrom = this.indexOfBinaryOperation('protoDerivation', tokens, { validLeftTypes: validLeftTypes, validRightTypes: validRightTypes });
      var indexOfShaped = this.indexOfBinaryOperation('shapeDefinition', tokens, { validLeftTypes: validLeftTypes, validRightTypes: validRightTypes });
      var indexOfExtends = this.indexOfBinaryOperation('extensionDefinition', tokens, { validLeftTypes: validLeftTypes, validRightTypes: validRightTypes });

      var derivationToken = tokens[indexOfFrom] && tokens[indexOfFrom + 1];
      var shapeBlockBounds = indexOfShaped === -1 ? [] : this.boundsOfFirstGroupInTokens(tokens.slice(indexOfShaped));
      var extendBlockBounds = indexOfExtends === -1 ? [] : this.boundsOfFirstGroupInTokens(tokens.slice(indexOfExtends));
      var canonicalShapeBounds = _underscore2.default.map(shapeBlockBounds, function (boundary) {
        return boundary + indexOfShaped;
      });
      var canonicalExtendBounds = _underscore2.default.map(extendBlockBounds, function (boundary) {
        return boundary + indexOfExtends;
      });

      // hacky bullshit that needs to be rewritten ASAP
      var shapeTokens = tokens.slice((canonicalShapeBounds[0] || -1) + 1, canonicalShapeBounds[1] || 0);
      var extensionTokens = tokens.slice((canonicalExtendBounds[0] || -1) + 1, canonicalExtendBounds[1] || 0);

      return {
        operation: 'protoDefinition',
        protoToken: protoToken,
        derivationToken: derivationToken,
        shapeBlockNodes: this.traverse(shapeTokens),
        extendBlockNodes: this.traverse(extensionTokens)
      };
    }
  }, {
    key: "regexNode",
    value: function regexNode(tokens) {
      var openSlash = tokens[0];
      if (openSlash.name !== 'slash') throw errorAt(openSlash, 'Expected regex to begin');
    }
  }, {
    key: "pemdasNodeFromStatement",
    value: function pemdasNodeFromStatement(statementTokens) {
      if (_underscore2.default.isEmpty(statementTokens)) {
        return null;
      }

      if (statementTokens.length === 1) {
        return this.identityNode(statementTokens[0]);
      }

      var indexOfSequence = this.indexOfSequence(statementTokens);
      if (indexOfSequence !== -1) {
        return this.sequenceNode(indexOfSequence, statementTokens);
      }

      var indexOfAssignment = this.indexOfAssignment(statementTokens);
      if (indexOfAssignment !== -1) {
        return this.binaryOperationNode('assignment', indexOfAssignment, statementTokens);
      }

      var indexOfLogicalOR = this.indexOfLogicalOR(statementTokens);
      if (indexOfLogicalOR !== -1) {
        return this.binaryOperationNode('boolean', indexOfLogicalOR, statementTokens);
      }

      var indexOfLogicalAND = this.indexOfLogicalAND(statementTokens);
      if (indexOfLogicalAND !== -1) {
        return this.binaryOperationNode('boolean', indexOfLogicalAND, statementTokens);
      }

      var indexOfEqualityComparison = this.indexOfEqualityComparison(statementTokens);
      if (indexOfEqualityComparison !== -1) {
        return this.binaryOperationNode('comparison', indexOfEqualityComparison, statementTokens);
      }

      var indexOfDifferentialComparison = this.indexOfDifferentialComparison(statementTokens);
      if (indexOfDifferentialComparison !== -1) {
        return this.binaryOperationNode('comparison', indexOfDifferentialComparison, statementTokens);
      }

      var indexOfAddition = this.indexOfAddition(statementTokens);
      var indexOfSubtraction = this.indexOfSubtraction(statementTokens);
      var firstLinearMathIndex = _underscore2.default.min(_underscore2.default.without([indexOfAddition, indexOfSubtraction], -1));
      switch (firstLinearMathIndex) {
        case indexOfAddition:
          return this.binaryOperationNode('addition', indexOfAddition, statementTokens);
        case indexOfSubtraction:
          return this.binaryOperationNode('subtraction', indexOfSubtraction, statementTokens);
        default:
          break; // to satisfy eslint
      }

      var indexOfDivision = this.indexOfDivision(statementTokens);
      var indexOfMultiplication = this.indexOfMultiplication(statementTokens);
      var firstPlanarMathIndex = _underscore2.default.min(_underscore2.default.without([indexOfDivision, indexOfMultiplication], -1));
      switch (firstPlanarMathIndex) {
        case indexOfDivision:
          return this.binaryOperationNode('division', indexOfDivision, statementTokens);
        case indexOfMultiplication:
          return this.binaryOperationNode('multiplication', indexOfMultiplication, statementTokens);
        default:
          break; // to satisfy eslint
      }

      var indexOfExponentiation = this.indexOfExponentiation(statementTokens);
      if (indexOfExponentiation !== -1) {
        return this.binaryOperationNode('exponentiation', indexOfExponentiation, statementTokens);
      }

      var firstToken = _underscore2.default.first(statementTokens);
      switch (firstToken.name) {
        case 'minus':
          return this.unaryOperationNode('negation', statementTokens);
        case 'plus':
          return this.unaryOperationNode('substantiation', statementTokens);
        case 'not':
          return this.unaryOperationNode('inversion', statementTokens);
        case 'proto':
          return this.protoDefinitionNode(statementTokens);
        case 'check':
          return this.checkNode(statementTokens);
        case 'guard':
          return this.guardNode(statementTokens);
        default:
          break; // to satisfy eslint
      }

      var indexOfHashColon = this.indexOfHashColon(statementTokens);
      if (indexOfHashColon !== -1) {
        return this.hashPairNode(indexOfHashColon, statementTokens);
      }

      var isAnonymousFn = this.startsWithAnonFn(statementTokens);
      var isFnDeclaration = !isAnonymousFn && this.startsWithFnDeclaration(statementTokens);
      var isPropDefault = !isAnonymousFn && !isFnDeclaration && this.startsWithPropDefault(statementTokens);
      var isPropSetter = !isAnonymousFn && !isFnDeclaration && !isPropDefault && this.startsWithPropSetter(statementTokens);

      switch (true) {
        case isAnonymousFn:
          return this.anonFnDefinitionNode(statementTokens);
        case isFnDeclaration:
          return this.fnDeclarationNode(statementTokens);
        case isPropDefault:
          return this.propDefaultNode(statementTokens);
        case isPropSetter:
          return this.propSetterNode(statementTokens);
        default:
          break; // to satisfy eslint
      }

      var indexOfDispatch = this.indexOfDispatch(statementTokens);
      var indexOfFunctionCall = this.indexOfFunctionCall(statementTokens);
      var firstAccessionIndex = _underscore2.default.min(_underscore2.default.without([indexOfDispatch, indexOfFunctionCall], -1));
      switch (firstAccessionIndex) {
        case indexOfDispatch:
          return this.binaryOperationNode('dispatch', indexOfDispatch, statementTokens);
        case indexOfFunctionCall:
          return this.functionCallNode(indexOfFunctionCall, statementTokens);
        default:
          break; // to satisfy eslint
      }

      switch (firstToken.name) {
        case 'openParen':
          return this.groupNode('parenGroup', statementTokens);
        case 'openBracket':
          return this.groupNode('bracketGroup', statementTokens);
        case 'openBrace':
          return this.groupNode('braceGroup', statementTokens);
        case 'slash':
          return this.regexNode(statementTokens);
        default:
          break; // to satisfy eslint
      }

      var lastToken = _underscore2.default.last(statementTokens);
      throw errorBetween(firstToken, lastToken, 'Unrecognized statement');
    }
  }, {
    key: "traverse",
    value: function traverse() {
      var tokens = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.tokenList;
      var nodes = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

      if (_underscore2.default.isEmpty(tokens)) return nodes;
      var firstStatement = this.firstStatementFromTokens(tokens);
      var firstNode = this.pemdasNodeFromStatement(firstStatement);
      nodes.push(firstNode);
      var restOfTokens = tokens.slice(firstStatement.length);
      return this.traverse(restOfTokens, nodes);
    }
  }]);

  return Syntaxer;
}();

exports.default = Syntaxer;

},{"underscore":1}]},{},[2]);
