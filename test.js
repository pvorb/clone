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
