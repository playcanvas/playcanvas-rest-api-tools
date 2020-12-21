const fetch = require('node-fetch')
const dotenv = require('dotenv')
const fs = require('fs')
const path = require('path')
const Zip = require('adm-zip');

const shared = require('./shared');

const config = shared.readConfig();

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

shared.downloadProject(config, "temp/downloads")
    .then(unzipProject)
    .then(addCspMetadata)
    .then(zipProject)
    .then(outputZip => console.log("Success", outputZip))
    .catch(err => console.log("Error", err));
