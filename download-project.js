const fetch = require('node-fetch')
const fs = require('fs')
const path = require('path')

const shared = require('./shared');

const config = shared.readConfig();

shared.downloadProject(config, "temp/out")
    .then((output) => console.log("Success", output))
    .catch(err => console.log("Error", err));

