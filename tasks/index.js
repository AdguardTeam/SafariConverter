import gulp from 'gulp';
import clean from './clean-build-dir';
import compileConverter from './converter-compiler';
import compileExtension from './extension-compiler';
import convertFilters from './convertation-runner';
import tests from './tests';

// builds converter code
export const buildConverter = gulp.series(clean, compileConverter, (done) => done());

// runs tests
export const runTests = gulp.series(tests, (done) => done());

// TODO: Add some tests for result compiled file JSConverter.js

// convert some filters
export const runConvertation = gulp.series(clean, compileConverter, convertFilters, (done) => done());

// builds testing extension
export const buildExtension = gulp.series(clean, compileConverter, compileExtension, (done) => done());