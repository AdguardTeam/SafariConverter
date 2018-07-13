import gulp from 'gulp';
import clean from './clean-build-dir';
import compileConverter from './converter-compiler';
import compileExtension from './extension-compiler';
import convertFilters from './converter-runner';
import tests from './tests';

// builds converter code
export const buildConverter = gulp.series(clean, compileConverter, (done) => done());

// runs tests
export const runTests = gulp.series(tests, (done) => done());

// convert some filters
export const runConvertation = gulp.series(convertFilters, (done) => done());

// builds testing extension
export const buildExtension = gulp.series(clean, compileConverter, compileExtension, (done) => done());