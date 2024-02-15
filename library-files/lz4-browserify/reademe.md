# How to build the Browserify version of lz4js

Requires Node.js v20.

1. Install NPM packages via `npm i`
2. Install Browserify globablly `npm install -g browserify`
3. Install Terser globally `npm i -g terser`
4. Build the minified bundle `browserify main.js | terser --compress > ../lz4.js`
