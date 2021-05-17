const fs = require('fs')
const path = require('path')
const Zip = require('adm-zip');
const base64js = require('base64-js');
const { minify } = require('terser');
const btoa = require('btoa');
const replaceString = require('replace-string');

const shared = require('./shared');

const config = shared.readConfig();
const EXTERN_FILES = [
    'playcanvas-stable.min.js',
    '__settings__.js'
];

function inlineAssets(projectPath) {
    return new Promise((resolve, reject) => {
        (async function() {
            var indexLocation = path.resolve(projectPath, "index.html");
            var indexContents = fs.readFileSync(indexLocation, 'utf-8');

            var addPatchFile = function (filename) {
                var patchLocation = path.resolve(projectPath, filename);
                fs.copyFileSync('engine-patches/' + filename, patchLocation);
                indexContents = indexContents.replace(
                    '<script src="playcanvas-stable.min.js"></script>',
                    '<script src="playcanvas-stable.min.js"></script>\n    <script src="' + filename + '"></script>'
                );
            };

            (function () {
                // XHR request patch. We may need to not use XHR due to restrictions on the hosting service
                // such as Facebook playable ads. If that's the case, we will add a patch to override http.get
                // and decode the base64 URL ourselves
                // Copy the patch to the project directory and add the script to index.html
                if (config.one_page.patch_xhr_out) {
                    console.log("↪️ Adding no XHR engine patch");
                    addPatchFile('one-page-no-xhr-request.js');
                }

                // Inline game scripts patch. Some platforms block base64 JS code so this overrides the addition
                // of game scripts to the document
                if (config.one_page.inline_game_scripts) {
                    console.log("↪️ Adding inline game script engine patch");
                    addPatchFile('one-page-inline-game-scripts.js');
                }

                // MRAID support needs to include the mraid.js file and also force the app to use filltype NONE
                // so that it fits in the canvas that is sized by the MRAID implementation on the app. This requires
                // patching the CSS too to ensure it is placed correctly in the Window
                if (config.one_page.mraid_support) {
                    console.log("↪️ Adding mraid.js as a library");
                    indexContents = indexContents.replace(
                        '<script src="playcanvas-stable.min.js"></script>',
                        '<script src="mraid.js"></script>\n    <script src="playcanvas-stable.min.js"></script>'
                    );

                    console.log("↪️ Force fill type to be NONE in config.js");
                    var configLocation = path.resolve(projectPath, "config.json");
                    var configContents = fs.readFileSync(configLocation, 'utf-8');
                    var configJson = JSON.parse(configContents);
                    configJson.application_properties.fillMode = "NONE";
                    fs.writeFileSync(configLocation, JSON.stringify(configJson));

                    console.log("↪️ Patch CSS to fill the canvas to the body");
                    var cssLocation = path.resolve(projectPath, "styles.css");
                    var cssContents = fs.readFileSync(cssLocation, 'utf-8');
                    var cssRegex = /#application-canvas\.fill-mode-NONE[\s\S]*?}/;
                    cssContents = cssContents.replace(cssRegex, '#application-canvas.fill-mode-NONE { margin: 0; width: 100%; height: 100%; }');
                    fs.writeFileSync(cssLocation, cssContents);
                }
            })();

            // 1. Remove manifest.json and the reference in the index.html
            (function() {
                console.log("↪️ Removing manifest.json");
                var regex = / *<link rel="manifest" href="manifest\.json">\n/;
                indexContents = indexContents.replace(regex, '');
            })();

            // 2. Remove __modules__.js and the reference in the index.html assuming we aren’t using modules for playable ads.
            (function() {
                console.log("↪️ Removing __modules__.js");

                var location = path.resolve(projectPath, "__start__.js");
                var contents = fs.readFileSync(location, 'utf-8');

                var regex = /if \(PRELOAD_MODULES.length > 0\).*configure\(\);\n    }/s;

                if (config.one_page.mraid_support) {
                    // if (window.mraid) {
                    //     if (mraid.getState() !== 'ready') {
                    //         mraid.addEventListener('ready', configure);
                    //     } else {
                    //         configure();
                    //     }
                    // } else {
                    //     configure();
                    // }
                    contents = contents.replace(regex, 'window.mraid&&"ready"!==mraid.getState()?mraid.addEventListener("ready",configure):configure();');
                } else {
                    contents = contents.replace(regex, 'configure();');
                }
                fs.writeFileSync(location, contents);
            })();


            // 3. Inline the styles.css contents into index.html in style header.
            (function() {
                console.log("↪️ Inlining style.css into index.html");

                var location = path.resolve(projectPath, "styles.css");
                var contents = fs.readFileSync(location, 'utf-8');

                indexContents = indexContents.replace('<style></style>', '');

                var styleRegex = / *<link rel="stylesheet" type="text\/css" href="styles\.css">/;
                indexContents = indexContents.replace(
                    styleRegex,
                    '<style>\n'+ contents + '\n</style>');
            })();

            // 4. Open config.json and replace urls with base64 strings of the files with the correct mime type
            // 5. In config.json, remove hashes of all files that have an external URL
            await (async function() {
                console.log("↪️ Base64 encode all urls in config.json");

                var location = path.resolve(projectPath, "config.json");
                var contents = fs.readFileSync(location, 'utf-8');

                // Get the assets and Base64 all the files

                var configJson = JSON.parse(contents);
                var assets = configJson.assets;

                for (const [key, asset] of Object.entries(assets)) {
                    if (!Object.prototype.hasOwnProperty.call(assets, key)) {
                        continue;
                    }

                    // If it's not a file, we can ignore
                    if (!asset.file) {
                        continue;
                    }

                    var url = unescape(asset.file.url);
                    var urlSplit = url.split('.');
                    var extension = urlSplit[urlSplit.length - 1];

                    var filepath = path.resolve(projectPath, url);
                    if (!fs.existsSync(filepath)) {
                        console.log("   Cannot find file " + filepath + " If it's a loading screen script, please ignore");
                        continue;
                    }

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
                        case "png":
                            mimeprefix = "data:image/png";
                        break;

                        case "jpeg":
                        case "jpg":
                            mimeprefix = "data:image/jpeg";
                        break;

                        case "json":
                            // The model and animation loader assumes that the base64 URL will be loaded as a binary
                            if ((asset.type !== 'model' && asset.type !== 'animation')) {
                                mimeprefix = "data:application/json";
                            }
                        break;

                        case "css":
                        case "html":
                        case "txt":
                            mimeprefix = "data:text/plain";
                        break;

                        case "mp4":
                            mimeprefix = "data:video/mp4";
                        break;

                        case "js":
                            mimeprefix = "data:text/javascript";
                            // If it is already minified then don't try to minify it again
                            if (!url.endsWith('.min.js')) {
                                fileContents = (await minify(fileContents, { keep_fnames: true, ecma: '5' })).code;
                            }
                        break;
                    }

                    var b64;

                    if (isText) {
                        b64 = btoa(unescape(encodeURIComponent(fileContents)));
                    } else {
                        var ba = Uint8Array.from(fileContents);
                        b64 = base64js.fromByteArray(ba);
                    }

                    // As we are using an escaped URL, we will search using the original URL
                    asset.file.url = mimeprefix + ';base64,' + b64;

                    // Remove the hash to prevent appending to the URL
                    asset.file.hash = "";
                };

                fs.writeFileSync(location, JSON.stringify(configJson));
            })();

            // 6. Remove __loading__.js.
            (function() {
                console.log("↪️ Remove __loading__.js");
                var regex = / *<script src="__loading__\.js"><\/script>\n/;
                indexContents = indexContents.replace(regex, '');
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

                    contents = replaceString(contents, match[1], "data:application/json;base64," + b64);
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

                var regex;

                if (config.one_page.mraid_support) {
                    // We don't want the height/width to be controlled by the original app resolution width and height
                    // so we don't pass the height/width into resize canvas and let the canvas CSS on the HTML
                    // handle the canvas dimensions.

                    // Also remove use of marginTop as we are no longer using this
                    regex = /var reflow = function \(\) {[\s\S]*?};/
                    contents = contents.replace(regex, "var reflow=function(){canvas.style.width=\"\",canvas.style.height=\"\",app.resizeCanvas()};");
                } else {
                    regex = /app\.resizeCanvas\(canvas\.width, canvas\.height\);.*canvas\.style\.height = '';/s;
                    contents = contents.replace(regex, "canvas.style.width = '';canvas.style.height = '';app.resizeCanvas(canvas.width, canvas.height);");
                }

                fs.writeFileSync(location, contents);
            })();

            // 9. Replace references to __settings__.js, __start__.js in index.html with contents of those files.
            // 10. Replace playcanvas-stable.min.js in index.html with a base64 string of the file.
            await (async function() {
                console.log("↪️ Inline JS scripts in index.html");

                // If true, we will not embed the engine or __settings__.js file (which contains the data)
                var externFilesConfig = config.one_page.extern_files;
                var urlRegex = /<script src="(.*)"><\/script>/g;
                var urlMatches = [...indexContents.matchAll(urlRegex)];

                for (const element of urlMatches) {
                    var url = element[1];

                    if (externFilesConfig.enabled) {
                        if (EXTERN_FILES.includes(url)) {
                            continue;
                        }
                    }

                    var filepath = path.resolve(projectPath, url);
                    if (!fs.existsSync(filepath)) {
                        continue;
                    }

                    var fileContent = fs.readFileSync(filepath, 'utf-8');

                    // If it is already minified then don't try to minify it again
                    if (!url.endsWith('.min.js')) {
                        fileContent = (await minify(fileContent, { keep_fnames: true, ecma: '5' })).code;
                    }

                    indexContents = replaceString(indexContents, element[0], '<script>' + fileContent + '</script>');
                };
            })();

            fs.writeFileSync(indexLocation, indexContents);
            resolve(projectPath);
        })();
    });
}

