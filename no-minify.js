const fs = require('fs')
const path = require('path')

const shared = require('./shared');
const config = shared.readConfig();

function concatenateScripts (projectPath) {
    return new Promise((resolve, reject) => {
        console.log("↪️ Concatenating scripts");

        var configLocation = path.resolve(projectPath, "config.json");
        var contents = fs.readFileSync(configLocation, 'utf-8');

        var configJson = JSON.parse(contents);

        var scriptOrder = configJson.application_properties.scripts;
        var assets = configJson.assets;

        var concatStr = "";

        var filename = '__game-scripts.js';

        for (var i = 0; i < scriptOrder.length; ++i) {
            var id = scriptOrder[i];
            var asset = assets[id];

            console.log("   Processing " + asset.file.filename);

            var url = unescape(asset.file.url);
            var filepath = path.resolve(projectPath, url);

            var fileContents = fs.readFileSync(filepath, 'utf-8');
            concatStr += fileContents + '\n';

            asset.file.filename = filename;
            asset.file.url = filename;
        }

        fs.writeFileSync(configLocation, JSON.stringify(configJson));

        var targetLocation = path.resolve(projectPath, filename);
        fs.writeFileSync(targetLocation, concatStr);

        resolve(projectPath);
    });
}


// Force not to concatenate scripts as they need to manually concatenated
// without minification
config.playcanvas.scripts_concatenate = false;

shared.downloadProject(config, "temp/downloads")
    .then((zipLocation) => shared.unzipProject(zipLocation, "contents/"))
    .then(concatenateScripts)
    .then(rootFolder => shared.zipProject(rootFolder, 'temp/out/' + config.playcanvas.name + '_NoMinify.zip'))
    .then(outputZip => console.log("Success", outputZip))
    .catch(err => console.log("Error", err));