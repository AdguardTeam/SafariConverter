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

(function (adguard, api) {

    'use strict';

    /**
     * Base class for all filter rules
     */
    const FilterRule = function (text, filterId) {
        this.ruleText = text;
        this.filterId = filterId;
    };

    FilterRule.prototype = {

        /**
         * Loads $domain option.
         * http://adguard.com/en/filterrules.html#hideRulesDomainRestrictions
         * http://adguard.com/en/filterrules.html#advanced
         *
         * @param domains List of domains. Examples: "example.com|test.com" or "example.com,test.com"
         */
        loadDomains: function (domains) {

            if (adguard.utils.strings.isEmpty(domains)) {
                return;
            }

            let permittedDomains = null;
            let restrictedDomains = null;

            let parts = domains.split(/[,|]/);
            try {
                for (let i = 0; i < parts.length; i++) {
                    const domain = parts[i];
                    let domainName;
                    if (adguard.utils.strings.startWith(domain, "~")) {
                        domainName = adguard.utils.url.toPunyCode(domain.substring(1).trim());
                        if (!adguard.utils.strings.isEmpty(domainName)) {
                            if (restrictedDomains === null) {
                                restrictedDomains = [];
                            }
                            restrictedDomains.push(domainName);
                        }
                    } else {
                        domainName = adguard.utils.url.toPunyCode(domain.trim());
                        if (!adguard.utils.strings.isEmpty(domainName)) {
                            if (permittedDomains === null) {
                                permittedDomains = [];
                            }
                            permittedDomains.push(domainName);
                        }
                    }
                }
            } catch (ex) {
                adguard.console.error("Error load domains from {0}, cause {1}", domains, ex);
            }

            this.setPermittedDomains(permittedDomains);
            this.setRestrictedDomains(restrictedDomains);
        },

        setPermittedDomains: function (permittedDomains) {
            if (!permittedDomains || permittedDomains.length === 0) {
                delete this.permittedDomain;
                delete this.permittedDomains;
                return;
            }
            if (permittedDomains.length > 1) {
                this.permittedDomains = permittedDomains;
                delete this.permittedDomain;
            } else {
                this.permittedDomain = permittedDomains[0];
                delete this.permittedDomains;
            }
        },

        setRestrictedDomains: function (restrictedDomains) {
            if (!restrictedDomains || restrictedDomains.length === 0) {
                delete this.restrictedDomain;
                delete this.restrictedDomains;
                return;
            }
            if (restrictedDomains.length > 1) {
                this.restrictedDomains = restrictedDomains;
                delete this.restrictedDomain;
            } else {
                this.restrictedDomain = restrictedDomains[0];
                delete this.restrictedDomains;
            }
        },

        /**
         * @returns boolean true if rule has permitted domains
         */
        hasPermittedDomains: function () {
            return (this.permittedDomain || (this.permittedDomains && this.permittedDomains.length > 0));
        },

        /**
         * Checks if rule could be applied to the specified domain name
         *
         * @param domainName Domain name
         * @returns boolean true if rule is permitted
         */
        isPermitted: function (domainName) {
            if (!domainName) { return false; }

            if (this.restrictedDomain && adguard.utils.url.isDomainOrSubDomain(domainName, this.restrictedDomain)) {
                return false;
            }

            if (this.restrictedDomains && adguard.utils.url.isDomainOrSubDomainOfAny(domainName, this.restrictedDomains)) {
                return false;
            }

            if (this.hasPermittedDomains()) {
                if (this.permittedDomain && adguard.utils.url.isDomainOrSubDomain(domainName, this.permittedDomain)) {
                    return true;
                }

                return adguard.utils.url.isDomainOrSubDomainOfAny(domainName, this.permittedDomains);
            }

            return true;
        }
    };

    /**
     * Checks if the specified string starts with a substr at the specified index
     *
     * @param str        String to check
     * @param startIndex Index to start checking from
     * @param substr     Substring to check
     * @return boolean true if it does start
     */
    function startsAtIndexWith(str, startIndex, substr) {

        if (str.length - startIndex < substr.length) {
            return false;
        }

        for (let i = 0; i < substr.length; i++) {
            if (str.charAt(startIndex + i) !== substr.charAt(i)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Finds CSS rule marker in the rule text
     *
     * @param ruleText        rule text to check
     * @param markers         a list of markers to check (IMPORTANT: sorted by length desc)
     * @param firstMarkerChar first character of the marker we're looking for
     * @return rule marker found
     */
    FilterRule.findRuleMarker = function (ruleText, markers, firstMarkerChar) {

        const startIndex = ruleText.indexOf(firstMarkerChar);
        if (startIndex === -1) {
            return null;
        }

        for (let i = 0; i < markers.length; i++) {
            const marker = markers[i];
            if (startsAtIndexWith(ruleText, startIndex, marker)) {
                return marker;
            }
        }

        return null;
    };

    /**
     * urlencodes rule text.
     * We need this function because of this issue:
     * https://github.com/AdguardTeam/AdguardBrowserExtension/issues/34
     */
    FilterRule.escapeRule = function (ruleText) {
        return encodeURIComponent(ruleText).replace(/'/g, "%27");
    };

    FilterRule.PARAMETER_START = "[";
    FilterRule.PARAMETER_END = "]";
    FilterRule.MASK_WHITE_LIST = "@@";
    FilterRule.MASK_CSS_RULE = "##";
    FilterRule.MASK_CSS_EXCEPTION_RULE = "#@#";
    FilterRule.MASK_CSS_INJECT_RULE = "#$#";
    FilterRule.MASK_CSS_EXCEPTION_INJECT_RULE = "#@$#";
    FilterRule.MASK_CSS_EXTENDED_CSS_RULE = "#?#";
    FilterRule.MASK_CSS_EXCEPTION_EXTENDED_CSS_RULE = "#@?#";
    FilterRule.MASK_CSS_INJECT_EXTENDED_CSS_RULE = "#$?#";
    FilterRule.MASK_CSS_EXCEPTION_INJECT_EXTENDED_CSS_RULE = "#@$?#";
    FilterRule.MASK_SCRIPT_RULE = "#%#";
    FilterRule.MASK_SCRIPT_EXCEPTION_RULE = "#@%#";
    FilterRule.MASK_JS_RULE = "%%";
    FilterRule.MASK_CONTENT_RULE = "$$";
    FilterRule.MASK_CONTENT_EXCEPTION_RULE = "$@$";
    FilterRule.MASK_BANNER_RULE = "++";
    FilterRule.MASK_CONFIGURATION_RULE = "~~";
    FilterRule.COMMENT = "!";
    FilterRule.EQUAL = "=";
    FilterRule.COMA_DELIMITER = ",";
    FilterRule.LINE_DELIMITER = "|";
    FilterRule.NOT_MARK = "~";
    FilterRule.OLD_INJECT_RULES = "adg_start_style_inject";

    api.FilterRule = FilterRule;

})(adguard, adguard.rules);
