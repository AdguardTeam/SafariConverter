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

/**
 * Utilities namespace
 */
adguard.utils = (function () {

    return {
        strings: null,
        collections: null,
        StopWatch: null
    };

})();

/**
 * Util class for work with strings
 */
(function (api) {

    if (!String.prototype.endsWith) {
        String.prototype.endsWith = function (suffix) { // jshint ignore:line
            const index = this.lastIndexOf(suffix);
            return index !== -1 && index === this.length - suffix.length;
        };
    }

    //noinspection UnnecessaryLocalVariableJS
    const StringUtils = {

        isEmpty: function (str) {
            return !str || str.trim().length === 0;
        },

        startWith: function (str, prefix) {
            return str && str.indexOf(prefix) === 0;
        },

        endsWith: function (str, postfix) {
            return str.endsWith(postfix);
        },

        substringAfter: function (str, separator) {
            if (!str) {
                return str;
            }
            const index = str.indexOf(separator);
            return index < 0 ? "" : str.substring(index + separator.length);
        },

        substringBefore: function (str, separator) {
            if (!str || !separator) {
                return str;
            }
            const index = str.indexOf(separator);
            return index < 0 ? str : str.substring(0, index);
        },

        contains: function (str, searchString) {
            return str && str.indexOf(searchString) >= 0;
        },

        containsIgnoreCase: function (str, searchString) {
            return str && searchString && str.toUpperCase().indexOf(searchString.toUpperCase()) >= 0;
        },

        replaceAll: function (str, find, replace) {
            if (!str) {
                return str;
            }
            return str.split(find).join(replace);
        },

        join: function (array, separator, startIndex, endIndex) {
            if (!array) {
                return null;
            }
            if (!startIndex) {
                startIndex = 0;
            }
            if (!endIndex) {
                endIndex = array.length;
            }
            if (startIndex >= endIndex) {
                return "";
            }
            const buf = [];
            for (let i = startIndex; i < endIndex; i++) {
                buf.push(array[i]);
            }
            return buf.join(separator);
        },

        /**
         * Look for any symbol from "chars" array starting at "start" index or from the start of the string
         *
         * @param str   String to search
         * @param chars Chars to search for
         * @param start Start index (optional, inclusive)
         * @return int Index of the element found or null
         */
        indexOfAny: function (str, chars, start) {

            start = start || 0;

            if (typeof str === 'string' && str.length <= start) {
                return -1;
            }

            for (let i = start; i < str.length; i++) {
                const c = str.charAt(i);
                if (chars.indexOf(c) > -1) {
                    return i;
                }
            }

            return -1;
        },

        /**
         * Splits string by a delimiter, ignoring escaped delimiters
         * @param str               String to split
         * @param delimiter         Delimiter
         * @param escapeCharacter   Escape character
         * @param preserveAllTokens If true - preserve empty entries.
         */
        splitByDelimiterWithEscapeCharacter: function (str, delimiter, escapeCharacter, preserveAllTokens) {

            const parts = [];

            if (adguard.utils.strings.isEmpty(str)) {
                return parts;
            }

            let sb = [];
            for (let i = 0; i < str.length; i++) {

                const c = str.charAt(i);

                if (c === delimiter) {
                    if (i === 0) { // jshint ignore:line
                        // Ignore
                    } else if (str.charAt(i - 1) === escapeCharacter) {
                        sb.splice(sb.length - 1, 1);
                        sb.push(c);
                    } else {
                        if (preserveAllTokens || sb.length > 0) {
                            const part = sb.join('');
                            parts.push(part);
                            sb = [];
                        }
                    }
                } else {
                    sb.push(c);
                }
            }

            if (preserveAllTokens || sb.length > 0) {
                parts.push(sb.join(''));
            }

            return parts;
        }
    };

    api.strings = StringUtils;

})(adguard.utils);

/**
 * Util class for work with collections
 */
(function (api) {

    //noinspection UnnecessaryLocalVariableJS
    const CollectionUtils = {

        /**
         * Find element in array by property
         * @param array
         * @param property
         * @param value
         * @returns {*}
         */
        find: function (array, property, value) {
            if (typeof array.find === 'function') {
                return array.find(function (a) {
                    return a[property] === value;
                });
            }
            for (let i = 0; i < array.length; i++) {
                const elem = array[i];
                if (elem[property] === value) {
                    return elem;
                }
            }
            return null;
        },

        /**
         * Checks if specified object is array
         * We don't use instanceof because it is too slow: http://jsperf.com/instanceof-performance/2
         * @param obj Object
         */
        isArray: Array.isArray || function (obj) {
            return '' + obj === '[object Array]';
        }
    };

    api.collections = CollectionUtils;

})(adguard.utils);

/**
 * Simple time measurement utils
 */
(function (api) {

    const StopWatch = function (name) {
        this.name = name;
    };

    StopWatch.prototype = {

        start: function () {
            this.startTime = Date.now();
        },

        stop: function () {
            this.stopTime = Date.now();
        },

        print: function () {
            const elapsed = this.stopTime - this.startTime;
            console.log(this.name + "[elapsed: " + elapsed + " ms]");
        }
    };

    api.StopWatch = StopWatch;

})(adguard.utils);