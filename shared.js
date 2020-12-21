const fetch = require('node-fetch')
const dotenv = require('dotenv')
const fs = require('fs')
const path = require('path')
const Zip = require('adm-zip');


function readConfig() {
    const env = dotenv.config().parsed;
    const configStr = fs.readFileSync('config.json', 'utf-8');
    const config = JSON.parse(configStr);
    config.authToken = env['AUTH_TOKEN']
    return config;
}

function pollBuildJob(config, buildJobId) {
    var self = this;
    return new Promise((resolve, reject) => {
        console.log(" ↪️Polling build job ", buildJobId)
        fetch('https://playcanvas.com/api/jobs/' + buildJobId, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + config.authToken
            }
        })
        .then(res => res.json())
        .then((json) => {
            if (json.status == "complete") {
                console.log("✔️ Build job complete!",)
                resolve(json.data)
            } else if (json.status == "error") {
                console.log(" build job error ", json.messages)
                reject(new Error(json.messages.join(';')))
            } else if (json.status == "running") {
                console.log(" build job still running");
                return waitAndRetry(config, buildJobId, resolve);
            }
        })
    });
}

function waitAndRetry(config, buildJobId, callback) {
    return new Promise(resolve => {
        console.log(" will wait 1s and then retry")
        sleep(1000)
        .then(() => pollBuildJob(config, buildJobId))
        .then(callback); // nested promises anyone?
    })
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function downloadProject(config, directory) {
    return new Promise((resolve, reject) => {
        console.log("✔️ Requested build from Playcanvas")
        fetch('https://playcanvas.com/api/apps/download', {
            method: 'POST',
            body: JSON.stringify({
                "project_id": parseInt(config.playcanvas.project_id),
                "name": config.playcanvas.name,
                "scenes": config.playcanvas.scenes,
                "branch_id": config.playcanvas.branch_id,
                "description": config.playcanvas.description,
                "preload_bundle": config.playcanvas.preload_bundle,
                "version": config.playcanvas.version,
                "release_notes": config.playcanvas.release_notes,
                "scripts_concatenate": config.playcanvas.scripts_concatenate,
                "optimize_scene_format": config.playcanvas.optimize_scene_format
            }),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + config.authToken
            }
        })
        .then(res => {
            if (res.status !== 201) {
                throw new Error("Error: status code " + res.status);
            }
            return res.json();
        })
        .then(buildJob => pollBuildJob(config, buildJob.id))
        .then(json => {
            console.log("✔ Downloading zip", json.download_url);
            return fetch(json.download_url, {method: 'GET'})
        })
        .then(res => res.buffer())
        .then(buffer => {
            let output = path.resolve(__dirname, directory + "/" + config.playcanvas.project_name + '.zip');
            if (!fs.existsSync(path.dirname(output))) {
                fs.mkdirSync(path.dirname(output), {recursive:true});
            }
            fs.writeFileSync(output, buffer, 'binary')
            resolve(output);
        })
        .catch(reject);
    });
}

module.exports = { readConfig, pollBuildJob, waitAndRetry, sleep, downloadProject};