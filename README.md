# playcanvas-csp-replacer
Downloads a Playcanvas project, unzips it, adds [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy) rules to it and re-packages it into a .zip file that can be uploaded to be served over HTTP.
CSP rules are defined in `config.json` and the Playcanvas Auth token is defined in `.env`

## Requirements
Install [Node JS (v12+)](https://nodejs.org/en/download/) and [npm](https://www.npmjs.com/get-npm)

## Setup
1. Clone this repo
2. `mv .env.template .env` and add your Playcanvas Auth Token in there
3. `mv config.template.json config.json` and add your configuration in there (Project name, branch, scenes, CSP rules, etc. The parameters for the PlayCanvas object are explained in the [User Manual](https://developer.playcanvas.com/en/user-manual/api/app-download/)).
4. `npm install`

## Usage
1. `node index`

### Example
```
$ node index
    ✔️ Requested build from Playcanvas
    ↪️ Polling build job
    build job still running
    will wait 1s and then retry
    ↪️ Polling build job
    ✔️build job complete!
    ✔ Downloading zip
    ✔️ Unzipping
    ✔️ Adding CSP
    ✔️ Zipping it all back again
    ✔️... Done!
```