const fetch = require('node-fetch')
const fs = require('fs')
const path = require('path')

const shared = require('./shared');

const config = shared.readConfig();

shared.downloadProject(config)
    .then((output) => console.log("Success"))
    .catch(err => console.log("Error", err));

