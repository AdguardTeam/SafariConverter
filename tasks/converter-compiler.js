import gulp from 'gulp';
import fs from 'fs';
import path from 'path';
import pjson from '../package.json';
import downloadFileSync from 'download-file-sync';
import {EXTENSION_REPO_URL, BUILD_DIR, CONVERTER_BUILD_DIR, COMPILED_CONVERTER_FILE} from './consts';
import Logs from './log';

const logs = new Logs();

/**
 * Downloads source files from external repos
 */
const downloadExternalFiles = (done) => {

    const extensionFiles = [
        '/Extension/lib/adguard.js',

        '/Extension/lib/utils/punycode.js',
        '/Extension/lib/utils/common.js',
        '/Extension/lib/utils/url.js',
        '/Extension/lib/utils/log.js',

        '/Extension/lib/filter/rules/rules.js',
        '/Extension/lib/filter/rules/local-script-rules.js',
        '/Extension/lib/filter/rules/simple-regex.js',
        '/Extension/lib/filter/rules/base-filter-rule.js',
        '/Extension/lib/filter/rules/filter-rule-builder.js',
        '/Extension/lib/filter/rules/css-filter-rule.js',
        '/Extension/lib/filter/rules/script-filter-rule.js',
        '/Extension/lib/filter/rules/url-filter-rule.js',
        '/Extension/lib/filter/rules/content-filter-rule.js',

        '/Extension/browser/safari/lib/converter.js'
    ];

    extensionFiles.forEach(function(f) {
        let url = EXTENSION_REPO_URL + f;
        let content = downloadFileSync(url);
        if (!content) {
            throw "Cannot download file " + url;
        }

        fs.writeFileSync(path.join('./converter/src/main/extension', path.basename(url)), content);

        logs.info('File downloaded: ' + f);
    });

    return done();
};

/**
 * Compiles sources to one single file
 */
const compile = (done) => {
    const files = [
        './extension/adguard.js',
        './stubs/prefs.js',
        './extension/punycode.js',
        './extension/common.js',
        './extension/url.js',
        './extension/log.js',
        './extension/rules.js',
        './extension/local-script-rules.js',
        './extension/simple-regex.js',
        './stubs/browser-utils.js',
        './stubs/csp-filter.js',
        './extension/base-filter-rule.js',
        './extension/filter-rule-builder.js',
        './extension/css-filter-rule.js',
        './extension/script-filter-rule.js',
        './extension/url-filter-rule.js',
        './extension/content-filter-rule.js',
        './converter.js'
    ];

    let dependenciesContent = "";
    for (let i = 0; i < files.length; i++) {

        let fileContent = fs.readFileSync(path.join('./converter/src/main', files[i])).toString();

        // Remove the head comment
        fileContent = fileContent.replace(/^\s*\/\*\*[\s\S]*?\*\//, "").trim();

        // Prepend the file name
        let fileName = path.basename(files[i]);
        fileContent = "/** start of " + fileName + " */\n" +
            fileContent + "\n/** end of " + fileName + " */\n";

        // Append to the dependencies content
        dependenciesContent += fileContent;
    }

    let template = fs.readFileSync("./converter/src/main/JSConverter.template.js").toString();

    const dependenciesPlaceholder = "/* DEPENDENCIES_CONTENT_PLACEHOLDER */";
    const versionPlaceholder = "${version}";
    // Using this to avoid patterns messing with the result:
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_string_as_a_parameter
    let converter = template.split(dependenciesPlaceholder).join(dependenciesContent);
    converter = converter.split(versionPlaceholder).join(pjson.version);

    let dir = path.join(BUILD_DIR, CONVERTER_BUILD_DIR);
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
    fs.writeFileSync(path.join(BUILD_DIR, CONVERTER_BUILD_DIR, COMPILED_CONVERTER_FILE), converter);

    return done();
};

export default gulp.series(downloadExternalFiles, compile);