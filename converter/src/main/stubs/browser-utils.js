/**
 * Browser utils stub
 */
(function (adguard, api) {
    var Utils = {
        isFirefoxBrowser: function () {
            return false;
        },
        isContentBlockerEnabled: function () {
            return true;
        }
    };

    api.browser = Utils;

})(adguard, adguard.utils);