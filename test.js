var clone = require('./');

function inspect(obj) {
  seen = [];
  return JSON.stringify(obj, function (key, val) {
    if (val !== null && typeof val == "object") {
      if (seen.indexOf(val) >= 0) {
        return '[cyclic]';
      }

      seen.push(val);
    }

    return val;
  });
}

// Creates a new VM in node, or an iframe in a browser in order to run the
// script
function apartContext(context, script, callback) {
  var vm = require('vm');

  if (vm) {
    var ctx = vm.createContext({ ctx: context });
    callback(vm.runInContext(script, ctx));
  } else if (document && document.createElement) {
    var iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    var myCtxId = 'tmpCtx' + Math.random();

    window[myCtxId] = context;
    iframe.src = 'test-apart-ctx.html?' + myCtxId + '&' + encodeURIComponent(script);
    iframe.onload = function() {
      try {
        callback(iframe.contentWindow.results);
      } catch (e) {
        throw e;
      }
    };
  } else {
    console.log('WARNING: cannot create an apart context.');
  }
}

exports["clone string"] = function (test) {
  test.expect(2); // how many tests?

  var a = "foo";
  test.strictEqual(clone(a), a);
  a = "";
  test.strictEqual(clone(a), a);

  test.done();
};

exports["clone number"] = function (test) {
  test.expect(5); // how many tests?

  var a = 0;
  test.strictEqual(clone(a), a);
  a = 1;
  test.strictEqual(clone(a), a);
  a = -1000;
  test.strictEqual(clone(a), a);
  a = 3.1415927;
  test.strictEqual(clone(a), a);
  a = -3.1415927;
  test.strictEqual(clone(a), a);

  test.done();
};

exports["clone date"] = function (test) {
  test.expect(3); // how many tests?

  var a = new Date ();
  var c = clone(a);
  test.ok(!!a.getUTCDate && !!a.toUTCString);
  test.ok(!!c.getUTCDate && !!c.toUTCString);
  test.equal(a.getTime(), c.getTime());

  test.done();
};

exports["clone object"] = function (test) {
  test.expect(1); // how many tests?

  var a = { foo: { bar: "baz" } };
  var b = clone(a);

  test.deepEqual(b, a);

  test.done();
};

exports["clone array"] = function (test) {
  test.expect(2); // how many tests?

  var a = [
    { foo: "bar" },
    "baz"
  ];
  var b = clone(a);

  test.ok(b instanceof Array);
  test.deepEqual(b, a);

  test.done();
};

exports["clone buffer"] = function (test) {
  if (typeof Buffer == 'undefined') {
    return test.done();
  }

  test.expect(1);

  var a = new Buffer("this is a test buffer");
  var b = clone(a);

  // no underscore equal since it has no concept of Buffers
  test.deepEqual(b, a);
  test.done();
};

exports["clone regexp"] = function (test) {
  test.expect(5);

  var a = /abc123/gi;
  var b = clone(a);
  test.deepEqual(b, a);

  var c = /a/g;
  test.ok(c.lastIndex === 0);

  c.exec('123a456a');
  test.ok(c.lastIndex === 4);

  var d = clone(c);
  test.ok(d.global);
  test.ok(d.lastIndex === 4);

  test.done();
};

exports["clone object containing array"] = function (test) {
  test.expect(1); // how many tests?

  var a = {
    arr1: [ { a: '1234', b: '2345' } ],
    arr2: [ { c: '345', d: '456' } ]
  };

  var b = clone(a);

  test.deepEqual(b, a);

  test.done();
};

exports["clone object with circular reference"] = function (test) {
  test.expect(8); // how many tests?

  var c = [1, "foo", {'hello': 'bar'}, function () {}, false, [2]];
  var b = [c, 2, 3, 4];

  var a = {'b': b, 'c': c};
  a.loop = a;
  a.loop2 = a;
  c.loop = c;
  c.aloop = a;

  var aCopy = clone(a);
  test.ok(a != aCopy);
  test.ok(a.c != aCopy.c);
  test.ok(aCopy.c == aCopy.b[0]);
  test.ok(aCopy.c.loop.loop.aloop == aCopy);
  test.ok(aCopy.c[0] == a.c[0]);

  test.ok(eq(a, aCopy));
  aCopy.c[0] = 2;
  test.ok(!eq(a, aCopy));
  aCopy.c = "2";
  test.ok(!eq(a, aCopy));

  function eq(x, y) {
    return inspect(x) === inspect(y);
  }

  test.done();
};

