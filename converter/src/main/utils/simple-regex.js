/**
 * This file is part of Adguard Browser Extension (https://github.com/AdguardTeam/AdguardBrowserExtension).
 *
 * Adguard Browser Extension is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Adguard Browser Extension is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Adguard Browser Extension.  If not, see <http://www.gnu.org/licenses/>.
 */
(function (api) {

    'use strict';

    /**
     * Helper class for creating regular expression from a simple wildcard-syntax used in basic filters
     */
    api.SimpleRegex = (function () {

        /**
         * Improved regular expression instead of UrlFilterRule.REGEXP_START_URL (||)
         * Please note, that this regular expression matches only ONE level of subdomains
         * Using ([a-z0-9-.]+\\.)? instead increases memory usage by 10Mb
         */
        const URL_FILTER_REGEXP_START_URL = "^[htpsw]+:\\/\\/([a-z0-9-]+\\.)?";
        /** Simplified separator (to fix an issue with $ restriction - it can be only in the end of regexp) */
        const URL_FILTER_REGEXP_SEPARATOR = "[/:&?]?";

        // Constants
        const regexConfiguration = {
            maskStartUrl: "||",
            maskPipe: "|",
            maskSeparator: "^",
            maskAnySymbol: "*",

            regexAnySymbol: ".*",
            regexSeparator: URL_FILTER_REGEXP_SEPARATOR,
            regexStartUrl: URL_FILTER_REGEXP_START_URL,
            regexStartString: "^",
            regexEndString: "$"
        };

        // https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/regexp
        // should be escaped . * + ? ^ $ { } ( ) | [ ] / \
        // except of * | ^
        const specials = [
            '.', '+', '?', '$', '{', '}', '(', ')', '[', ']', '\\', '/'
        ];
        const specialsRegex = new RegExp('[' + specials.join('\\') + ']', 'g');

        /**
         * Escapes regular expression string
         */
        const escapeRegExp = str => str.replace(specialsRegex, "\\$&");

        /**
         * Checks if string "str" starts with the specified "prefix"
         */
        const startsWith = (str, prefix) => str && str.indexOf(prefix) === 0;

        /**
         * Checks if string "str" ends with the specified "postfix"
         */
        const endsWith = (str, postfix) => {
            if (!str || !postfix) {
                return false;
            }

            if (str.endsWith) {
                return str.endsWith(postfix);
            }
            const t = String(postfix);
            const index = str.lastIndexOf(t);
            return index >= 0 && index === str.length - t.length;
        };

        /**
         * Replaces all occurencies of a string "find" with "replace" str;
         */
        const replaceAll = (str, find, replace) => {
            if (!str) {
                return str;
            }
            return str.split(find).join(replace);
        };


        /**
         * Creates regex
         */
        const createRegexText = str => {
            if (str === regexConfiguration.maskStartUrl ||
                str === regexConfiguration.maskPipe ||
                str === regexConfiguration.maskAnySymbol) {
                return regexConfiguration.regexAnySymbol;
            }

            let regex = escapeRegExp(str);

            if (startsWith(regex, regexConfiguration.maskStartUrl)) {
                regex = regex.substring(0, regexConfiguration.maskStartUrl.length) +
                    replaceAll(regex.substring(regexConfiguration.maskStartUrl.length, regex.length - 1), "\|", "\\|") +
                    regex.substring(regex.length - 1);
            } else if (startsWith(regex, regexConfiguration.maskPipe)) {
                regex = regex.substring(0, regexConfiguration.maskPipe.length) +
                    replaceAll(regex.substring(regexConfiguration.maskPipe.length, regex.length - 1), "\|", "\\|") +
                    regex.substring(regex.length - 1);
            } else {
                regex = replaceAll(regex.substring(0, regex.length - 1), "\|", "\\|") +
                    regex.substring(regex.length - 1);
            }

            // Replacing special url masks
            regex = replaceAll(regex, regexConfiguration.maskAnySymbol, regexConfiguration.regexAnySymbol);
            regex = replaceAll(regex, regexConfiguration.maskSeparator, regexConfiguration.regexSeparator);

            if (startsWith(regex, regexConfiguration.maskStartUrl)) {
                regex = regexConfiguration.regexStartUrl + regex.substring(regexConfiguration.maskStartUrl.length);
            } else if (startsWith(regex, regexConfiguration.maskPipe)) {
                regex = regexConfiguration.regexStartString + regex.substring(regexConfiguration.maskPipe.length);
            }
            if (endsWith(regex, regexConfiguration.maskPipe)) {
                regex = regex.substring(0, regex.length - 1) + regexConfiguration.regexEndString;
            }

            return regex;
        };

        // EXPOSE
        return {
            // Function for creating regex
            createRegexText: createRegexText,

            // Configuration used for the transformation
            regexConfiguration: regexConfiguration
        };
    })();

})(adguard.rules);
