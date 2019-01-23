import gulp from 'gulp';
import path from 'path';
import { runQunitPuppeteer, printOutput } from 'node-qunit-puppeteer';

const runQunit = (testFilePath, done) => {
    const qunitArgs = {
        targetUrl: `file://${path.resolve(__dirname, testFilePath)}`,
        timeout: 10000,
        redirectConsole: true,
    };

    runQunitPuppeteer(qunitArgs)
        .then((result) => {
            printOutput(result, console);
            if (result.stats.failed > 0) {
                done('Some of the unit tests failed');
            }
        })
        .then(done)
        .catch((ex) => {
            done(`Error occured while running tests: ${ex}`);
        });
};

// Safari converter tests
const testConverter = (done) => {
    runQunit('../converter/src/test/test-safari-converter.html', done);
};

export default gulp.series(testConverter, (done) => done());
