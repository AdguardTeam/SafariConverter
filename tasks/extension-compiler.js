import gulp from 'gulp';
import fs from 'fs-extra';
import path from 'path';
import downloadFilters from './download-filters';
import {BUILD_DIR, CONVERTER_BUILD_DIR, COMPILED_CONVERTER_FILE,
    EXTENSION_BUILD_DIR, COMPILED_EXTENSION_DIR} from './consts';

/**
 * Copies files to build dir
 */
const copyFiles = (done) => {
    const converterFile = path.join(BUILD_DIR, CONVERTER_BUILD_DIR, COMPILED_CONVERTER_FILE);
    const extensionSourceDir = path.join('./extension/src/main');
    const filtersDir = path.join('./filters');
    
    const resultDir = path.join(BUILD_DIR, EXTENSION_BUILD_DIR, COMPILED_EXTENSION_DIR);
    fs.ensureDirSync(resultDir);

    fs.copySync(extensionSourceDir, resultDir);
    fs.copySync(converterFile, path.join(resultDir, 'JSConverter.js'));
    fs.copySync(filtersDir, path.join(resultDir, 'filters'));

    return done();
};

export default gulp.series(downloadFilters, copyFiles);