exports['clone prototype'] = function (test) {
  test.expect(3); // how many tests?

  var a = {
    a: "aaa",
    x: 123,
    y: 45.65
  };
  var b = clone.clonePrototype(a);

  test.strictEqual(b.a, a.a);
  test.strictEqual(b.x, a.x);
  test.strictEqual(b.y, a.y);

  test.done();
};

exports['clone within an apart context'] = function (test) {
  var results = apartContext({ clone: clone },
      "results = ctx.clone({ a: [1, 2, 3], d: new Date(), r: /^foo$/ig })",
      function (results) {
    test.ok(results.a.constructor.toString() === Array.toString());
    test.ok(results.d.constructor.toString() === Date.toString());
    test.ok(results.r.constructor.toString() === RegExp.toString());
    test.done();
  });
};

exports['clone object with no constructor'] = function (test) {
  test.expect(3);

  var n = null;

  var a = { foo: 'bar' };
  a.__proto__ = n;
  test.ok(typeof a === 'object');
  test.ok(typeof a !== null);

  var b = clone(a);
  test.ok(a.foo, b.foo);

  test.done();
};

exports['clone object with depth argument'] = function (test) {
  test.expect(6);

  var a = {
    foo: {
      bar : {
        baz : 'qux'
      }
    }
  };

  var b = clone(a, false, 1);
  test.deepEqual(b, a);
  test.notEqual(b, a);
  test.strictEqual(b.foo, a.foo);

  b = clone(a, true, 2);
  test.deepEqual(b, a);
  test.notEqual(b.foo, a.foo);
  test.strictEqual(b.foo.bar, a.foo.bar);

  test.done();
};

exports['maintain prototype chain in clones'] = function (test) {
  test.expect(1);

  function T() {}

  var a = new T();
  var b = clone(a);
  test.strictEqual(Object.getPrototypeOf(a), Object.getPrototypeOf(b));

  test.done();
};

exports['parent prototype is overriden with prototype provided'] = function (test) {
  test.expect(1);

  function T() {}

  var a = new T();
  var b = clone(a, true, Infinity, null);
  test.strictEqual(b.__defineSetter__, undefined);

  test.done();
};

exports['clone object with null children'] = function (test) {
  test.expect(1);
  var a = {
    foo: {
      bar: null,
      baz: {
        qux: false
      }
    }
  };

  var b = clone(a);

  test.deepEqual(b, a);
  test.done();
};

exports['clone instance with getter'] = function (test) {
  test.expect(1);
  function Ctor() {}
  Object.defineProperty(Ctor.prototype, 'prop', {
    configurable: true,
    enumerable: true,
    get: function() {
      return 'value';
    }
  });

  var a = new Ctor();
  var b = clone(a);

  test.strictEqual(b.prop, 'value');
  test.done();
};

if (Object.getOwnPropertySymbols) {
  exports['clone object with symbol properties'] = function (test) {
    var symbol = Symbol();
    var obj = {};
    obj[symbol] = 'foo';

    var child = clone(obj);

    test.notEqual(child, obj);
    test.equal(child[symbol], 'foo');

    test.done();
  }

  exports['symbols are treated as primitives'] = function (test) {
    var symbol = Symbol();
    var obj = {foo: symbol};

    var child = clone(obj);

    test.notEqual(child, obj);
    test.equal(child.foo, obj.foo);

    test.done();
  }
}

exports['get RegExp flags'] = function (test) {
  test.strictEqual(clone.__getRegExpFlags(/a/),   ''  );
  test.strictEqual(clone.__getRegExpFlags(/a/i),  'i' );
  test.strictEqual(clone.__getRegExpFlags(/a/g),  'g' );
  test.strictEqual(clone.__getRegExpFlags(/a/gi), 'gi');
  test.strictEqual(clone.__getRegExpFlags(/a/m),  'm' );

  test.done();
};

