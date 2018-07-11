import gulp from 'gulp';
import qunit from 'node-qunit-phantomjs';

// qunit error handler: to fail gulp execution on tests failure
const errorHandler = (done) => (code) => {
    if(code === 1) {
        throw new Error('Unit Tests Failure');
    }
    return done();
};

const runQunit = (path, done) => {
    return qunit(path, null, errorHandler(done));
};

// Safari converter tests
const testConverter = (done) => {
    runQunit('converter/src/test/test-safari-converter.html', done);
};

export default gulp.series(testConverter, (done) => done());
