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

/* global safari */

(function () {

    console.log('Safari Content Blocker Tester');

    var result = [];

    var testRules = function (rules, onComplete) {
        var convertationResult = SafariContentBlockerConverter.convertArray(rules);
        //console.log('Converted: content blocker length=' + convertationResult.convertedCount);

        //console.log('Setting content blocker..');

        function setContentBlocker(json, callback) {
            safari.extension.setContentBlocker(
                // There is a strange bug in setContentBlocker for Safari 9 where if both
                // the callback parameter is provided and the rules aren't converted to a
                // JSON string it fails. Worse still it actually performs the callback twice
                // too, firstly with an empty string and then with an Error:
                //   "Extension compilation failed: Failed to parse the JSON String."
                // To mitigate this we convert the rules to JSON here and also ignore
                // callback values of "". (Usually the callback is performed with either
                // null for success or an Error on failure.)
                // Bug #26322821 filed on bugreport.apple.com
                json,
                function (error) {
                    if (error == "") {
                        return;
                    }

                    callback(error);
                }
            );
        }

        setContentBlocker(convertationResult.converted, function(error) {
            if (error == null) {
                //Has been set successfully
                onComplete(true, rules);
                return;
            }

            //An error occurred
            //console.error('Error:' + error);
            onComplete(false, rules, error);
        });
    };

    var complete = function (setupSuccess, rules, error) {
        //console.error(rules.length);

        if (!setupSuccess) {
            if (rules.length > 1) {
                var half = Math.floor(rules.length / 2);
                //console.error(rules.length + ' ' + half);
                var listOne = rules.slice(0, half);
                var listTwo = rules.slice(half);

                testRules(listOne, complete);
                testRules(listTwo, complete);

                return;
            } else {
                if (!(error && error.message.indexOf('Extension compilation failed: Empty extension.') >= 0)) {
                    //Wrong rule found
                    result.push(rules[0]);
                    result.push(error);
                }
            }
        }

        doneCount += rules.length;

        if (doneCount == rulesCount) {
            console.warn('Test finished, rules tested:' + rulesCount);
            if (result.length == 0) {
                console.warn('All rules are ok!');
            }

            for (var i = 0; i < result.length; i++) {
                console.warn(result[i]);
            }

            //console.warn(result);
        }
    };

    var files = [];
    files.push('test_filter.txt');

    var i = 1;
    while (i <= 12) {
        files.push('filter_' + i + '.txt');
        i++;
    }

    var rules = [];

    for (var i = 0; i < files.length; i++) {
        FileStorage.readFromFile('filters/' + files[i], function (error, lines) {
            if (error) {
                console.error(error);
                return;
            }

            rules = rules.concat(lines);
        });
    }

    var doneCount = 0;
    var rulesCount = rules.length;
    testRules(rules, complete);

})();