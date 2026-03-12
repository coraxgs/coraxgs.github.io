const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// Ensure init3DGAPbot is called in DOMContentLoaded
const initRegex = /(document\.addEventListener\('DOMContentLoaded', \(\) => \{\n\s+setTimeout\(\(\) => \{)/;
code = code.replace(initRegex, `$1\n    init3DGAPbot();\n    initScrollAnimations();`);
fs.writeFileSync('app.js', code);
console.log('Patched DOMContentLoaded init.');
