import * as fs from 'fs';
import * as path from 'path';
import imagemin from 'imagemin';
import imageminWebp from 'imagemin-webp';
import { shared } from './shared.js';

const config = shared.readConfig();

var externFiles = [
];

function inlineAssets(projectPath) {
    return new Promise((resolve, reject) => {
        (async function() {
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

                    if (extension === 'png') {
                        console.log(filepath);
                        await imagemin([filepath], {
                            destination: path.dirname(filepath),
                            plugins: [
                                imageminWebp(
                                    {
                                        lossless: true
                                    }
                                )
                            ]
                        });

                        fs.unlinkSync(filepath);

                        asset.file.url = url.replace('.png', '.webp');
                    }

                    if (extension === 'jpeg' || extension === 'jpg') {

                    }

                    // var fileContents;

                    // var mimeprefix = "data:application/octet-stream";
                    // switch(extension) {
                    //     case "png":
                    //         mimeprefix = "data:image/png";
                    //     break;

                    //     case "jpeg":
                    //     case "jpg":
                    //         mimeprefix = "data:image/jpeg";
                    //     break;
                    // }

                    // var b64;

                    // if (isText) {
                    //     b64 = btoa(unescape(encodeURIComponent(fileContents)));
                    // } else {
                    //     var ba = Uint8Array.from(fileContents);
                    //     b64 = base64js.fromByteArray(ba);
                    // }

                    // // As we are using an escaped URL, we will search using the original URL
                    // asset.file.url = mimeprefix + ';base64,' + b64;

                    // Remove the hash to prevent appending to the URL
                    asset.file.hash = "";
                };

                fs.writeFileSync(location, JSON.stringify(configJson));
            })();
            resolve(projectPath);
        })();
    });
}

// Force not to concatenate scripts as they need to be inlined
const zipLocation = "temp/downloads/ZRS-no-compression.zip"
shared.unzipProject(zipLocation, 'contents')
    .then(inlineAssets)
    .then((projectPath) => shared.zipProject(projectPath, 'temp/out/webp.zip'))
    .then(outputHtml => console.log("Success", outputHtml))
    .catch(err => console.log("Error", err));
