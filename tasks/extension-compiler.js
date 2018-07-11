import gulp from 'gulp';
import downloadFilters from 'download-filters';

/**
 * Copies files to build dir
 */
const copyFiles = (done) => {
    //TODO: Implement
    return done();
};

/**
 * Copies filters to build dir
 */
const copyFilters = (done) => {
    //TODO: Implement
    return done();
};

export default gulp.series(copyFiles, downloadFilters, copyFilters);