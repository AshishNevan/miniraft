const statemachine = require("./statemachine");
const { argv } = require("node:process");

if (argv.length < 4) {
  console.log(`usage : npm index.js [node number] [number of nodes]`);
  return;
}

i = Number(argv[2]);
n = Number(argv[3]);

let statemachines = [];

// for (i = 1; i <= n; i++) {
// statemachines.push(
new statemachine(i, n).main();
//   );
// }
