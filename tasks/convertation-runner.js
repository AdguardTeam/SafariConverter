import gulp from 'gulp';
import downloadFilters from './download-filters';

/**
 * Converts downloaded filters
 */
const convertFilters = (done) => {
    //TODO: Implement
    return done();
};

export default gulp.series(downloadFilters, convertFilters);