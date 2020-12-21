const fetch = require('node-fetch')
const fs = require('fs')
const path = require('path')

const shared = require('./shared');

const config = shared.readConfig();

shared.archiveProject(config, config.playcanvas.branch_name, config.playcanvas.branch_id, "temp/out")
    .then((output) => console.log("Success", output))
    .catch(err => console.log("Error", err));

