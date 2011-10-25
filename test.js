var clone = require("./"),
        _ = require('underscore');

var a, b;

// string test
a = "foo";
b = clone(a);

if (_(a).isEqual(b))
  console.log("passed string test");
else
  console.log("failed string test");

// number test
a = 0;
b = clone(a);

if (_(a).isEqual(b))
  console.log("passed number test");
else
  console.log("failed number test");

// date test
a = new Date();
b = clone(a);

if (_(a).isEqual(b))
  console.log("passed date test");
else
  console.log("failed date test");
  delete refDate;

// object test
a = { foo: { bar: "baz" } }
b = clone(a);

if (_(a).isEqual(b))
  console.log("passed object test");
else
  console.log("failed object test");

// array test
a = [
  { foo: "bar" },
  "baz"
];
b = clone(a);

if (_(a).isEqual(b))
  console.log("passed array test");
else
  console.log("failed array test");

// extended array test
a = {
  arr1: [ { a: '1234', b: '2345' } ],
  arr2: [ { c: '345', d: '456' } ]
};
b = clone(a);

if (_(a).isEqual(b))
  console.log("passed extended array test");
else
  console.log("failed extended array test");


function test()
{
	var util = require('util');
	var _ = console.assert;
	var c = [1, "foo", {'hello': 'bar'}, function() {}, false, [2]];
	var b = [c, 2, 3, 4];
	var a = {'b': b, 'c': c};
	a.loop = a;
	a.loop2 = a;
	c.loop = c;
	c.aloop = a;
	var aCopy = clone(a);
	_(a != aCopy);
	_(a.c != aCopy.c);
	_(aCopy.c == aCopy.b[0]);
	_(aCopy.c.loop.loop.aloop == aCopy);
	_(aCopy.c[0] == a.c[0]);
	
	console.log(util.inspect(aCopy, true, null) );
	console.log("------------------------------------------------------------------");
	console.log(util.inspect(a, true, null) );
	_(eq(a, aCopy));
	aCopy.c[0] = 2;
	_(!eq(a, aCopy));
	aCopy.c = "2";
	_(!eq(a, aCopy));
	console.log("------------------------------------------------------------------");
	console.log(util.inspect(aCopy, true, null) );

	function eq(x, y) {
		return util.inspect(x, true, null) === util.inspect(y, true, null);
	}
}
test();