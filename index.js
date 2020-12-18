const fetch = require('node-fetch')
const dotenv = require('dotenv')
const fs = require('fs')
const path = require('path')
const Zip = require('adm-zip');

const config = readConfig();


function readConfig() {
    const env = dotenv.config().parsed;
    const configStr = fs.readFileSync('config.json', 'utf-8');
    const config = JSON.parse(configStr);
    config.authToken = env['AUTH_TOKEN']
    return config;
}

function downloadProject(config) {
    return new Promise((resolve, reject) => {
        console.log("✔️ Requested build from Playcanvas")
        fetch('https://playcanvas.com/api/apps/download', {
            method: 'POST',
            body: JSON.stringify({
                "project_id": parseInt(config.playcanvas.project_id),
                "name": config.playcanvas.project_name,
                "scenes": config.playcanvas.scenes,
                "preload_bundle": config.playcanvas.preload_bundle,
                "branch_id": config.playcanvas.branch_id
            }),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + config.authToken
            }
        })
        .then(res => res.json())
        .then(buildJob => pollBuildJob(buildJob.id))
        .then(json => {
            console.log("✔ Downloading zip", json.download_url);
            return fetch(json.download_url, {method: 'GET'})
        })
        .then(res => res.buffer())
        .then(buffer => {
            let output = path.resolve(__dirname, 'temp/downloads/'+config.playcanvas.project_name+'.zip');
            if (!fs.existsSync(path.dirname(output))) {
                fs.mkdirSync(path.dirname(output), {recursive:true});
            }
            fs.writeFileSync(output, buffer, 'binary')
            resolve(output);
        })
        .catch(reject);
    });
}

function pollBuildJob(buildJobId) {
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
                return waitAndRetry(buildJobId, resolve);
            }
        })
    });
}

function waitAndRetry(buildJobId, callback) {
    return new Promise(resolve => {
        console.log(" will wait 1s and then retry")
        sleep(1000)
        .then(() => pollBuildJob(buildJobId))
        .then(callback); // nested promises anyone?
    })
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function unzipProject(zipLocation) {
    return new Promise((resolve, reject) => {
        console.log('✔️ Unzipping ', zipLocation);
        var zipFile = new Zip(zipLocation);
        try {
            var tempFolder = path.resolve(path.dirname(zipLocation), 'contents/');
            if (fs.existsSync(tempFolder)) {
                fs.rmdirSync(tempFolder, {recursive:true});
            }
            fs.mkdirSync(tempFolder);
            zipFile.extractAllTo(tempFolder, true);
            var outputFile = path.resolve(tempFolder, 'index.html');
            resolve(outputFile);
        } catch (e) {
            reject(e);
        }
    });
}

function addCspMetadata(indexLocation) {
    return new Promise((resolve, reject) => {
        console.log("✔️ Adding CSP");
        var indexContents = fs.readFileSync(indexLocation, 'utf-8');
        var headStart = indexContents.indexOf("<head>");
        if (headStart < 0) {
            reject(new Error('Could not find head tag in index.html', indexLocation, indexContents));
        } else {
            var cspMetadata = getCspMetadataTag();
            var indexWithCsp = indexContents.replace("<head>", "<head>\n\t"+cspMetadata);
            fs.writeFileSync(indexLocation, indexWithCsp);
            resolve(path.dirname(indexLocation));
        }
    });
}

function zipProject(rootFolder) {
    return new Promise((resolve, reject) => {
        console.log("✔️ Zipping it all back again")
        let output = path.resolve(__dirname, 'temp/out/'+config.playcanvas.project_name+'_WithCSP.zip');
        var zip = new Zip();
        zip.addLocalFolder(rootFolder);
        if (!fs.existsSync(path.dirname(output))) {
            fs.mkdirSync(path.dirname(output));
        }
        zip.writeZip(output);
        fs.rmdirSync(rootFolder, {recursive:true});
        console.log("✔️... Done!", output)        
        resolve(output);
    });
}

function getCspMetadataTag() {
    var tag = "<meta http-equiv=\"Content-Security-Policy\" content=\"{0}\" />"
    var content = "";
    for (var key in config.csp) {
        content += key;
        for (var i in config.csp[key]) {
            var value = config.csp[key][i];
            content += " " + value 
        }
        content += "; "
    }

    return tag.replace("{0}", content);
}


downloadProject(config)
    .then(unzipProject)
    .then(addCspMetadata)
    .then(zipProject)
    .then(outputZip => console.log("Success", outputZip))
    .catch(err => console.log("Error", err));

