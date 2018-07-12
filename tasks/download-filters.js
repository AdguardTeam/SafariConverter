/* global process */

import {EXTENSION_FILTERS_DIR, FILTER_REPO_URL_TEMPLATE} from './consts';
import Logs from './log';
import downloadFileSync from 'download-file-sync';
import fs from 'fs-extra';
import path from 'path';

const logs = new Logs();

/**
 * Updates filters
 */
const downloadFilters = (done) => {
    fs.ensureDirSync(EXTENSION_FILTERS_DIR);

    let filters = Array.from(Array(15).keys()).slice(1);
    let args = process.argv.slice(2);
    if (args.length > 5) {
        filters = args[5].substring(2).split(",");
    }

    let iFilters = filters.length;
    while (iFilters--) {
        let filterId = filters[iFilters];
        let downloadUrl = FILTER_REPO_URL_TEMPLATE.replace("{filterId}", filterId);

        logs.info("Downloading " + downloadUrl);
        let content = downloadFileSync(downloadUrl);

        if (!content) {
            throw "Cannot download filter " + filterId;
        }

        fs.writeFileSync(path.join(EXTENSION_FILTERS_DIR, `filter_${filterId}.txt`), content);
    }

    return done();
};

export default downloadFilters;