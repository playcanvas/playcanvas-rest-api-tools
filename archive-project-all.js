const fetch = require('node-fetch')
const fs = require('fs')
const path = require('path')

const shared = require('./shared');

function getBranches(config) {
    return new Promise((resolve, reject) => {
        console.log("✔️ Requested branch list from Playcanvas");
        let url = 'https://playcanvas.com/api/projects/' + config.playcanvas.project_id + '/branches';

        fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + config.authToken
            }
        })
        .then(res => {
            if (res.status !== 200) {
                throw new Error("Error: status code " + res.status);
            }
            return res.json();
        })
        .then(branches => {
            resolve(branches);
        })
        .catch(reject);
    });
}

function processBranches (branches) {
    return new Promise((resolve, reject) => {
        console.log("↪️ Processing branch list from Playcanvas");

        let branchData = [];

        let results = branches.result;
        for (let i = 0; i < results.length; i++) {
            let result = results[i];
            branchData.push({
                name: result.name.replace(/[^a-z0-9]/gi, '_').toLowerCase(),
                id: result.id
            });
        }

        resolve(branchData);
    });
}

async function archiveBranches(config, branchData) {
    console.log("↪️ Start archiving all branches...");

    for (let i = 0; i < branchData.length; i++) {
        let branch = branchData[i];
        let startTime = Date.now();
        await shared.archiveProject(config, branch.name, branch.id, "temp/out");

        // Make sure we don't go other the strict rate limit
        let jobDurationMs = (Date.now() - startTime);
        let minDuration = 15000;

        if (jobDurationMs < minDuration) {
            console.log("↪️ Slowing down to stay within API rate limts...");
            await shared.sleep(minDuration - jobDurationMs);
        }
    }
}

const config = shared.readConfig();

getBranches(config)
    .then(processBranches)
    .then((branchData) => archiveBranches(config, branchData))
    .then(() => console.log("Success"))
    .catch(err => console.log("Error", err));

