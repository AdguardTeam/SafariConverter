import gulp from 'gulp';
import fs from 'fs';
import path from 'path';
import pjson from '../package.json';
import {BUILD_DIR, CONVERTER_BUILD_DIR, COMPILED_CONVERTER_FILE} from './consts';

/**
 * Compiles sources to one single file
 */
const compile = (done) => {
    const files = [
        './adguard.js',
        './utils/punycode.js',
        './utils/common.js',
        './utils/url.js',
        './utils/log.js',
        './utils/tld-list.js',
        './utils/simple-regex.js',
        './rules/base-filter-rule.js',
        './rules/rule-converter.js',
        './rules/filter-rule-builder.js',
        './rules/css-filter-rule.js',
        './rules/url-filter-rule.js',
        './rules/script-filter-rule.js',
        './rules/scriptlet-rule.js',
        './rules/composite-rule.js',
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

export default gulp.series(compile);