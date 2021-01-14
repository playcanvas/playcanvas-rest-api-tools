const fetch = require('node-fetch')
const dotenv = require('dotenv')
const fs = require('fs')
const path = require('path')
const Zip = require('adm-zip');
const base64js = require('base64-js');
const { minify } = require('terser');
const btoa = require('btoa');

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

function inlineAssets(projectPath) {
    return new Promise((resolve, reject) => {
        (async function() {
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
                indexContents = indexContents.replace('    <link rel="stylesheet" type="text/css" href="styles.css">\n', '');
            })();

            // 4. Open config.json and replace urls with base64 strings of the files with the correct mime type
            // 5. In config.json, remove hashes of all files that have an external URL
            await (async function() {
                console.log("↪️ Base64 encode all urls in config.json");

                var location = path.resolve(projectPath, "config.json");
                var contents = fs.readFileSync(location, 'utf-8');

                // Get all the matches
                var urlRegex = /"url":"(files.*?)"}/g;
                var urlMatches = [...contents.matchAll(urlRegex)];

                // Base64 encode all files
                for (const element of urlMatches) {
                    var url = unescape(element[1]);
                    var urlSplit = url.split('.');
                    var extension = urlSplit[urlSplit.length - 1];

                    var filepath = path.resolve(projectPath, url);

                    var fileContents;
                    var isText = false;

                    if (extension === 'js') {
                        isText = true;
                    }

                    if (isText) {
                        // Needed as we want to minify the JS code
                        fileContents = fs.readFileSync(filepath, 'utf-8');
                    } else {
                        fileContents = fs.readFileSync(filepath);
                    }

                    if (urlSplit.length === 0) {
                        reject('Filename does not have an extension: ' + url);
                    }

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

                        case "mp4": {
                            mimeprefix = "data:video/mp4";
                        } break;

                        case "js": {
                            mimeprefix = "data:text/javascript";
                            fileContents = (await minify(fileContents, { keep_fnames: true, ecma: '5' })).code;
                        } break;
                    }

                    var b64;

                    if (isText) {
                        b64 = btoa(unescape(encodeURIComponent(fileContents)));
                    } else {
                        var ba = Uint8Array.from(fileContents);
                        b64 = base64js.fromByteArray(ba);
                    }

                    // As we are using an escaped URL, we will search using the original URL
                    contents = contents.replace(element[1], mimeprefix + ';base64,' + b64);
                };

                // Remove the hashes
                var hashRegex = /"hash":"(.{32})"/g;
                contents = contents.replace(hashRegex, '"hash":""');

                fs.writeFileSync(location, contents);
            })();

            // 6. Remove __loading__.js.
            (function() {
                console.log("↪️ Remove __loading__.js");
                indexContents = indexContents.replace('    <script src="__loading__.js"></script>\n', '');
            })();


            // 7. In __settings__.js, change the SCENE_PATH to a base64 string of the scene file.
            // 8. In __settings__.js, change the CONFIG_FILENAME to a base64 string of the config.json file.
            (function() {
                console.log("↪️ Base64 encode the scene JSON and config JSON files");

                var location = path.resolve(projectPath, "__settings__.js");
                var contents = fs.readFileSync(location, 'utf-8');

                var jsonToBase64 = function(regex) {
                    var match = contents.match(regex);

                    // Assume match
                    var filepath = path.resolve(projectPath, match[1]);
                    var jsonContents = Uint8Array.from(fs.readFileSync(filepath));
                    var b64 = base64js.fromByteArray(jsonContents);

                    contents = contents.replace(match[1], "data:application/json;base64," + b64);
                };

                jsonToBase64(/SCENE_PATH = "(.*)";/i);
                jsonToBase64(/CONFIG_FILENAME = "(.*)"/i);

                fs.writeFileSync(location, contents);
            })();

            // Patch __start__.js to fix browser stretching on first load
            // https://github.com/playcanvas/engine/issues/2386#issuecomment-682053241
            (function() {
                console.log("↪️ Patching __start__.js");
                var location = path.resolve(projectPath, "__start__.js");
                var contents = fs.readFileSync(location, 'utf-8');

                var regex = /app\.resizeCanvas\(canvas\.width, canvas\.height\);.*canvas\.style\.height = '';/s;
                contents = contents.replace(regex, "canvas.style.width = '';canvas.style.height = '';app.resizeCanvas(canvas.width, canvas.height);");

                fs.writeFileSync(location, contents);
            })();

            // 9. Replace references to __settings__.js, __start__.js in index.html with contents of those files.
            // 10. Replace playcanvas-stable.min.js in index.html with a base64 string of the file.
            await (async function() {
                console.log("↪️ Inline JS scripts in index.html");

                var urlRegex = /<script src="(.*)"><\/script>/g;
                var urlMatches = [...indexContents.matchAll(urlRegex)];

                for (const element of urlMatches) {
                    var url = element[1];
                    var filepath = path.resolve(projectPath, url);
                    var fileContent = fs.readFileSync(filepath, 'utf-8');
                    fileContent = (await minify(fileContent, { keep_fnames: true, ecma: '5' })).code;
                    indexContents = indexContents.replace(element[0], '<script>' + fileContent + '</script>');
                };
            })();

            fs.writeFileSync(indexLocation, indexContents);
            resolve(indexLocation);
        })();
    });
}

function copyHtmlFile (inPath) {
    return new Promise((resolve, reject) => {
        console.log('✔️ Finishing up');
        var outputPath = path.resolve(__dirname, 'temp/out/' + config.playcanvas.name + '.html');
        fs.createReadStream(inPath).pipe(fs.createWriteStream(outputPath));
        resolve(outputPath);
    });
}


// Force not to concatenate scripts as they need to be inlined
config.playcanvas.scripts_concatenate = false;
shared.downloadProject(config, "temp/downloads")
    .then(unzipProject)
    .then(inlineAssets)
    .then(copyHtmlFile)
    .then(outputHtml => console.log("Success", outputHtml))
    .catch(err => console.log("Error", err));