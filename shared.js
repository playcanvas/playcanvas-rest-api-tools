const fetch = require('node-fetch')
const dotenv = require('dotenv')
const fs = require('fs')
const path = require('path')
const Zip = require('adm-zip');


function readConfig() {
    const env = dotenv.config().parsed;
    const configStr = fs.readFileSync('config.json', 'utf-8');
    const config = JSON.parse(configStr);
    config.authToken = env['AUTH_TOKEN'];

    // Add defaults if they don't exist
    config.csp = config.csp || {};
    config.csp['style-src'] = config.csp['style-src'] || [];
    config.csp['connect-src'] = config.csp['connect-src'] || [];
    config.csp.patch_preload_bundles = config.csp.patch_preload_bundles || false;

    config.one_page = config.one_page || {};
    config.one_page.patch_xhr_out = config.one_page.patch_xhr_out || false;
    config.one_page.inline_game_scripts = config.one_page.inline_game_scripts || false;
    config.one_page.mraid_support = config.one_page.mraid_support || false;
    config.one_page.snapchat_cta = config.one_page.snapchat_cta || false;

    // Mon 17 May 2021: Backwards compatibility when this used to be a boolean
    // and convert to an object
    var onePageExternFiles = config.one_page.extern_files;
    if (onePageExternFiles) {
        if (typeof onePageExternFiles === 'boolean') {
            onePageExternFiles = {
                enabled: onePageExternFiles
            }
        }
    }

    config.one_page.compress_engine = config.one_page.compress_engine || '';

    onePageExternFiles = onePageExternFiles || { enabled: false };
    onePageExternFiles.folder_name = onePageExternFiles.folder_name || '';
    onePageExternFiles.external_url_prefix = onePageExternFiles.external_url_prefix || '';

    config.one_page.extern_files = onePageExternFiles;

    return config;
}

function pollJob(config, jobId) {
    var self = this;
    return new Promise((resolve, reject) => {
        console.log("↪️ Polling job ", jobId)
        fetch('https://playcanvas.com/api/jobs/' + jobId, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + config.authToken
            }
        })
        .then(res => res.json())
        .then((json) => {
            if (json.status == "complete") {
                console.log("✔️ Job complete!",)
                resolve(json.data)
            } else if (json.status == "error") {
                console.log("   job error ", json.messages)
                reject(new Error(json.messages.join(';')))
            } else if (json.status == "running") {
                console.log("   job still running");
                return waitAndRetry(config, jobId, resolve);
            }
        })
    });
}

function waitAndRetry(config, jobId, callback) {
    return new Promise(resolve => {
        console.log("   will wait 1s and then retry")
        sleep(1000)
        .then(() => pollJob(config, jobId))
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
                "scripts_minify": config.playcanvas.scripts_minify,
                "optimize_scene_format": config.playcanvas.optimize_scene_format,
                "engine_version": config.playcanvas.engine_version
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
        .then(buildJob => pollJob(config, buildJob.id))
        .then(json => {
            console.log("✔ Downloading zip", json.download_url);
            return fetch(json.download_url, {method: 'GET'})
        })
        .then(res => res.buffer())
        .then(buffer => {
            let output = path.resolve(__dirname, directory + "/" + config.playcanvas.name + '_Download.zip');
            if (!fs.existsSync(path.dirname(output))) {
                fs.mkdirSync(path.dirname(output), {recursive:true});
            }
            fs.writeFileSync(output, buffer, 'binary')
            resolve(output);
        })
        .catch(reject);
    });
}

function archiveProject(config, branchName, branchId, directory) {
    return new Promise((resolve, reject) => {
        console.log("✔️ Requested archive from Playcanvas")
        fetch('https://playcanvas.com/api/projects/' + config.playcanvas.project_id + '/export', {
            method: 'POST',
            body: JSON.stringify({
                "branch_id": branchId
            }),
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
        .then(buildJob => pollJob(config, buildJob.id))
        .then(json => {
            console.log("✔ Downloading zip", json.url);
            return fetch(json.url, {method: 'GET'})
        })
        .then(res => res.buffer())
        .then(buffer => {
            let output = path.resolve(__dirname, directory + "/" + config.playcanvas.name + '_Archive_' + branchName + '.zip');
            if (!fs.existsSync(path.dirname(output))) {
                fs.mkdirSync(path.dirname(output), {recursive:true});
            }
            fs.writeFileSync(output, buffer, 'binary')
            resolve(output);
        })
        .catch(reject);
    });
}

function unzipProject(zipLocation, unzipFolderName) {
    return new Promise((resolve, reject) => {
        console.log('✔️ Unzipping ', zipLocation);
        var zipFile = new Zip(zipLocation);
        try {
            var tempFolder = path.resolve(path.dirname(zipLocation), unzipFolderName);
            if (fs.existsSync(tempFolder)) {
                fs.rmdirSync(tempFolder, {recursive:true});
            }
            fs.mkdirSync(tempFolder);
            zipFile.extractAllTo(tempFolder, true);
            resolve(tempFolder);
        } catch (e) {
            reject(e);
        }
    });
}

function zipProject(rootFolder, targetLocation) {
    return new Promise((resolve, reject) => {
        console.log("✔️ Zipping it all back again")
        let output = path.resolve(__dirname, targetLocation);
        var zip = new Zip();
        zip.addLocalFolder(rootFolder);
        if (!fs.existsSync(path.dirname(output))) {
            fs.mkdirSync(path.dirname(output));
        }
        zip.writeZip(output);
        fs.rmdirSync(rootFolder, {recursive:true});
        resolve(output);
    });
}

module.exports = { readConfig, sleep, downloadProject, archiveProject, unzipProject, zipProject};