async function packageFiles (projectPath) {
    return new Promise((resolve, reject) => {
        (async function () {
            console.log('✔️ Packaging files');
            var indexLocation = path.resolve(projectPath, "index.html");

            var externFilesConfig = config.one_page.extern_files;

            if (externFilesConfig.enabled) {
                // Make a package folder with an assets folder
                var packagePath = path.resolve(projectPath, 'package');
                var assetsPath = path.resolve(packagePath, externFilesConfig.folder_name);

                // Create the all the folders using the assets path and recursive creation
                fs.mkdirSync(assetsPath, {recursive: true});

                // Copy files to a new dir
                for (const filename of EXTERN_FILES) {
                    fs.copyFileSync(path.resolve(projectPath, filename), path.resolve(assetsPath, filename));
                }

                // Make the changes to file paths in index.html as they can be in a folder
                // or need a URL prefix for CDN purposes
                var assetFilePrefix = externFilesConfig.external_url_prefix.length > 0 ? externFilesConfig.external_url_prefix + '/' : '';
                assetFilePrefix += externFilesConfig.folder_name.length > 0 ? externFilesConfig.folder_name + '/' : '';

                var indexContents = fs.readFileSync(indexLocation, 'utf-8');

                for (const filename of EXTERN_FILES) {
                    indexContents = indexContents.replace(
                        '<script src="' + filename + '"></script>',
                        '<script src="' + assetFilePrefix + filename + '"></script>'
                    );
                }
                fs.writeFileSync(indexLocation, indexContents);
                fs.copyFileSync(indexLocation, path.resolve(packagePath, 'index.html'));

                // Zip the package folder contents
                var zipOutputPath = path.resolve(__dirname, 'temp/out/' + config.playcanvas.name + '.zip');
                await shared.zipProject(packagePath, zipOutputPath);

                resolve(zipOutputPath);
            } else {
                var indexOutputPath = path.resolve(__dirname, 'temp/out/' + config.playcanvas.name + '.html');
                if (!fs.existsSync(path.dirname(indexOutputPath))) {
                    fs.mkdirSync(path.dirname(indexOutputPath), {
                        recursive: true
                    });
                }

                fs.copyFileSync(indexLocation, indexOutputPath);

                resolve(indexOutputPath);
            }
        })()
    });
}


// Force not to concatenate scripts as they need to be inlined
config.playcanvas.scripts_concatenate = false;
shared.downloadProject(config, "temp/downloads")
    .then((zipLocation) => shared.unzipProject(zipLocation, 'contents') )
    .then(inlineAssets)
    .then(packageFiles)
    .then(outputHtml => console.log("Success", outputHtml))
    .catch(err => console.log("Error", err));