exports["recognize Array object"] = function (test) {
  var results = apartContext(null, "results = [1, 2, 3]", function(alien) {
    var local = [4, 5, 6];
    test.ok(clone.__isArray(alien)); // recognize in other context.
    test.ok(clone.__isArray(local)); // recognize in local context.
    test.ok(!clone.__isDate(alien));
    test.ok(!clone.__isDate(local));
    test.ok(!clone.__isRegExp(alien));
    test.ok(!clone.__isRegExp(local));
    test.done();
  });
};

exports["recognize Date object"] = function (test) {
  var results = apartContext(null, "results = new Date()", function(alien) {
    var local = new Date();

    test.ok(clone.__isDate(alien)); // recognize in other context.
    test.ok(clone.__isDate(local)); // recognize in local context.
    test.ok(!clone.__isArray(alien));
    test.ok(!clone.__isArray(local));
    test.ok(!clone.__isRegExp(alien));
    test.ok(!clone.__isRegExp(local));

    test.done();
  });
};

exports["recognize RegExp object"] = function (test) {
  var results = apartContext(null, "results = /foo/", function(alien) {
    var local = /bar/;

    test.ok(clone.__isRegExp(alien)); // recognize in other context.
    test.ok(clone.__isRegExp(local)); // recognize in local context.
    test.ok(!clone.__isArray(alien));
    test.ok(!clone.__isArray(local));
    test.ok(!clone.__isDate(alien));
    test.ok(!clone.__isDate(local));
    test.done();
  });
};

var nativeMap;
try {
  nativeMap = Map;
} catch(_) {}
if (nativeMap) {
  exports["clone a native Map"] = function (test) {
    var map = new Map();
    // simple key/value
    map.set('foo', 'bar');
    // circular object key/property
    map.set(map, map);
    // regular expando property
    map.bar = 'baz';
    // regular circular expando property
    map.circle = map;


    var clonedMap = clone(map);
    test.notEqual(map, clonedMap);
    test.equal(clonedMap.get('foo'), 'bar');
    test.equal(clonedMap.get(clonedMap), clonedMap);
    test.equal(clonedMap.bar, 'baz');
    test.equal(clonedMap.circle, clonedMap);

    test.done();
  }
}

var nativeSet;
try {
  nativeSet = Set;
} catch(_) {}
if (nativeSet) {
  exports["clone a native Set"] = function (test) {
    var set = new Set();
    // simple entry
    set.add('foo');
    // circular entry
    set.add(set);
    // regular expando property
    set.bar = 'baz';
    // regular circular expando property
    set.circle = set;


    var clonedSet = clone(set);
    test.notEqual(set, clonedSet);
    test.ok(clonedSet.has('foo'));
    test.ok(clonedSet.has(clonedSet));
    test.ok(!clonedSet.has(set));
    test.equal(clonedSet.bar, 'baz');
    test.equal(clonedSet.circle, clonedSet);

    test.done();
  }
}

var nativePromise;
try {
  nativePromise = Promise;
} catch(_) {}
if (nativePromise) {
  exports["clone a native Promise"] = function (test) {
    test.expect(9);

    var allDonePromises = [];

    // Resolving to a value
    allDonePromises.push(
      clone(Promise.resolve('foo')).then(function (value) {
        test.equal(value, 'foo');
      })
    );

    // Rejecting to a value
    allDonePromises.push(
      clone(Promise.reject('bar')).catch(function (value) {
        test.equal(value, 'bar');
      })
    );

    // Resolving to a promise
    allDonePromises.push(
      clone(Promise.resolve(Promise.resolve('baz'))).then(function (value) {
        test.equal(value, 'baz');
      })
    );

    // Resolving to a circular value
    var circle = {};
    circle.circle = circle;
    allDonePromises.push(
      clone(Promise.resolve(circle)).then(function (value) {
        test.notEqual(circle, value);
        test.equal(value.circle, value);
      })
    );

    var expandoPromise = Promise.resolve('ok');
    expandoPromise.circle = expandoPromise;
    expandoPromise.prop = 'val';
    var clonedPromise = clone(expandoPromise);
    test.notEqual(expandoPromise, clonedPromise);
    test.equal(clonedPromise.prop, 'val');
    test.equal(clonedPromise.circle, clonedPromise);
    allDonePromises.push(clonedPromise.then(function(value) {
      test.equal(value, 'ok');
    }));

    Promise.all(allDonePromises).then(function() {
      test.done();
    });
  }
}