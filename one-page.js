const fetch = require('node-fetch')
const dotenv = require('dotenv')
const fs = require('fs')
const path = require('path')
const Zip = require('adm-zip');
const base64js = require('base64-js')

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
            resolve(tempFolder);
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

function inlineAssets(projectPath) {
    return new Promise((resolve, reject) => {
        var indexLocation = path.resolve(projectPath, "index.html");
        var indexContents = fs.readFileSync(indexLocation, 'utf-8');

        // 1. Remove manifest.json and the reference in the index.html
        (function() {
            console.log("↪️ Removing manifest.json");
            indexContents = indexContents.replace('    <link rel="manifest" href="manifest.json">\n', '');
        })();

        // 2. Remove __modules__.js and the reference in the index.html assuming we aren’t using modules for playable ads.
        (function() {
            console.log("↪️ Removing __modules__.js");

            var location = path.resolve(projectPath, "__start__.js");
            var contents = fs.readFileSync(location, 'utf-8');

            var regex = /if \(PRELOAD_MODULES.length > 0\).*configure\(\);\n    }/s;
            contents = contents.replace(regex, 'configure();');
            fs.writeFileSync(location, contents);
        })();


        // 3. Inline the styles.css contents into index.html in style header.
        (function() {
            console.log("↪️ Inlining style.css into index.html");

            var location = path.resolve(projectPath, "styles.css");
            var contents = fs.readFileSync(location, 'utf-8');

            indexContents = indexContents.replace('<style></style>', '<style>' + contents + '</style>');
        })();

        // 4. Open config.json and replace urls with base64 strings of the files with the correct mime type
        // 5. In config.json, remove hashes of all files that have an external URL
        (function() {
            console.log("↪️ Base64 encode all urls in config.json");

            var location = path.resolve(projectPath, "config.json");
            var contents = fs.readFileSync(location, 'utf-8');

            // Get all the matches
            var urlRegex = /"url":"(files.*?)"}/g;
            var urlMatches = [...contents.matchAll(urlRegex)];

            // Base64 encode all files
            urlMatches.forEach(element => {
                var url = element[1];
                var urlSplit = url.split('.');

                if (urlSplit.length === 0) {
                    reject('Filename does not have an extension: ' + url);
                }

                var extension = urlSplit[urlSplit.length - 1];

                var mimeprefix = "data:application/octet-stream";
                switch(extension) {
                    case "png": {
                        mimeprefix = "data:image/png";
                    } break;

                    case "jpeg":
                    case "jpg": {
                        mimeprefix = "data:image/jpeg";
                    } break;

                    case "json": {
                        mimeprefix = "data:application/octet-stream";
                    } break;

                    case "js": {
                        mimeprefix = "data:text/javascript"
                    } break;
                }

                var filepath = path.resolve(projectPath, url);
                var ba = Uint8Array.from(fs.readFileSync(filepath));
                var b64 = base64js.fromByteArray(ba);

                contents = contents.replace(url, mimeprefix + ';base64,' + b64);
            });

            // Remove the hashes
            var hashRegex = /"hash":"(.{32})"/g;
            contents = contents.replace(hashRegex, '"hash":""');

            fs.writeFileSync(location, contents);
        })();


        // 6. Remove the usage of logo.png from __loading__.js.
        // 7. In __settings__.js, change the SCENE_PATH to a base64 string of the scene file.
        // 8. In __settings__.js, change the CONFIG_FILENAME to a base64 string of the config.json file.
        // 9. Replace references to __settings__.js, __start__.js and __loading__.js in index.html with contents of those files.

        fs.writeFileSync(indexLocation, indexContents);
        resolve(indexLocation);

        // var filepath = path.resolve(tempFolder, 'files/assets/3371285/1/sfx_hit.mp3');
        // var ba = Uint8Array.from(fs.readFileSync(filepath));
        // var b64 = base64js.fromByteArray(ba);
        // console.log(b64);
        // resolve();
    });
}

// Force not to concatenate scripts as they need to be inlined
config.playcanvas.scripts_concatenate = false;

// shared.downloadProject(config, "temp/downloads")
//     .then(unzipProject)
//     .then(addCspMetadata)
//     //.then(zipProject)
//     //.then(outputZip => console.log("Success", outputZip))
//     .catch(err => console.log("Error", err));

var tempFolder = path.resolve("temp/downloads/contents/");
var indexFile = path.resolve(tempFolder, 'index.html');

var zipLocation = path.resolve(__dirname, "temp/downloads" + "/" + config.playcanvas.name + '_Download.zip')

unzipProject(zipLocation)
.then(inlineAssets)
    .catch(err => console.log("Error", err));
