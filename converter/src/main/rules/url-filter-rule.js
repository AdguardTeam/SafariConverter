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

    const ESCAPE_CHARACTER = '\\';

    /**
     * Searches for domain name in rule text and transforms it to punycode if needed.
     *
     * @param ruleText Rule text
     * @returns {string} Transformed rule text
     */
    function getAsciiDomainRule(ruleText) {
        try {
            if (/^[\x00-\x7F]+$/.test(ruleText)) {
                return ruleText;
            }

            let domain = parseRuleDomain(ruleText, true);
            if (!domain) {
                return "";
            }

            //In case of one domain
            return adguard.utils.strings.replaceAll(ruleText, domain, adguard.utils.url.toPunyCode(domain));
        } catch (ex) {
            adguard.console.error("Error getAsciiDomainRule from {0}, cause {1}", ruleText, ex);
            return "";
        }
    }

    /**
     * Searches for domain name in rule text.
     *
     * @param ruleText Rule text
     * @param parseOptions Flag to parse rule options
     * @returns {?string} domain name
     */
    function parseRuleDomain(ruleText, parseOptions) {
        try {
            let i;
            const startsWith = ["http://www.", "https://www.", "http://", "https://", "||", "//"];
            const contains = ["/", "^"];
            let startIndex = parseOptions ? -1 : 0;

            for (i = 0; i < startsWith.length; i++) {
                const start = startsWith[i];
                if (adguard.utils.strings.startWith(ruleText, start)) {
                    startIndex = start.length;
                    break;
                }
            }

            if (parseOptions) {
                //exclusive for domain
                const exceptRule = "domain=";
                const domainIndex = ruleText.indexOf(exceptRule);
                if (domainIndex > -1 && ruleText.indexOf("$") > -1) {
                    startIndex = domainIndex + exceptRule.length;
                }

                if (startIndex === -1) {
                    //Domain is not found in rule options, so we continue a normal way
                    startIndex = 0;
                }
            }

            let symbolIndex = -1;
            for (i = 0; i < contains.length; i++) {
                const contain = contains[i];
                const index = ruleText.indexOf(contain, startIndex);
                if (index >= 0) {
                    symbolIndex = index;
                    break;
                }
            }

            return symbolIndex === -1 ? ruleText.substring(startIndex) : ruleText.substring(startIndex, symbolIndex);
        } catch (ex) {
            adguard.console.error("Error parsing domain from {0}, cause {1}", ruleText, ex);
            return null;
        }
    }

    /**
     * Parse rule text
     * @param ruleText
     * @returns {{urlRuleText: *, options: *, whiteListRule: *}}
     * @private
     */
    function parseRuleText(ruleText) {

        let urlRuleText = ruleText;
        let whiteListRule = null;
        let options = null;

        let startIndex = 0;

        if (adguard.utils.strings.startWith(urlRuleText, api.FilterRule.MASK_WHITE_LIST)) {
            startIndex = api.FilterRule.MASK_WHITE_LIST.length;
            urlRuleText = urlRuleText.substring(startIndex);
            whiteListRule = true;
        }

        let parseOptions = true;
        /**
         * https://github.com/AdguardTeam/AdguardBrowserExtension/issues/517
         * regexp rule may contain dollar sign which also is options delimiter
         */
        // Added check for replacement rule, because maybe problem with rules for example /.*/$replace=/hello/bug/

        if (adguard.utils.strings.startWith(urlRuleText, api.UrlFilterRule.MASK_REGEX_RULE) &&
            adguard.utils.strings.endsWith(urlRuleText, api.UrlFilterRule.MASK_REGEX_RULE) &&
            !adguard.utils.strings.contains(urlRuleText, api.UrlFilterRule.REPLACE_OPTION + '=')) {

            parseOptions = false;
        }

        if (parseOptions) {
            let foundEscaped = false;
            // Start looking from the prev to the last symbol
            // If dollar sign is the last symbol - we simply ignore it.
            for (let i = (ruleText.length - 2); i >= startIndex; i--) {
                const c = ruleText.charAt(i);
                if (c === UrlFilterRule.OPTIONS_DELIMITER) {
                    if (i > 0 && ruleText.charAt(i - 1) === ESCAPE_CHARACTER) {
                        foundEscaped = true;
                    } else {
                        urlRuleText = ruleText.substring(startIndex, i);
                        options = ruleText.substring(i + 1);

                        if (foundEscaped) {
                            // Find and replace escaped options delimiter
                            options = options.replace(ESCAPE_CHARACTER + UrlFilterRule.OPTIONS_DELIMITER, UrlFilterRule.OPTIONS_DELIMITER);
                        }

                        // Options delimiter was found, doing nothing
                        break;
                    }
                }
            }
        }

        // Transform to punycode
        urlRuleText = getAsciiDomainRule(urlRuleText);

        return {
            urlRuleText: urlRuleText,
            options: options,
            whiteListRule: whiteListRule
        };
    }

    /**
     * Validates CSP rule
     * @param rule Rule with $CSP modifier
     */
    function validateCspRule(rule) {

        /**
         * https://github.com/AdguardTeam/AdguardBrowserExtension/issues/685
         * CSP directive may be empty in case of whitelist rule, it means to disable all $csp rules matching the whitelist rule
         */
        if (!rule.whiteListRule && !rule.cspDirective) {
            throw 'Invalid $CSP rule: CSP directive must not be empty';
        }

        if (rule.cspDirective) {

            /**
             * https://github.com/AdguardTeam/AdguardBrowserExtension/issues/685#issue-228287090
             * Forbids report-to and report-uri directives
             */
            const cspDirective = rule.cspDirective.toLowerCase();
            if (cspDirective.indexOf('report-uri') >= 0 ||
                cspDirective.indexOf('report-to') >= 0) {

                throw 'Forbidden CSP directive: ' + cspDirective;
            }
        }
    }

    /**
     * Check if the specified options mask contains the given option
     * @param options Options
     * @param option Option
     */
    function containsOption(options, option) {
        return options !== null &&
            (options & option) === option; // jshint ignore:line
    }

    /**
     * Rule for blocking requests to URLs.
     * Read here for details:
     * http://adguard.com/en/filterrules.html#baseRules
     */
    let UrlFilterRule = function (rule) {

        api.FilterRule.call(this, rule);

        // Content type masks
        this.permittedContentType = UrlFilterRule.contentTypes.ALL;
        this.restrictedContentType = 0;
        // Rule options
        this.enabledOptions = null;
        this.disabledOptions = null;

        // Parse rule text
        const parseResult = parseRuleText(rule);

        // Exception rule flag
        if (parseResult.whiteListRule) {
            this.whiteListRule = true;
        }

        // Load options
        if (parseResult.options) {
            this._loadOptions(parseResult.options);
        }

        const urlRuleText = parseResult.urlRuleText;

        this.isRegexRule = adguard.utils.strings.startWith(urlRuleText, UrlFilterRule.MASK_REGEX_RULE) &&
            adguard.utils.strings.endsWith(urlRuleText, UrlFilterRule.MASK_REGEX_RULE) ||
            urlRuleText === '' ||
            urlRuleText === UrlFilterRule.MASK_ANY_SYMBOL;

        if (this.isRegexRule) {
            this.urlRegExpSource = urlRuleText.substring(UrlFilterRule.MASK_REGEX_RULE.length, urlRuleText.length - UrlFilterRule.MASK_REGEX_RULE.length);

            // Pre compile regex rules
            let regexp = this.getUrlRegExp();
            if (!regexp) {
                throw 'Illegal regexp rule';
            }

            if (UrlFilterRule.REGEXP_ANY_SYMBOL === regexp && !this.hasPermittedDomains()) {
                // Rule matches everything and does not have any domain restriction
                throw ("Too wide basic rule: " + urlRuleText);
            }
        }

        if (this.isCspRule()) {
            validateCspRule(this);
        }
    };

    UrlFilterRule.prototype = Object.create(api.FilterRule.prototype);

    // Lazy regexp source create
    UrlFilterRule.prototype.getUrlRegExpSource = function () {
        if (!this.urlRegExpSource) {
            //parse rule text
            const parseResult = parseRuleText(this.ruleText);
            // Creating regex source
            this.urlRegExpSource = api.SimpleRegex.createRegexText(parseResult.urlRuleText);
        }
        return this.urlRegExpSource;
    };

    /**
     * $replace modifier.
     * Learn more about this modifier syntax here:
     * https://github.com/AdguardTeam/AdguardForWindows/issues/591
     *
     * @return Parsed $replace modifier
     */
    UrlFilterRule.prototype.getReplace = function () {
        return this.replace;
    };

    /**
     * Lazy regexp creation
     *
     * @return {RegExp}
     */
    UrlFilterRule.prototype.getUrlRegExp = function () {
        //check already compiled but not successful
        if (this.wrongUrlRegExp) {
            return null;
        }

        if (!this.urlRegExp) {
            let urlRegExpSource = this.getUrlRegExpSource();
            try {
                if (!urlRegExpSource || UrlFilterRule.MASK_ANY_SYMBOL === urlRegExpSource) {
                    // Match any symbol
                    this.urlRegExp = new RegExp(UrlFilterRule.REGEXP_ANY_SYMBOL);
                } else {
                    this.urlRegExp = new RegExp(urlRegExpSource, this.isMatchCase() ? "" : "i");
                }

                delete this.urlRegExpSource;
            } catch (ex) {
                //malformed regexp
                adguard.console.error('Error create regexp from {0}', urlRegExpSource);
                this.wrongUrlRegExp = true;
                return null;
            }
        }

        return this.urlRegExp;
    };

    /**
     * Lazy getter for url rule text ( uses in safari content blocker)
     */
    UrlFilterRule.prototype.getUrlRuleText = function () {
        if (!this.urlRuleText) {
            this.urlRuleText = parseRuleText(this.ruleText).urlRuleText;
        }
        return this.urlRuleText;
    };

    /**
     * There are two exceptions for domain permitting in url blocking rules.
     * White list rules must fire when request has no referrer.
     * Also rules without third-party option should fire.
     *
     * @param domainName
     * @returns {*}
     */
    UrlFilterRule.prototype.isPermitted = function (domainName) {

        if (!domainName) {
            let hasPermittedDomains = this.hasPermittedDomains();

            // For white list rules to fire when request has no referrer
            if (this.whiteListRule && !hasPermittedDomains) {
                return true;
            }

            // Also firing rules when there's no constraint on ThirdParty-FirstParty type
            if (!this.isCheckThirdParty() && !hasPermittedDomains) {
                return true;
            }
        }

        return api.FilterRule.prototype.isPermitted.call(this, domainName);
    };

    /**
     * Checks if request matches rule's content type constraints
     *
     * @param contentTypeMask Request content types mask
     * @return {boolean} true if request matches this content type
     */
    UrlFilterRule.prototype.checkContentTypeMask = function (contentTypeMask) {

        if (this.permittedContentType === UrlFilterRule.contentTypes.ALL &&
            this.restrictedContentType === 0) {
            // Rule does not contain any constraint
            return true;
        }

        // Checking that either all content types are permitted or request content type is in the permitted list
        const matchesPermitted = this.permittedContentType === UrlFilterRule.contentTypes.ALL ||
            (this.permittedContentType & contentTypeMask) !== 0; // jshint ignore:line

        // Checking that either no content types are restricted or request content type is not in the restricted list
        const notMatchesRestricted = this.restrictedContentType === 0 ||
            (this.restrictedContentType & contentTypeMask) === 0; // jshint ignore:line

        return matchesPermitted && notMatchesRestricted;
    };

    /**
     * Checks if specified option is enabled
     *
     * @param option Option to check
     * @return {boolean} true if enabled
     */
    UrlFilterRule.prototype.isOptionEnabled = function (option) {
        return containsOption(this.enabledOptions, option);
    };

    /**
     * Checks if specified option is disabled
     *
     * @param option Option to check
     * @return {boolean} true if disabled
     */
    UrlFilterRule.prototype.isOptionDisabled = function (option) {
        return containsOption(this.disabledOptions, option);
    };

    /**
     * True if this filter should check if request is third- or first-party.
     *
     * @return {boolean} True if we should check third party property
     */
    UrlFilterRule.prototype.isCheckThirdParty = function () {
        return this.isOptionEnabled(UrlFilterRule.options.THIRD_PARTY) ||
            this.isOptionDisabled(UrlFilterRule.options.THIRD_PARTY);
    };

    /**
     * If true - filter is only applied to requests from
     * a different origin that the currently viewed page.
     *
     * @return {boolean} If true - filter third-party requests only
     */
    UrlFilterRule.prototype.isThirdParty = function () {
        if (this.isOptionEnabled(UrlFilterRule.options.THIRD_PARTY)) {
            return true;
        }
        if (this.isOptionDisabled(UrlFilterRule.options.THIRD_PARTY)) {
            return false;
        }
        return false;
    };

    /**
     * Checks if the specified rule contains all document level options
     * @returns {boolean} If true - contains $jsinject, $elemhide and $urlblock options
     */
    UrlFilterRule.prototype.isDocumentWhiteList = function () {
        return this.isOptionEnabled(UrlFilterRule.options.DOCUMENT_WHITELIST);
    };

    /**
     * If rule is case sensitive returns true
     *
     * @return {boolean} true if rule is case sensitive
     */
    UrlFilterRule.prototype.isMatchCase = function () {
        return this.isOptionEnabled(UrlFilterRule.options.MATCH_CASE);
    };

    /**
     * If BlockPopups is true, than window should be closed
     *
     * @return {boolean} true if window should be closed
     */
    UrlFilterRule.prototype.isBlockPopups = function () {
        return this.isOptionEnabled(UrlFilterRule.options.BLOCK_POPUPS);
    };

    /**
     * @returns {boolean} true if this rule is csp
     */
    UrlFilterRule.prototype.isCspRule = function () {
        return this.isOptionEnabled(UrlFilterRule.options.CSP_RULE);
    };

    /**
     * @returns {boolean} If rule is bad-filter returns true
     */
    UrlFilterRule.prototype.isBadFilter = function () {
        return !!this.badFilter;
    };

    /**
     * Loads rule options
     * @param options Options string
     * @private
     */
    UrlFilterRule.prototype._loadOptions = function (options) {

        const optionsParts = adguard.utils.strings.splitByDelimiterWithEscapeCharacter(options, api.FilterRule.COMA_DELIMITER, ESCAPE_CHARACTER, false);

        for (let i = 0; i < optionsParts.length; i++) {
            const option = optionsParts[i];
            const optionsKeyValue = option.split(api.FilterRule.EQUAL);
            let optionName = optionsKeyValue[0];

            switch (optionName) {
                case UrlFilterRule.DOMAIN_OPTION:
                    if (optionsKeyValue.length > 1) {
                        let domains = optionsKeyValue[1];
                        if (optionsKeyValue.length > 2) {
                            domains = optionsKeyValue.slice(1).join(api.FilterRule.EQUAL);
                        }
                        // Load domain option
                        this.loadDomains(domains);
                    }
                    break;
                case UrlFilterRule.THIRD_PARTY_OPTION:
                    this._setUrlFilterRuleOption(UrlFilterRule.options.THIRD_PARTY, true);
                    break;
                case api.FilterRule.NOT_MARK + UrlFilterRule.THIRD_PARTY_OPTION:
                    this._setUrlFilterRuleOption(UrlFilterRule.options.THIRD_PARTY, false);
                    break;
                case UrlFilterRule.MATCH_CASE_OPTION:
                    this._setUrlFilterRuleOption(UrlFilterRule.options.MATCH_CASE, true);
                    break;
                case UrlFilterRule.IMPORTANT_OPTION:
                    this.isImportant = true;
                    break;
                case api.FilterRule.NOT_MARK + UrlFilterRule.IMPORTANT_OPTION:
                    this.isImportant = false;
                    break;
                case UrlFilterRule.ELEMHIDE_OPTION:
                    this._setUrlFilterRuleOption(UrlFilterRule.options.ELEMHIDE, true);
                    break;
                case UrlFilterRule.GENERICHIDE_OPTION:
                    this._setUrlFilterRuleOption(UrlFilterRule.options.GENERICHIDE, true);
                    break;
                case UrlFilterRule.JSINJECT_OPTION:
                    this._setUrlFilterRuleOption(UrlFilterRule.options.JSINJECT, true);
                    break;
                case UrlFilterRule.CONTENT_OPTION:
                    this._setUrlFilterRuleOption(UrlFilterRule.options.CONTENT, true);
                    break;
                case UrlFilterRule.URLBLOCK_OPTION:
                    this._setUrlFilterRuleOption(UrlFilterRule.options.URLBLOCK, true);
                    break;
                case UrlFilterRule.GENERICBLOCK_OPTION:
                    this._setUrlFilterRuleOption(UrlFilterRule.options.GENERICBLOCK, true);
                    break;
                case UrlFilterRule.DOCUMENT_OPTION:
                    this._setUrlFilterRuleOption(UrlFilterRule.options.DOCUMENT_WHITELIST, true);
                    break;
                case UrlFilterRule.POPUP_OPTION:
                    this._setUrlFilterRuleOption(UrlFilterRule.options.BLOCK_POPUPS, true);
                    break;
                case UrlFilterRule.EMPTY_OPTION:
                    this._setUrlFilterRuleOption(UrlFilterRule.options.EMPTY_RESPONSE, true);
                    break;
                case UrlFilterRule.CSP_OPTION:
                    this._setUrlFilterRuleOption(UrlFilterRule.options.CSP_RULE, true);
                    if (optionsKeyValue.length > 1) {
                        this.cspDirective = optionsKeyValue[1];
                    }
                    break;
                case UrlFilterRule.REPLACE_OPTION:
                    throw 'Unknown option: REPLACE';
                    break;
                case UrlFilterRule.BADFILTER_OPTION:
                    this.badFilter = this.ruleText
                        .replace(UrlFilterRule.OPTIONS_DELIMITER + UrlFilterRule.BADFILTER_OPTION + api.FilterRule.COMA_DELIMITER, UrlFilterRule.OPTIONS_DELIMITER)
                        .replace(api.FilterRule.COMA_DELIMITER + UrlFilterRule.BADFILTER_OPTION, '')
                        .replace(UrlFilterRule.OPTIONS_DELIMITER + UrlFilterRule.BADFILTER_OPTION, '');
                    break;
                default:
                    optionName = optionName.toUpperCase();

                    /**
                     * Convert $object-subrequest modifier to UrlFilterRule.contentTypes.OBJECT_SUBREQUEST
                     */
                    if (optionName === 'OBJECT-SUBREQUEST') {
                        optionName = 'OBJECT_SUBREQUEST';
                    } else if (optionName === '~OBJECT-SUBREQUEST') {
                        optionName = '~OBJECT_SUBREQUEST';
                    }

                    if (optionName in UrlFilterRule.contentTypes) {
                        this._appendPermittedContentType(UrlFilterRule.contentTypes[optionName]);
                    } else if (optionName[0] === api.FilterRule.NOT_MARK && optionName.substring(1) in UrlFilterRule.contentTypes) {
                        this._appendRestrictedContentType(UrlFilterRule.contentTypes[optionName.substring(1)]);
                    } else if (optionName in UrlFilterRule.ignoreOptions) {
                        // Ignore others
                    } else {
                        throw 'Unknown option: ' + optionName;
                    }
            }
        }

        // Rules of this types can be applied to documents only
        // $jsinject, $elemhide, $urlblock, $genericblock, $generichide and $content for whitelist rules.
        // $popup - for url blocking
        if (this.isOptionEnabled(UrlFilterRule.options.JSINJECT) ||
            this.isOptionEnabled(UrlFilterRule.options.ELEMHIDE) ||
            this.isOptionEnabled(UrlFilterRule.options.CONTENT) ||
            this.isOptionEnabled(UrlFilterRule.options.URLBLOCK) ||
            this.isOptionEnabled(UrlFilterRule.options.BLOCK_POPUPS) ||
            this.isOptionEnabled(UrlFilterRule.options.GENERICBLOCK) ||
            this.isOptionEnabled(UrlFilterRule.options.GENERICHIDE)) {

            this.permittedContentType = UrlFilterRule.contentTypes.DOCUMENT;
        }
    };

    /**
     * Appends new content type value to permitted list (depending on the current permitted content types)
     *
     * @param contentType Content type to append
     */
    UrlFilterRule.prototype._appendPermittedContentType = function (contentType) {
        if (this.permittedContentType === UrlFilterRule.contentTypes.ALL) {
            this.permittedContentType = contentType;
        } else {
            this.permittedContentType |= contentType; // jshint ignore:line
        }
    };

    /**
     * Appends new content type to restricted list (depending on the current restricted content types)
     *
     * @param contentType Content type to append
     */
    UrlFilterRule.prototype._appendRestrictedContentType = function (contentType) {
        if (this.restrictedContentType === 0) {
            this.restrictedContentType = contentType;
        } else {
            this.restrictedContentType |= contentType; // jshint ignore:line
        }
    };

    /**
     * Sets UrlFilterRuleOption
     *
     * @param option  Option
     * @param enabled Enabled or not
     */
    UrlFilterRule.prototype._setUrlFilterRuleOption = function (option, enabled) {

        if (enabled) {

            if ((this.whiteListRule && containsOption(UrlFilterRule.options.BLACKLIST_OPTIONS, option)) ||
                !this.whiteListRule && containsOption(UrlFilterRule.options.WHITELIST_OPTIONS, option)) {

                throw option + ' cannot be applied to this type of rule';
            }

            if (this.enabledOptions === null) {
                this.enabledOptions = option;
            } else {
                this.enabledOptions |= option; // jshint ignore:line
            }
        } else {
            if (this.disabledOptions === null) {
                this.disabledOptions = option;
            } else {
                this.disabledOptions |= option; // jshint ignore:line
            }
        }
    };

    UrlFilterRule.OPTIONS_DELIMITER = "$";
    UrlFilterRule.DOMAIN_OPTION = "domain";
    UrlFilterRule.THIRD_PARTY_OPTION = "third-party";
    UrlFilterRule.MATCH_CASE_OPTION = "match-case";
    UrlFilterRule.DOCUMENT_OPTION = "document";
    UrlFilterRule.ELEMHIDE_OPTION = "elemhide";
    UrlFilterRule.GENERICHIDE_OPTION = "generichide";
    UrlFilterRule.URLBLOCK_OPTION = "urlblock";
    UrlFilterRule.GENERICBLOCK_OPTION = "genericblock";
    UrlFilterRule.JSINJECT_OPTION = "jsinject";
    UrlFilterRule.CONTENT_OPTION = "content";
    UrlFilterRule.POPUP_OPTION = "popup";
    UrlFilterRule.IMPORTANT_OPTION = "important";
    UrlFilterRule.MASK_REGEX_RULE = "/";
    UrlFilterRule.MASK_ANY_SYMBOL = "*";
    UrlFilterRule.REGEXP_ANY_SYMBOL = ".*";
    UrlFilterRule.EMPTY_OPTION = "empty";
    UrlFilterRule.REPLACE_OPTION = "replace"; // Extension doesn't support replace rules, $replace option is here only for correctly parsing
    UrlFilterRule.CSP_OPTION = "csp";
    UrlFilterRule.BADFILTER_OPTION = "badfilter";

    UrlFilterRule.contentTypes = {

        // jshint ignore:start
        OTHER: 1 << 0,
        SCRIPT: 1 << 1,
        IMAGE: 1 << 2,
        STYLESHEET: 1 << 3,
        OBJECT: 1 << 4,
        SUBDOCUMENT: 1 << 5,
        XMLHTTPREQUEST: 1 << 6,
        OBJECT_SUBREQUEST: 1 << 7,
        MEDIA: 1 << 8,
        FONT: 1 << 9,
        WEBSOCKET: 1 << 10,
        WEBRTC: 1 << 11,
        DOCUMENT: 1 << 12,
        // jshint ignore:end
    };

    // https://code.google.com/p/chromium/issues/detail?id=410382
    UrlFilterRule.contentTypes.OBJECT_SUBREQUEST = UrlFilterRule.contentTypes.OBJECT;

    UrlFilterRule.contentTypes.ALL = 0;
    for (let key in UrlFilterRule.contentTypes) {
        if (UrlFilterRule.contentTypes.hasOwnProperty(key)) {
            UrlFilterRule.contentTypes.ALL |= UrlFilterRule.contentTypes[key]; // jshint ignore:line
        }
    }

    UrlFilterRule.options = {

        // jshint ignore:start

        /**
         * $elemhide modifier.
         * it makes sense to use this parameter for exceptions only.
         * It prohibits element hiding rules on pages affected by the current rule.
         * Element hiding rules will be described below.
         */
        ELEMHIDE: 1 << 0,

        /**
         * limitation on third-party and own requests.
         * If the third-party parameter is used, the rule is applied only to requests
         * coming from external sources. Similarly, ~third-party restricts the rule
         * to requests from the same source that the page comes from. Let’s use an example.
         * The ||domain.com$third-party rule is applied to all sites, except domain.com
         * itself. If we rewrite it as ||domain.com$~third-party, it will be applied
         * only to domain.com, but will not work on other sites.
         */
        THIRD_PARTY: 1 << 1,

        /**
         * If this option is enabled, Adguard won't apply generic CSS rules to the web page.
         */
        GENERICHIDE: 1 << 2,

        /**
         * If this option is enabled, Adguard won't apply generic UrlFilter rules to the web page.
         */
        GENERICBLOCK: 1 << 3,

        /**
         * it makes sense to use this parameter for exceptions only.
         * It prohibits the injection of javascript code to web pages.
         * Javascript code is added for blocking banners by size and for
         * the proper operation of Adguard Assistant
         */
        JSINJECT: 1 << 4,

        /**
         * It makes sense to use this parameter for exceptions only.
         * It prohibits the blocking of requests from pages
         * affected by the current rule.
         */
        URLBLOCK: 1 << 5,  // This attribute is only for exception rules. If true - do not use urlblocking rules for urls where referrer satisfies this rule.

        /**
         * it makes sense to use this parameter for exceptions only.
         * It prohibits HTML filtration rules on pages affected by the current rule.
         * HTML filtration rules will be described below.
         */
        CONTENT: 1 << 6,

        /**
         * For any address matching a&nbsp;blocking rule with this option
         * Adguard will try to&nbsp;automatically close the browser tab.
         */
        BLOCK_POPUPS: 1 << 7,

        /**
         * For any address matching blocking rule with this option
         * Adguard will return internal redirect response (307)
         */
        EMPTY_RESPONSE: 1 << 8,

        /**
         * defines a rule applied only to addresses with exact letter case matches.
         * For example, /BannerAd.gif$match-case will block http://example.com/BannerAd.gif,
         * but not http://example.com/bannerad.gif.
         * By default, the letter case is not matched.
         */
        MATCH_CASE: 1 << 9,

        /**
         * defines a CSP rule
         * For example, ||xpanama.net^$third-party,csp=connect-src 'none'
         */
        CSP_RULE: 1 << 10

        // jshint ignore:end
    };

    /**
     * These options can be applied to whitelist rules only
     */
    UrlFilterRule.options.WHITELIST_OPTIONS =
        UrlFilterRule.options.ELEMHIDE | UrlFilterRule.options.JSINJECT | UrlFilterRule.options.CONTENT | UrlFilterRule.options.GENERICHIDE | UrlFilterRule.options.GENERICBLOCK; // jshint ignore:line

    /**
     * These options can be applied to blacklist rules only
     */
    UrlFilterRule.options.BLACKLIST_OPTIONS = UrlFilterRule.options.EMPTY_RESPONSE;

    /**
     * These options define a document whitelisted rule
     */
    UrlFilterRule.options.DOCUMENT_WHITELIST =
        UrlFilterRule.options.ELEMHIDE | UrlFilterRule.options.URLBLOCK | UrlFilterRule.options.JSINJECT | UrlFilterRule.options.CONTENT; // jshint ignore:line

    UrlFilterRule.ignoreOptions = {
        // Deprecated modifiers
        'BACKGROUND': true,
        '~BACKGROUND': true,
        // Specific to desktop version (can be ignored)
        'EXTENSION': true,
        '~EXTENSION': true,
        // Unused modifiers
        'COLLAPSE': true,
        '~COLLAPSE': true,
        '~DOCUMENT': true
    };

    api.UrlFilterRule = UrlFilterRule;

})(adguard, adguard.rules);
