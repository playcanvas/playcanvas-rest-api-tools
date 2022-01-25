import * as fs from 'fs';
import * as path from 'path';
import imagemin from 'imagemin';
import imageminWebp from 'imagemin-webp';
import { shared } from './shared.js';
import { spawn, spawnSync } from 'child_process';

const config = shared.readConfig();

var externFiles = [
];


function convertAssetsToWebP(projectPath) {
    return new Promise((resolve, reject) => {
        (async function() {
            await (async function() {
                console.log("↪️ Converting to WebP");

                var location = path.resolve(projectPath, "config.json");
                var contents = fs.readFileSync(location, 'utf-8');

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

                    var fileExists = true;

                    var filepath = path.resolve(projectPath, url);
                    if (!fs.existsSync(filepath)) {
                        console.log("   Cannot find file " + filepath + " If it's a loading screen script, please ignore");
                        fileExists = false;
                    }

                    if (extension === 'png') {
                        console.log('   ' + filepath);

                        if (fileExists) {
                            spawnSync('cwebp', ['-lossless', '-q', '100', '-alpha_q', '100', '-exact', filepath, '-o', filepath.replace('png', 'webp')]);
                            fs.unlinkSync(filepath);
                        }

                        asset.file.url = url.replace('.png', '.webp');
                        console.log('   ' + asset.file.url);
                    }

                    if (extension === 'jpeg' || extension === 'jpg') {
                        console.log('   ' + filepath);

                        if (fileExists) {
                            spawnSync('cwebp', ['-q', '80', filepath, '-o', filepath.replace('jpeg', 'webp').replace('jpg', 'webp')]);
                            fs.unlinkSync(filepath);
                        }

                        asset.file.url = url.replace('.jpeg', '.webp').replace('.jpg', '.webp');
                        console.log('   ' + asset.file.url);
                    }
                };

                fs.writeFileSync(location, JSON.stringify(configJson));
            })();
            resolve(projectPath);
        })();
    });
}


function updatePreloadBundles(rootFolder) {
    return new Promise((resolve) => {
        (async function() {
            // Check if the preload bundles exist
            const updateBundle = async function(bundleName) {
                if (fs.existsSync(bundleName)) {
                    console.log("↪️ Updating " + path.basename(bundleName));

                    const tempFolder = await shared.unzipProject(bundleName, 'bundle-temp');
                    await convertAssetsToWebP(tempFolder);
                    await shared.zipProject(tempFolder, bundleName);
                }
            }

            await updateBundle(rootFolder + '/preload-android.zip');
            await updateBundle(rootFolder + '/preload-ios.zip');

            resolve(rootFolder);
        })();
    });
}



// Force not to concatenate scripts as they need to be inlined
const zipLocation = "temp/downloads/Bitmoji Plaza_WithCSP.zip"
//const zipLocation = "temp/downloads/WebP-test.zip"
shared.unzipProject(zipLocation, 'contents')
    .then(convertAssetsToWebP)
    .then(updatePreloadBundles)
    .then((projectPath) => shared.zipProject(projectPath, 'temp/out/Bitmoji Plaza_WithCSP WebP.zip'))
    .then(outputHtml => console.log("Success", outputHtml))
    .catch(err => console.log("Error", err));
