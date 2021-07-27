const fs = require('fs')
const path = require('path')
const base64js = require('base64-js');
const { minify } = require('terser');
const btoa = require('btoa');
const replaceString = require('replace-string');
const lz4 = require('lz4');

const shared = require('./shared');

const config = shared.readConfig();

var externFiles = [
];

function patch(projectPath) {
    return new Promise((resolve, reject) => {
        (async function() {
            let indexLocation = path.resolve(projectPath, "index.html");
            let indexContents = fs.readFileSync(indexLocation, 'utf-8');

            indexContents = indexContents.replace(
                '<script src="playcanvas-stable.min.js"></script>',
                '<script src="playcanvas-stable.min.js"></script>\n    <script src="cordova.js"></script>'
            );

            // Open config.json and replace urls of audio assets with base64 strings of the files with
            // the correct mime type. Also, delete the audio files to save on package size
            await (async function() {
                console.log("↪️ Base64 encode audio assets config.json");

                let location = path.resolve(projectPath, "config.json");
                let contents = fs.readFileSync(location, 'utf-8');

                let configJson = JSON.parse(contents);
                let assets = configJson.assets;

                for (const [key, asset] of Object.entries(assets)) {
                    if (!Object.prototype.hasOwnProperty.call(assets, key)) {
                        continue;
                    }

                    // If it's not a file or an audio asset, we can ignore
                    if (!asset.file || asset.type !== 'audio') {
                        continue;
                    }

                    let url = unescape(asset.file.url);
                    let urlSplit = url.split('.');
                    let extension = urlSplit[urlSplit.length - 1];

                    let filepath = path.resolve(projectPath, url);
                    if (!fs.existsSync(filepath)) {
                        console.log("   Cannot find file " + filepath + " If it's a loading screen script, please ignore");
                        continue;
                    }

                    let fileContents = fs.readFileSync(filepath);
                    let mimeprefix = "data:application/octet-stream";

                    let ba = Uint8Array.from(fileContents);
                    let b64 = base64js.fromByteArray(ba);

                    // As we are using an escaped URL, we will search using the original URL
                    asset.file.url = mimeprefix + ';base64,' + b64;

                    // Remove the hash to prevent appending to the URL
                    asset.file.hash = "";

                    // Delete the audio file
                    fs.unlinkSync(filepath);
                };

                fs.writeFileSync(location, JSON.stringify(configJson));
            })();

            fs.writeFileSync(indexLocation, indexContents);
            resolve(projectPath);
        })();
    });
}

shared.downloadProject(config, "temp/downloads")
    .then((zipLocation) => shared.unzipProject(zipLocation, 'contents') )
    .then(patch)
    .then((rootFolder) => shared.zipProject(rootFolder, 'temp/out/'+config.playcanvas.name+'_CordovaPublish.zip'))
    .then(outputZip => console.log("Success", outputZip))
    .catch(err => console.log("Error", err));
