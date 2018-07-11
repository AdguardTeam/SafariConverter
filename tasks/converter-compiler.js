import gulp from 'gulp';
import fs from 'fs';
import path from 'path';
import pjson from '../package.json';

/**
 * Downloads source files from external repos
 */
const downloadExternalFiles = (done) => {
    //TODO: Implement

    /*

     https://raw.githubusercontent.com/AdguardTeam/AdguardBrowserExtension/master/Extension/lib/adguard.js

     https://raw.githubusercontent.com/AdguardTeam/AdguardBrowserExtension/master/Extension/lib/utils/punycode.js
     https://raw.githubusercontent.com/AdguardTeam/AdguardBrowserExtension/master/Extension/lib/utils/common.js
     https://raw.githubusercontent.com/AdguardTeam/AdguardBrowserExtension/master/Extension/lib/utils/url.js
     https://raw.githubusercontent.com/AdguardTeam/AdguardBrowserExtension/master/Extension/lib/utils/log.js

     https://raw.githubusercontent.com/AdguardTeam/AdguardBrowserExtension/master/Extension/lib/filter/rules/rules.js
     https://raw.githubusercontent.com/AdguardTeam/AdguardBrowserExtension/master/Extension/lib/filter/rules/local-script-rules.js
     https://raw.githubusercontent.com/AdguardTeam/AdguardBrowserExtension/master/Extension/lib/filter/rules/simple-regex.js
     https://raw.githubusercontent.com/AdguardTeam/AdguardBrowserExtension/master/Extension/lib/filter/rules/base-filter-rule.js
     https://raw.githubusercontent.com/AdguardTeam/AdguardBrowserExtension/master/Extension/lib/filter/rules/filter-rule-builder.js
     https://raw.githubusercontent.com/AdguardTeam/AdguardBrowserExtension/master/Extension/lib/filter/rules/css-filter-rule.js
     https://raw.githubusercontent.com/AdguardTeam/AdguardBrowserExtension/master/Extension/lib/filter/rules/script-filter-rule.js
     https://raw.githubusercontent.com/AdguardTeam/AdguardBrowserExtension/master/Extension/lib/filter/rules/url-filter-rule.js

     https://raw.githubusercontent.com/AdguardTeam/AdguardBrowserExtension/master/Extension/browser/safari/lib/converter.js

     */

    return done();
};

/**
 * Compiles sources to one single file
 */
const compile = (done) => {
    //TODO: Fix paths

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
        './converter.js'
    ];

    let dependenciesContent = "";
    for (let i = 0; i < files.length; i++) {

        let fileContent = fs.readFileSync(files[i]).toString();

        // Remove the head comment
        fileContent = fileContent.replace(/^\s*\/\*\*[\s\S]*?\*\//, "").trim();

        // Prepend the file name
        let fileName = path.basename(files[i]);
        fileContent = "/** start of " + fileName + " */\n" +
            fileContent + "\n/** end of " + fileName + " */\n";

        // Append to the dependencies content
        dependenciesContent += fileContent;
    }

    let template = fs.readFileSync("JSConverter.template.js").toString();

    const dependenciesPlaceholder = "/* DEPENDENCIES_CONTENT_PLACEHOLDER */";
    const versionPlaceholder = "${version}";
    // Using this to avoid patterns messing with the result:
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_string_as_a_parameter
    let converter = template.split(dependenciesPlaceholder).join(dependenciesContent);
    converter = converter.split(versionPlaceholder).join(pjson.version);

    fs.writeFileSync("./compiled/JSConverter.js", converter);

    return done();
};

export default gulp.series(downloadExternalFiles, compile);