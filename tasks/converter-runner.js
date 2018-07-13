/* global process */

import {jsonFromFilters} from '../build/converter/JSConverter.js';
import gulp from 'gulp';
import downloadFilters from './download-filters';
import {EXTENSION_FILTERS_DIR, BUILD_DIR, CONVERTED_JSON_FILE, MAX_ADGUARD_FILTER_ID} from './consts';
import fs from 'fs-extra';
import Logs from './log';
import path from 'path';

const logs = new Logs();

/**
 * Converts downloaded filters
 */
const convertFilters = (done) => {
    let filters = Array.from(Array(MAX_ADGUARD_FILTER_ID + 1).keys()).slice(1);

    let args = process.argv.slice(2);
    if (args.length > 5) {
        filters = args[5].substring(2).split(",");
    }

    let uniqueCheck = {};
    let rules = [];
    let iFilters = filters.length;
    while (iFilters--) {
        let filterId = filters[iFilters];
        let filterPath = path.join(EXTENSION_FILTERS_DIR, `filter_${filterId}.txt`);

        let content = fs.readFileSync(filterPath).toString();
        if (!content) {
            throw "Cannot read filter " + filterPath;
        }

        let lines = content.split("\n");
        let iLines = lines.length;
        while (iLines--) {
            let line = lines[iLines].trim();
            if (!uniqueCheck[line]) {
                rules.push(line);
                uniqueCheck[line] = true;
            }
        }
    }

    // Do the actual conversion
    let result = jsonFromFilters(rules, 50000, false);

    logs.info("Total converted count: " + result.totalConvertedCount);
    logs.info("Converted count: " + result.convertedCount);
    logs.info("Errors count: " + result.errorsCount);
    logs.info("Overlimit: " + result.overLimit);

    // Beautify the blocklist
    let contentBlocker = JSON.parse(result.converted);
    let output = path.join(BUILD_DIR, CONVERTED_JSON_FILE);
    fs.writeFileSync(output, JSON.stringify(contentBlocker, null, 4));

    logs.info("Content blocker was saved to " + output);

    return done();
};

export default gulp.series(downloadFilters, convertFilters);