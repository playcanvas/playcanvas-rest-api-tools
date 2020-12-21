# playcanvas-rest-api-tools

This is a repo with a setup of tools to handle some of the more common needs of users with the REST API.

Currently they are:

* Downloading a build to self host
* Downloading a build and add Content Security Policy (CSP) rules
* Archiving a project for offline backup and importing a branch into a new project
* Archiving all branches in a project for backup

All downloaded files can be found in `temp/out`.

## Requirements
Install [Node JS (v12+)](https://nodejs.org/en/download/) and [npm](https://www.npmjs.com/get-npm)

## Setup
1. Clone this repo
2. `mv .env.template .env` and add your PlayCanvas Auth Token in there
3. `mv config.template.json config.json` and add your configuration in there (Project name, branch, scenes, CSP rules, etc. The parameters for the PlayCanvas object are explained in the [User Manual](https://developer.playcanvas.com/en/user-manual/api/)).
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
This uses the [Archive Project REST API](https://developer.playcanvas.com/en/user-manual/api/project-archive/) to archive a single branch that cna be imported into a new project on PlayCanvas.

### Usage
1. `npm run archive`

#### Example
```
$ npm run arhive
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