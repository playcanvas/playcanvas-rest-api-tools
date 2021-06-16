const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const { performance } = require('perf_hooks');

const configsFolder = 'tests/configs-one-page';


function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

// Go through all the public test configs to create the most common
// outputs for the one-page job
(async function() {
    const files = fs.readdirSync(configsFolder);
    const maxJobsPerMinute = 5;
    const msInAMinute = 60 * 1000;

    let msTakenSoFar = 0;

    for (let i = 0; i < files.length; ++i) {
        let timeStart = performance.now();
        let file = files[i];

        // Skip hidden files
        if (file.startsWith('.')) {
            continue;
        }

        let fromPath = path.join(configsFolder, file);
        let toPath = path.join('', 'config.json');

        console.log('Using config \'' + file + '\'');

        fs.copyFileSync(fromPath, toPath);
        let output = childProcess.execSync('npm run one-page', {encoding: 'utf-8'});

        console.log(output);

        let timeEnd = performance.now();
        msTakenSoFar += (timeEnd - timeStart);

        // If we are not the last file, make sure to add some time between batches of REST API
        // calls so that we don't hit the strict rate limit
        if (i !== (files.length - 1)) {
            if (i % maxJobsPerMinute === (maxJobsPerMinute - 1)) {
                if (msTakenSoFar <= msInAMinute) {
                    let msTillRateLimitEnds = msInAMinute - msTakenSoFar;
                    console.log('Waiting till rate limit has passed (' + (msTillRateLimitEnds / 1000).toFixed(2) + 's)');
                    await sleep(msInAMinute - msTakenSoFar);
                }
                msTakenSoFar = 0;
            }
        }
    }
})();
