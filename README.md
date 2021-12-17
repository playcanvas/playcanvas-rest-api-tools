# playcanvas-rest-api-tools

This is a repo with a setup of tools to handle some of the more common needs of users with the REST API.

Currently they are:

* Downloading a build to self host
* Downloading a build and add Content Security Policy (CSP) rules
* Archiving a project for offline backup and importing a branch into a new project
* Archiving all branches in a project for backup

All downloaded files can be found in `temp/out`.

## Requirements
Install [Node JS (v12+)](https://nodejs.org/en/download/)

## Setup
1. Clone this repo
2. `mv .env.template .env` or make a of copy the `.env.template` file and rename to `.env` and add your PlayCanvas Auth Token in there
3. `mv config.template.json config.json` or make a of copy the `config.template.json` file and rename to `config.json` and add your configuration in there (Project name, branch, scenes, CSP rules, etc. The parameters for the PlayCanvas object are explained in the [User Manual](https://developer.playcanvas.com/en/user-manual/api/)).
4. `npm install`

---

## Downloading a build

This uses the [Download App REST API](https://developer.playcanvas.com/en/user-manual/api/app-download/) to download a build from your project to self host.

### Usage
1. `npm run download`

#### Example
```
$ npm run download
    ✔️ Requested build from Playcanvas
    ↪️ Polling job  99999
        job still running
        will wait 1s and then retry
    ↪️ Polling job  99999
    ✔️ Job complete!
    ✔ Downloading zip https://somefilename.zip
    Success somefilename_Download.zip
```

## Downloading a build and add CSP rules

This uses the [Download App REST API](https://developer.playcanvas.com/en/user-manual/api/app-download/) to download a build from your project to self host.

It will unzip the build, add the [CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy) rules to the `index.html` file and rezip the project.

Please configure the CSP lists in `config.json` under `csp`. There is an option to also patch the preload bundles. To do so, set `patch_preload_bundles` to be true. 

### Usage
1. `npm run csp`

#### Example
```
$ npm run csp
    ✔️ Requested build from Playcanvas
    ↪️ Polling job  99999
       job still running
      will wait 1s and then retry
    ↪️ Polling job  99999
    ✔️ Job complete!
    ✔ Downloading zip https://somefilename.zip
    ✔️ Adding CSP
    ✔️ Zipping it all back again
    ✔️... Done! somefilename_WithCSP.zip
```

## Archiving a project
This uses the [Archive Project REST API](https://developer.playcanvas.com/en/user-manual/api/project-archive/) to archive a single branch that can be imported into a new project on PlayCanvas.

### Usage
1. `npm run archive`

#### Example
```
$ npm run archive
    ✔️ Requested archive from Playcanvas
    ↪️ Polling job  99999
       job still running
       will wait 1s and then retry
    ↪️ Polling job  99999
    ✔️ Job complete!
    ✔ Downloading zip https://somefilename.zip
    Success somefilename_Download.zip
```

## Archiving all branches in a project

This uses the [Archive Project](https://developer.playcanvas.com/en/user-manual/api/project-archive/) and [List Branches](https://developer.playcanvas.com/en/user-manual/api/branch-list/) REST APIs to download all open branches in a project.

As the API is [strict limited](https://developer.playcanvas.com/en/user-manual/api/#rate-limiting), it is a slow job and may take a while to complete if you have a lot of branches.

### Usage
1. `npm run archive-all`

#### Example
```
$ npm run archive-all
    ✔️ Requested branch list from Playcanvas
    ↪️ Processing branch list from Playcanvas
    ↪️ Start archiving all 2 branches...
    ↪️ 1 of 2 branches: b1
    ✔️ Requested archive from Playcanvas
    ↪️ Polling job  99999
    job still running
    will wait 1s and then retry
    ↪️ Polling job  99999
    ✔️ Job complete!
    ✔ Downloading zip https://somefilename.zip
    ↪️ 2 of 2 branches: b10
    ✔️ Requested archive from Playcanvas
    ↪️ Polling job  99999
    job still running
    will wait 1s and then retry
    ↪️ Polling job  99999
    ✔️ Job complete!
    ✔ Downloading zip hhttps://somefilename.zip
    Success
```

## Converting a project into a single HTML file

This uses the [Download App REST API](https://developer.playcanvas.com/en/user-manual/api/app-download/) to download a build from your project to self host.

The script will then unzip the project, convert assets, scripts, etc into Base64 and embed them into the index.html with the intention to be used for some playable ads formats.

Once finished, it will copy the HTML file to the out folder.

There are some limitations:
- Modules are not supported (Basis and Ammo)
- Texture compression formats are not supported
- Asset Bundles are not supported
- ~~Spine runtime is not supported~~ Now supported since since [PR#42](https://github.com/playcanvas/playcanvas-spine/commit/77514b0bc6a5c87263d6225f10eb011096ceed2d)
- Any code relying on asset URLs being a file path will not work as they will be Base64 encoded

As Ammo is not supported for physics, alternatives are:
- cannon.js for 3D physics ([PlayCanvas integration here](https://playcanvas.com/project/793652/overview/cannon-physics-basic-integration))
- p2.js for 2D physics ([PlayCanvas integration here](https://playcanvas.com/project/446127/overview/p2js-integration))
- Using PlayCanvas [Bounding Sphere](https://developer.playcanvas.com/en/api/pc.BoundingSphere.html), [Bounding Box](https://developer.playcanvas.com/en/api/pc.BoundingBox.html), [Orientated Box](https://developer.playcanvas.com/en/api/pc.OrientedBox.html) for simple overlap checking and raycasting

### Experimental features

#### Remove XHR requests
Adds an engine patch to remove any XHR requests and decodes the base64 URLs directly. This may be required for some platforms where this is not permitted. As this is a patch, there may be edge cases where some asset types may not work. If you find any any, please report them in the issues.

The option can be found in `config.json` under `one_page`. Set `patch_xhr_out` to true.

#### Inline game scripts
Adds an engine patch to decode base64 URLS for JS scripts when the engine adds them to the page document. This may be required for some platforms that block base64 encoded JS URLs. As this is a patch, there may be edge cases where some asset types may not work. If you find any, please report them in the issues.

The option can be found in `config.json` under `one_page`. Set `inline_game_scripts` to true.

#### Extern files
Enabling this will keep the PlayCanvas engine code and game data as separate files. It will also zip up these files as the output file. This can be used for platforms that have a larger allowance for a zipped package to be used compared to a single HTML file.

The option can be found in `config.json` under `one_page`. Set `extern_files.enabled` to true. The files can also be in a separate folder using `extern_files.folder_name` (defaults to the same directory).

In some cases with ad networks, the external files will need to be hosted elsewhere such as a CDN. `extern_files.external_url_prefix` can be used to have the `index.html` reference the files to the CDN. E.g.

```
"extern_files": {
    "enabled": true,
    "folder_name": "78fb9255-3033-4fe2-b9e1-355b149229a1",
    "external_url_prefix": "https://some/random/cdn"
}
```

#### MRAID interstitial support

Adds basic support for MRAID API within the PlayCanvas engine and boilerplate code.

The option can be found in `config.json` under `one_page`. Set `mraid_support` to true.

#### Snapchat ad support

The Snapchat ad network requires the CTA function to be in the `index.html` where the network can replace it with a unique tracking version when it is served to the user. The URL will be set in the Snapchat Ad campaign tool.

The ad project should call `snapchatCta();` as the CTA function instead of `mraid.open('someurl');`.

The option can be found in `config.json` under `one_page`. Set `snapchat_cta` to true.

#### Compress engine code

Compresses the engine file to save 500KB on the final file size, leaving more room for games assets. Especially with playable ad networks only allowing 2MB for a single HTML file. 

This should only be used if you need the extra space as it adds extra initialisation time to decompress the engine code at runtime. Benchmarks below:

- Google Pixel 2XL: ~180ms
- Samsung Galaxy S7: ~180ms

The option can be found in `config.json` under `one_page`. Set `compress_engine` to true.

### Usage
1. `npm run one-page`

#### Example
```
$ npm run one-page
    ✔️ Requested build from Playcanvas
    ↪️ Polling job  710439
    job still running
    will wait 1s and then retry
    ↪️ Polling job  710439
    ✔️ Job complete!
    ✔ Downloading zip someBuild.zip
    ✔️ Unzipping  someBuild.zip
    ↪️ Removing manifest.json
    ↪️ Removing __modules__.js
    ↪️ Inlining style.css into index.html
    ↪️ Base64 encode all urls in config.json
    ↪️ Remove __loading__.js
    ↪️ Base64 encode the scene JSON and config JSON files
    ↪️ Patching __start__.js
    ↪️ Inline JS scripts in index.html
    ✔️ Finishing up
    Success someProject.html
```

#### Testing
Please use the following command to create the most common outputs for the one-page job with public projects owned by the PlayCanvas team.

1. `npm run test-one-page`


## Cordova Publish

This uses the [Download App REST API](https://developer.playcanvas.com/en/user-manual/api/app-download/) to download a build and also prepare it to be used with Cordova to create a native app.

Currently, it does the following actions:
* Adds `cordova.js` as a script header in `index.html`
* Converts all audio assets to Base64 so they can be loaded on iOS

### Usage
1. `npm run cordova-publish`

#### Example
```
$ npm run cordova-publish
    ✔️ Requested build from Playcanvas
    ↪️ Polling job  858473
       job still running
       will wait 1s and then retry
    ↪️ Polling job  858473
    ✔️ Job complete!
    ✔ Downloading zip https://somefile.zip
    ✔️ Unzipping  /somefile_Download.zip
    ↪️ Base64 encode audio assets config.json
    ✔️ Zipping it all back again
```
