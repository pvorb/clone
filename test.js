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

exports["clone error"] = function (test) {
  test.expect(4);

  var a = new Error('Boom!!!');
  var b = clone(a);

  test.deepEqual(b, a);
  test.notEqual(b, a);
  test.ok(b instanceof Error);
  test.equal(b.message, a.message);

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

var nativeSymbol;
try {
  nativeSymbol = Symbol
} catch(_) {}
if (nativeSymbol) {
  exports["clone only enumerable symbol properties"] = function (test) {
    test.expect(3);

    var source = {};
    var symbol1 = nativeSymbol('the first symbol');
    var symbol2 = nativeSymbol('the second symbol');
    var symbol3 = nativeSymbol('the third symbol');
    source[symbol1] = 1;
    source[symbol2] = 2;
    source[symbol3] = 3;
    Object.defineProperty(source, symbol2, {
      enumerable: false
    });

    var cloned = clone(source);
    test.equal(cloned[symbol1], 1);
    test.equal(cloned.hasOwnProperty(symbol2), false);
    test.equal(cloned[symbol3], 3);

    test.done();
  };
}

exports["clone should ignore non-enumerable properties by default"] = function (test) {
  test.expect(5);

  var nativeSymbol;
  try {
    nativeSymbol = Symbol
  } catch(_) {
    nativeSymbol = function(id) {
      return '__symbol__:' + id
    }
  }

  var source = {
    x: 1,
    y: 2
  };
  Object.defineProperty(source, 'y', {
    enumerable: false
  });
  Object.defineProperty(source, 'z', {
    value: 3
  });
  var symbol1 = nativeSymbol('a');
  var symbol2 = nativeSymbol('b');
  source[symbol1] = 4;
  source[symbol2] = 5;
  Object.defineProperty(source, symbol2, {
    enumerable: false
  });

  var cloned = clone(source);
  test.equal(cloned.x, 1);
  test.equal(Object.hasOwnProperty(cloned, 'y'), false);
  test.equal(Object.hasOwnProperty(cloned, 'z'), false);
  test.equal(cloned[symbol1], 4);
  test.equal(Object.hasOwnProperty(cloned, symbol2), false);

  test.done();
};

exports["clone should support cloning non-enumerable properties"] = function (test) {
  test.expect(6);

  var nativeSymbol;
  try {
    nativeSymbol = Symbol
  } catch(_) {
    nativeSymbol = function(id) {
      return '__symbol__:' + id
    }
  }

  var source = { x: 1, b: [2] };
  Object.defineProperty(source, 'b', {
    enumerable: false
  });
  var symbol = nativeSymbol('a');
  source[symbol] = { x: 3 };
  Object.defineProperty(source, symbol, {
    enumerable: false
  });

  var cloned = clone(source, false, Infinity, undefined, true);
  test.equal(cloned.x, 1);
  test.equal(cloned.b instanceof Array, true);
  test.equal(cloned.b.length, 1);
  test.equal(cloned.b[0], 2);
  test.equal(cloned[symbol] instanceof Object, true);
  test.equal(cloned[symbol].x, 3);

  test.done();
};

exports["clone should allow enabling the cloning of non-enumerable properties via an options object"] = function (test) {
  test.expect(1);

  var source = { x: 1 };
  Object.defineProperty(source, 'x', {
    enumerable: false
  });

  var cloned = clone(source, {
    includeNonEnumerable: true
  });
  test.equal(cloned.x, 1);

  test.done();
};

exports["clone should mark the cloned non-enumerable properties as non-enumerable"] = function (test) {
  test.expect(4);

  var nativeSymbol;
  try {
    nativeSymbol = Symbol
  } catch(_) {
    nativeSymbol = function(id) {
      return '__symbol__:' + id
    }
  }

  var source = { x: 1, y: 2 };
  Object.defineProperty(source, 'y', {
    enumerable: false
  });
  var symbol1 = nativeSymbol('a');
  var symbol2 = nativeSymbol('b');
  source[symbol1] = 3;
  source[symbol2] = 4;
  Object.defineProperty(source, symbol2, {
    enumerable: false
  });

  var cloned = clone(source, {
    includeNonEnumerable: true
  });
  test.equal(Object.getOwnPropertyDescriptor(cloned, 'x').enumerable, true);
  test.equal(Object.getOwnPropertyDescriptor(cloned, 'y').enumerable, false);
  test.equal(
    Object.getOwnPropertyDescriptor(cloned, symbol1).enumerable,
    true
  );
  test.equal(
    Object.getOwnPropertyDescriptor(cloned, symbol2).enumerable,
    false
  );

  test.done();
};

exports["clone should not fail when cloning an object that does not have setters defined on some of its properties"] = function (test) {
  test.expect(1);

  //init an object with only a getter defined
  var source = { x: null };
  Object.defineProperty(source, 'x', { 
    get: function() { 
      return x; 
    }
  });

  test.doesNotThrow(
    function(){
      var cloned = clone(source);
    }
  )

  test.done();
};
exports["clone binary Float32Array methods"] = function (test) {
  if (typeof Float32Array == 'undefined') return test.done();
  var source = new Float32Array([10, 11.25]);
  var copied = clone(source);
  test.notStrictEqual(copied, source);
  test.notStrictEqual(copied.buffer, source.buffer);
  test.equal(copied.length, 2);
  test.equal(copied.subarray(1)[0], 11.25);
  copied.set([20]);
  test.equal(copied[0], 20);
  test.equal(source[0], 10);
  test.done();
};

exports["clone binary typed array kinds"] = function (test) {
  var types = [
    typeof Int8Array != 'undefined' && Int8Array,
    typeof Uint8Array != 'undefined' && Uint8Array,
    typeof Uint8ClampedArray != 'undefined' && Uint8ClampedArray,
    typeof Int16Array != 'undefined' && Int16Array,
    typeof Uint16Array != 'undefined' && Uint16Array,
    typeof Int32Array != 'undefined' && Int32Array,
    typeof Uint32Array != 'undefined' && Uint32Array,
    typeof Float16Array != 'undefined' && Float16Array,
    typeof Float32Array != 'undefined' && Float32Array,
    typeof Float64Array != 'undefined' && Float64Array,
    typeof BigInt64Array != 'undefined' && BigInt64Array,
    typeof BigUint64Array != 'undefined' && BigUint64Array
  ];
  types.forEach(function (Type) {
    if (!Type) return;
    var source = new Type(3);
    var value = typeof source[0] == 'bigint' ? BigInt(17) : 17;
    source[1] = value;
    var copied = clone(source);
    test.ok(copied instanceof Type);
    test.equal(copied.length, 3);
    test.strictEqual(copied[1], value);
    test.strictEqual(copied.subarray(1, 2)[0], value);
    test.notStrictEqual(copied.buffer, source.buffer);
    test.equal(clone(new Type(0)).length, 0);
  });
  test.done();
};

exports["clone binary ArrayBuffer and DataView"] = function (test) {
  if (typeof DataView == 'undefined') return test.done();
  var buffer = new ArrayBuffer(16);
  var source = new DataView(buffer, 4, 8);
  source.setUint32(0, 0x12345678);
  source.note = { name: 'view' };
  buffer.note = { name: 'buffer' };
  var copied = clone(source);
  test.equal(copied.byteOffset, 4);
  test.equal(copied.byteLength, 8);
  test.equal(copied.buffer.byteLength, 16);
  test.equal(copied.getUint32(0), 0x12345678);
  test.notStrictEqual(copied.note, source.note);
  test.notStrictEqual(copied.buffer.note, buffer.note);
  copied.setUint32(0, 0);
  test.equal(source.getUint32(0), 0x12345678);
  var bufferCopy = clone(buffer);
  test.equal(new DataView(bufferCopy).getUint32(4), 0x12345678);
  test.notStrictEqual(bufferCopy.note, buffer.note);
  test.equal(clone(new DataView(buffer, 16, 0)).byteLength, 0);
  test.done();
};

exports["clone binary shared references and cycles"] = function (test) {
  if (typeof DataView == 'undefined') return test.done();
  var buffer = new ArrayBuffer(32);
  var bytes = new Uint8Array(buffer, 4, 8);
  var words = new Uint16Array(buffer, 8, 4);
  var view = new DataView(buffer, 4, 8);
  buffer.bytes = bytes;
  bytes.owner = buffer;
  bytes.self = bytes;
  var copied = clone([bytes, words, buffer, bytes, view]);
  test.strictEqual(copied[0], copied[3]);
  test.strictEqual(copied[0].buffer, copied[2]);
  test.strictEqual(copied[1].buffer, copied[2]);
  test.strictEqual(copied[4].buffer, copied[2]);
  test.strictEqual(copied[2].bytes, copied[0]);
  test.strictEqual(copied[0].owner, copied[2]);
  test.strictEqual(copied[0].self, copied[0]);
  test.notStrictEqual(copied[2], buffer);
  test.equal(copied[0].byteOffset, 4);
  test.equal(copied[1].byteOffset, 8);
  copied[0][0] = 23;
  test.equal(copied[4].getUint8(0), 23);
  test.equal(bytes[0], 0);
  var rootBufferCopy = clone(buffer);
  test.strictEqual(rootBufferCopy.bytes.buffer, rootBufferCopy);
  test.strictEqual(rootBufferCopy.bytes.owner, rootBufferCopy);
  test.done();
};

exports["clone binary depth and noncircular options"] = function (test) {
  if (typeof Uint8Array == 'undefined') return test.done();
  var source = new Uint8Array([1, 2]);
  source.note = { name: 'data' };
  source.buffer.note = { name: 'storage' };
  test.strictEqual(clone(source, true, 0), source);
  var shallow = clone(source, true, 1);
  test.notStrictEqual(shallow, source);
  test.notStrictEqual(shallow.buffer, source.buffer);
  test.strictEqual(shallow.note, source.note);
  test.strictEqual(shallow.buffer.note, source.buffer.note);
  test.equal(shallow.subarray(1)[0], 2);
  var copied = clone(source, false);
  test.notStrictEqual(copied.buffer, source.buffer);
  test.notStrictEqual(copied.note, source.note);
  test.notStrictEqual(copied.buffer.note, source.buffer.note);
  test.equal(copied[1], 2);
  test.done();
};

exports["clone binary constructors and prototypes"] = function (test) {
  if (typeof Float32Array == 'undefined') return test.done();
  function CustomArray() { throw new Error('Do not call user constructors'); }
  var source = new Float32Array([10, 11]);
  source.constructor = CustomArray;
  source.buffer.constructor = CustomArray;
  if (Object.setPrototypeOf) {
    CustomArray.prototype = Object.create(Float32Array.prototype);
    Object.setPrototypeOf(source, CustomArray.prototype);
  }
  var copied = clone(source);
  test.strictEqual(copied.constructor, CustomArray);
  test.strictEqual(copied.buffer.constructor, CustomArray);
  test.strictEqual(Object.getPrototypeOf(copied), Object.getPrototypeOf(source));
  test.equal(copied.length, 2);
  copied.set([12]);
  test.equal(copied[0], 12);
  test.equal(source[0], 10);
  test.done();
};

exports["clone binary arrays from another context"] = function (test) {
  if (typeof Float32Array == 'undefined') return test.done();
  apartContext({}, 'new Float32Array([3.5, 4.5])', function (source) {
    var copied = clone(source);
    test.equal(copied.length, 2);
    test.equal(copied.subarray(1)[0], 4.5);
    test.notStrictEqual(copied.buffer, source.buffer);
    if (Object.setPrototypeOf) {
      test.strictEqual(Object.getPrototypeOf(copied), Object.getPrototypeOf(source));
    }
    test.done();
  });
};

exports["clone binary SharedArrayBuffer"] = function (test) {
  if (typeof SharedArrayBuffer == 'undefined') return test.done();
  var source = new Uint8Array(new SharedArrayBuffer(8), 2, 4);
  source[0] = 13;
  var copied = clone({ view: source, buffer: source.buffer });
  test.ok(copied.buffer instanceof SharedArrayBuffer);
  test.strictEqual(copied.view.buffer, copied.buffer);
  test.notStrictEqual(copied.buffer, source.buffer);
  test.equal(copied.view.byteOffset, 2);
  test.equal(copied.view[0], 13);
  copied.view[0] = 14;
  test.equal(source[0], 13);
  test.done();
};

exports["clone binary preserves backing bytes"] = function (test) {
  if (typeof Float32Array == 'undefined') return test.done();
  var buffer = new ArrayBuffer(16);
  var words = new Uint32Array(buffer);
  words[0] = 0x12345678;
  words[1] = 0x7f800001; // NaN payloads must not be rewritten as numeric values.
  words[2] = 0x80000000;
  words[3] = 0x87654321;
  var source = new Float32Array(buffer, 4, 2);
  var copied = clone(source);
  test.deepEqual(Array.prototype.slice.call(new Uint32Array(copied.buffer)),
    Array.prototype.slice.call(words));
  test.equal(copied.byteOffset, 4);
  test.equal(copied.length, 2);
  test.done();
};
