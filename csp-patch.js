const fetch = require('node-fetch')
const dotenv = require('dotenv')
const fs = require('fs')
const path = require('path')
const Zip = require('adm-zip');

const shared = require('./shared');

const config = shared.readConfig();


function addCspMetadata(projectLocation) {
    return new Promise((resolve, reject) => {
        console.log("✔️ Adding CSP");
        var indexLocation = path.resolve(projectLocation, 'index.html');
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

shared.downloadProject(config, "temp/downloads")
    .then((zipLocation) => shared.unzipProject(zipLocation, "contents/"))
    .then(addCspMetadata)
    .then((rootFolder) => shared.zipProject(rootFolder, 'temp/out/'+config.playcanvas.name+'_WithCSP.zip'))
    .then(outputZip => console.log("Success", outputZip))
    .catch(err => console.log("Error", err));
