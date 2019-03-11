/**
 * AdGuard -> Safari Content Blocker converter
 * Version ${version}
 * License: https://github.com/AdguardTeam/SafariContentBlockerConverterCompiler/blob/master/LICENSE
 */

/**
* The main conversion function that is called from the iOS app
* 
* @param {} rules Rules to convert
* @param {*} limit Max number of rules
* @param {*} optimize True if we should apply additional optimization
* @param {*} advancedBlocking True if we need advanced blocking json
*/
var jsonFromFilters = (function () {

    /**
     * Define window dummy object
     */
    if (typeof window === 'undefined') {
        var window = Object.create(null);
    }

/**
 * Start of the dependencies content 
 */
/* DEPENDENCIES_CONTENT_PLACEHOLDER */
/**
 * End of the dependencies content 
 */

    return function (rules, limit, optimize, advancedBlocking) {
        try {
            return SafariContentBlockerConverter.convertArray(rules, limit, optimize, advancedBlocking);
        } catch (ex) {
            console.log('Unexpected error: ' + ex);
        }
    };
})();

// expose to node
if (module && module.exports) {
    module.exports.jsonFromFilters = jsonFromFilters;
}