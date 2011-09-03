var clone = require("./");

var a, b;

// string test
a = "foo";
b = clone(a);
a += "bar";

if (b === "foo")
	console.log("passed string test");
else
	console.log("failed string test");

// number test
a = 0;
b = clone(a);
a++;

if (b === 0)
	console.log("passed number test");
else
	console.log("failed number test");

// date test
a = new Date();
var refDate = new Date(a.getTime());
b = clone(a);
a.setYear(1999);

if (b.getTime() === refDate.getTime())
	console.log("passed date test");
else
	console.log("failed date test");
delete refDate;

// object test
a = { foo: { bar: "baz" } }
b = clone(a);
a.foo.bar = "foo";

if (b.foo.bar === "baz")
	console.log("passed object test");
else
	console.log("failed object test");

// array test
a = [
	{ foo: "bar" },
	"baz"
]
b = clone(a);
a[0].foo = "baz";

if (b[0].foo === "bar")
	console.log ("passed array test");
else
	console.log("failed array test");
