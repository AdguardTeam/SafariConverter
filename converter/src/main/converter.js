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
 * Converts URLs in the AdGuard format to the format supported by Safari
 * https://webkit.org/blog/3476/content-blockers-first-look/
 */
const SafariContentBlockerConverter = (() =>{

    /**
     * Safari content blocking format rules converter.
     */
    const CONVERTER_VERSION = '${version}';
    // Max number of CSS selectors per rule (look at compactCssRules function)
    const MAX_SELECTORS_PER_WIDE_RULE = 250;

    /**
     * It's important to mention why do we need these regular expressions.
     * The thing is that on iOS it is crucial to use regexes as simple as possible.
     * Otherwise, Safari takes too much memory on compiling a content blocker, and iOS simply kills the process.
     *
     * Angry users are here:
     * https://github.com/AdguardTeam/AdguardForiOS/issues/550
     */
    const ANY_URL_TEMPLATES = ['||*', '', '*', '|*'];
    const URL_FILTER_ANY_URL = "^[htpsw]+:\\/\\/";
    const URL_FILTER_WS_ANY_URL = "^wss?:\\/\\/";
    /**
     * Using .* for the css-display-none rules trigger.url-filter.
     * Please note, that this is important to use ".*" for this kind of rules, otherwise performance is degraded:
     * https://github.com/AdguardTeam/AdguardForiOS/issues/662
     */
    const URL_FILTER_CSS_RULES = ".*";
    const URL_FILTER_SCRIPT_RULES = ".*";
    const URL_FILTER_SCRIPTLET_RULES = ".*";
    /**
     * In some cases URL_FILTER_ANY_URL doesn't work for domain-specific url exceptions
     * https://github.com/AdguardTeam/AdGuardForSafari/issues/285
     */
    const URL_FILTER_URL_RULES_EXCEPTIONS = ".*";

    /**
     * Converter implementation.
     *
     * @type {{convertCssFilterRule, convertUrlFilterRule, isSingleOption}}
     */
    const AGRuleConverter = (() =>{

        /**
         * Parses rule domains to collections
         *
         * @param rule
         * @param included
         * @param excluded
         */
        const parseDomains = (rule, included, excluded) => {
            let domain, domains, iDomains;

            if (rule.permittedDomain) {
                domain = adguard.utils.url.toPunyCode(rule.permittedDomain.toLowerCase());
                included.push(domain);
            } else if (rule.permittedDomains) {
                domains = rule.permittedDomains;
                iDomains = domains.length;
                while (iDomains--) {
                    if (domains[iDomains] !== "") {
                        domain = domains[iDomains];
                        domain = adguard.utils.url.toPunyCode(domain.toLowerCase());
                        included.push(domain);
                    }
                }
            }

            if (rule.restrictedDomain) {
                domain = adguard.utils.url.toPunyCode(rule.restrictedDomain.toLowerCase());
                excluded.push(domain);
            } else if (rule.restrictedDomains) {
                domains = rule.restrictedDomains;
                iDomains = domains.length;
                while (iDomains--) {
                    domain = domains[iDomains];
                    if (domain) {
                        domain = adguard.utils.url.toPunyCode(domain.toLowerCase());
                        excluded.push(domain);
                    }
                }
            }
        };

        /**
         * Adds load-type specification
         *
         * @param trigger
         * @param rule
         */
        const addThirdParty = (trigger, rule) => {
            if (rule.isCheckThirdParty()) {
                trigger["load-type"] = rule.isThirdParty() ? ["third-party"] : ["first-party"];
            }
        };

        /**
         * Adds case-sensitive specification
         *
         * @param trigger
         * @param rule
         */
        const addMatchCase = (trigger, rule) => {
            if (rule.isMatchCase()) {
                trigger["url-filter-is-case-sensitive"] = true;
            }
        };

        /**
         * Writes domains specification
         *
         * @param included
         * @param excluded
         * @param trigger
         */
        const writeDomainOptions = (included, excluded, trigger) => {
            if (included.length > 0 && excluded.length > 0) {
                throw new Error('Safari does not support both permitted and restricted domains');
            }

            if (included.length > 0) {
                trigger["if-domain"] = included;
            }
            if (excluded.length > 0) {
                trigger["unless-domain"] = excluded;
            }
        };

        /**
         * As a limited solution to support wildcard in tld, as there is no support for wildcards in "if-domain" property in CB
         * we are going to use a list of popular domains.
         * https://github.com/AdguardTeam/AdGuardForSafari/issues/248
         *
         * @param domains
         */
        const resolveTopLevelDomainWildcards = (domains) => {
            let arr = [...domains];
            domains.length = 0;
            arr.forEach(d => {
                if (d.endsWith('.*')) {
                    adguard.utils.TOP_LEVEL_DOMAINS_LIST.forEach(tld => {
                        const domain = d.substring(0, d.length - 2);
                        domains.push(`${domain}.${tld}`);
                    });
                } else {
                    domains.push(d);
                }
            });
        };

        /**
         * Adds domains specification
         *
         * @param trigger
         * @param rule
         */
        const addDomainOptions = (trigger, rule) => {
            const included = [];
            const excluded = [];
            parseDomains(rule, included, excluded);
            resolveTopLevelDomainWildcards(included);
            resolveTopLevelDomainWildcards(excluded);
            writeDomainOptions(included, excluded, trigger);
        };

        /**
         * Adds whitelist flag
         *
         * @param rule
         * @param result
         */
        const setWhiteList = (rule, result) => {
            if (rule.whiteListRule && rule.whiteListRule === true) {
                result.action.type = "ignore-previous-rules";
            }
        };

        /**
         * Checks if contentType matches rule's content type constraints
         *
         * @param rule
         * @param contentType
         * @return {boolean}
         */
        const hasContentType = (rule, contentType) => rule.checkContentTypeMask(contentType);

        /**
         * Checks if rule is specified content type
         *
         * @param rule
         * @param contentType
         * @return {boolean}
         */
        const isContentType = (rule, contentType) => rule.permittedContentType === contentType;

        /**
         * If rule has the only one specified option
         *
         * @param rule
         * @param option
         * @return {boolean}
         */
        const isSingleOption = (rule, option) => rule.enabledOptions === option;

        /**
         * Adds resource type specification
         *
         * @param rule
         * @param result
         */
        const addResourceType = (rule, result) => {
            let types = [];

            const contentTypes = adguard.rules.UrlFilterRule.contentTypes;

            if (rule.permittedContentType === contentTypes.ALL &&
                rule.restrictedContentType === 0) {
                // Safari does not support all other default content types, like subdocument etc.
                // So we can use default safari content types instead.
                return;
            }
            if (hasContentType(rule, contentTypes.IMAGE)) {
                types.push("image");
            }
            if (hasContentType(rule, contentTypes.STYLESHEET)) {
                types.push("style-sheet");
            }
            if (hasContentType(rule, contentTypes.SCRIPT)) {
                types.push("script");
            }
            if (hasContentType(rule, contentTypes.MEDIA)) {
                types.push("media");
            }
            if (hasContentType(rule, contentTypes.XMLHTTPREQUEST) ||
                hasContentType(rule, contentTypes.OTHER) ||
                hasContentType(rule, contentTypes.WEBSOCKET)) {
                types.push("raw");
            }
            if (hasContentType(rule, contentTypes.FONT)) {
                types.push("font");
            }
            if (hasContentType(rule, contentTypes.SUBDOCUMENT)) {
                types.push("document");
            }
            if (rule.isBlockPopups()) {
                // Ignore other in case of $popup modifier
                types = ["popup"];
            }

            // Not supported modificators
            if (isContentType(rule, contentTypes.OBJECT)) {
                throw new Error('$object content type is not yet supported');
            }
            if (isContentType(rule, contentTypes.OBJECT_SUBREQUEST)) {
                throw new Error('$object_subrequest content type is not yet supported');
            }
            if (isContentType(rule, contentTypes.WEBRTC)) {
                throw new Error('$webrtc content type is not yet supported');
            }
            if (rule.getReplace()) {
                throw new Error('$replace rules are ignored.');
            }

            if (types.length > 0) {
                result.trigger["resource-type"] = types;
            }

            //TODO: Add restricted content types?
        };

        /**
         * Creates a regular expression that will be used in the trigger["url-filter"].
         * This method transforms
         *
         * @param {*} urlFilterRule UrlFilterRule object
         */
        const createUrlFilterString = urlFilterRule =>{
            const urlRuleText = urlFilterRule.getUrlRuleText();
            const isWebSocket = (urlFilterRule.permittedContentType === adguard.rules.UrlFilterRule.contentTypes.WEBSOCKET);

            // Use a single standard regex for rules that are supposed to match every URL
            if (ANY_URL_TEMPLATES.indexOf(urlRuleText) >= 0) {
                return isWebSocket ? URL_FILTER_WS_ANY_URL : URL_FILTER_ANY_URL;
            }

            if (urlFilterRule.isRegexRule && urlFilterRule.urlRegExp) {
                return urlFilterRule.urlRegExp.source;
            }

            let urlRegExpSource = urlFilterRule.getUrlRegExpSource();

            if (!urlRegExpSource) {
                // Rule with empty regexp
                return URL_FILTER_ANY_URL;
            }

            // Prepending WebSocket protocol to resolve this:
            // https://github.com/AdguardTeam/AdguardBrowserExtension/issues/957
            if (isWebSocket &&
                urlRegExpSource.indexOf("^") !== 0 &&
                urlRegExpSource.indexOf("ws") !== 0) {
                return URL_FILTER_WS_ANY_URL + ".*" + urlRegExpSource;
            }

            return urlRegExpSource;
        };

        /**
         * Parses rule domain from text
         *
         * @param ruleText
         * @return {*}
         */
        const parseRuleDomain = ruleText => {
            try {
                let i;
                const startsWith = ["http://www.", "https://www.", "http://", "https://", "||", "//"];
                const contains = ["/", "^"];
                let startIndex = 0;

                for (i = 0; i < startsWith.length; i++) {
                    const start = startsWith[i];
                    if (adguard.utils.strings.startWith(ruleText, start)) {
                        startIndex = start.length;
                        break;
                    }
                }

                //exclusive for domain
                const exceptRule = "domain=";
                const domainIndex = ruleText.indexOf(exceptRule);
                if (domainIndex > -1 && ruleText.indexOf("$") > -1) {
                    startIndex = domainIndex + exceptRule.length;
                }

                if (startIndex === -1) {
                    return null;
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

                const domain = symbolIndex === -1 ? ruleText.substring(startIndex) : ruleText.substring(startIndex, symbolIndex);
                const path = symbolIndex === -1 ? null : ruleText.substring(symbolIndex);

                if (!/^[a-zA-Z0-9][a-zA-Z0-9-.]*[a-zA-Z0-9]\.[a-zA-Z-]{2,}$/.test(domain)) {
                    // Not a valid domain name, ignore it
                    return null;
                }

                return {
                    domain: adguard.utils.url.toPunyCode(domain).toLowerCase(),
                    path: path
                };

            } catch (ex) {
                adguard.console.error("Error parsing domain from {0}, cause {1}", ruleText, ex);
                return null;
            }
        };

        /**
         * Converts css filter rule
         *
         * @param rule
         * @return {*}
         */
        const convertCssFilterRule = rule => {
            const result = {
                trigger: {
                    "url-filter": URL_FILTER_CSS_RULES
                    // https://github.com/AdguardTeam/AdguardBrowserExtension/issues/153#issuecomment-263067779
                    //,"resource-type": [ "document" ]
                },
                action: {}
            };

            if (rule.extendedCss || (rule.isInjectRule && rule.isInjectRule === true)) {
                result.action.type = "css";
                result.action.css = rule.cssSelector;
            } else {
                result.action.type = "css-display-none";
                result.action.selector = rule.cssSelector;
            }

            setWhiteList(rule, result);
            addDomainOptions(result.trigger, rule);

            validateCssFilterRule(result);

            return result;
        };

        /**
         * Validates url blocking rule and discards rules considered dangerous or invalid.
         *
         * @param rule
         */
        const validateCssFilterRule = rule => {
            if (rule.action.type === "css" &&
                rule.action.css.includes("url(")) {
                throw new Error("Urls are not allowed in css styles");
            }
        };

        /**
         * Validates url blocking rule and discards rules considered dangerous or invalid.
         */
        const validateUrlBlockingRule = rule => {

            if (rule.action.type === "block" &&
                rule.trigger["resource-type"] &&
                rule.trigger["resource-type"].indexOf("document") >= 0 &&
                !rule.trigger["if-domain"] &&
                (!rule.trigger["load-type"] || rule.trigger["load-type"].indexOf("third-party") === -1)) {
                // Due to https://github.com/AdguardTeam/AdguardBrowserExtension/issues/145
                throw new Error("Document blocking rules are allowed only along with third-party or if-domain modifiers");
            }
        };

        /**
         *
         * @param rule
         * @param result
         */
        const checkWhiteListExceptions = (rule, result) => {

            function isDocumentRule(r) {
                return r.isDocumentWhiteList();
            }

            function isUrlBlockRule(r) {
                return isSingleOption(r, adguard.rules.UrlFilterRule.options.URLBLOCK) ||
                    isSingleOption(r, adguard.rules.UrlFilterRule.options.GENERICBLOCK);
            }

            function isCssExceptionRule(r) {
                return isSingleOption(r, adguard.rules.UrlFilterRule.options.GENERICHIDE) ||
                    isSingleOption(r, adguard.rules.UrlFilterRule.options.ELEMHIDE);
            }

            if (rule.whiteListRule && rule.whiteListRule === true) {

                const documentRule = isDocumentRule(rule);

                if (documentRule || isUrlBlockRule(rule) || isCssExceptionRule(rule)) {
                    if (documentRule) {
                        //http://jira.performix.ru/browse/AG-8715
                        delete result.trigger["resource-type"];
                    }

                    const parseDomainResult = parseRuleDomain(rule.getUrlRuleText());

                    if (parseDomainResult !== null &&
                        parseDomainResult.path !== null &&
                        parseDomainResult.path !== "^" &&
                        parseDomainResult.path !== "/") {
                        // http://jira.performix.ru/browse/AG-8664
                        adguard.console.debug('Whitelist special warning for rule: ' + rule.ruleText);

                        return;
                    }

                    if (parseDomainResult === null || parseDomainResult.domain === null) {
                        adguard.console.debug('Error parse domain from rule: ' + rule.ruleText);
                        return;
                    }

                    const domain = parseDomainResult.domain;

                    const included = [];
                    const excluded = [];

                    included.push(domain);
                    resolveTopLevelDomainWildcards(included);
                    resolveTopLevelDomainWildcards(excluded);
                    writeDomainOptions(included, excluded, result.trigger);

                    result.trigger["url-filter"] = URL_FILTER_URL_RULES_EXCEPTIONS;
                    delete result.trigger["resource-type"];
                }
            }
        };

        /**
         * Safari doesn't support some regular expressions
         *
         * @param regExp
         */
        const validateRegExp = regExp => {
            // Safari doesn't support {digit} in regular expressions
            if (regExp.match(/\{[0-9,]+\}/g)) {
                throw new Error("Safari doesn't support '{digit}' in regular expressions");
            }

            // Safari doesn't support | in regular expressions
            if (regExp.match(/[^\\]+\|+\S*/g)) {
                throw new Error("Safari doesn't support '|' in regular expressions");
            }

            // Safari doesn't support non-ASCII characters in regular expressions
            if (regExp.match(/[^\x00-\x7F]/g)) {
                throw new Error("Safari doesn't support non-ASCII characters in regular expressions");
            }

            // Safari doesn't support negative lookahead (?!...) in regular expressions
            if (regExp.match(/\(\?!.*\)/g)) {
                throw new Error("Safari doesn't support negative lookahead in regular expressions");
            }


            // Safari doesn't support metacharacters in regular expressions
            if (regExp.match(/[^\\]\\[bBdDfnrsStvwW]/g)) {
                throw new Error("Safari doesn't support metacharacters in regular expressions");
            }
        };

        /**
         * Converts url filter rule
         *
         * @param rule
         * @return {*}
         */
        const convertUrlFilterRule = rule => {

            if (rule.isCspRule()) {
                // CSP rules are not supported
                throw new Error("CSP rules are not supported");
            }

            const urlFilter = createUrlFilterString(rule);

            validateRegExp(urlFilter);

            const result = {
                trigger: {
                    "url-filter": urlFilter
                },
                action: {
                    type: "block"
                }
            };

            setWhiteList(rule, result);
            addResourceType(rule, result);
            addThirdParty(result.trigger, rule);
            addMatchCase(result.trigger, rule);
            addDomainOptions(result.trigger, rule);

            // Check whitelist exceptions
            checkWhiteListExceptions(rule, result);

            // Validate the rule
            validateUrlBlockingRule(result);

            return result;
        };

        /**
         * Converts script rule
         *
         * @param rule
         */
        const convertScriptFilterRule = rule => {
            const result = {
                trigger: {
                    "url-filter": URL_FILTER_SCRIPT_RULES
                },
                action: {
                    type: "script",
                    script: rule.script
                }
            };

            setWhiteList(rule, result);
            addDomainOptions(result.trigger, rule);

            return result;
        };

        /**
         * Converts scriptlet rule
         *
         * @param rule
         */
        const convertScriptletRule = rule => {
            const result = {
                trigger: {
                    "url-filter": URL_FILTER_SCRIPTLET_RULES
                },
                action: {
                    type: "scriptlet",
                    scriptlet: rule.scriptlet,
                    scriptletParam: rule.scriptletParam
                }
            };

            setWhiteList(rule, result);
            addDomainOptions(result.trigger, rule);

            return result;
        };

        // Expose AGRuleConverter API
        return {
            convertCssFilterRule,
            convertUrlFilterRule,
            convertScriptFilterRule,
            convertScriptletRule,
            isSingleOption
        }
    })();

    /**
     * Add converter version message
     *
     * @private
     */
    const printVersionMessage = () =>{
        adguard.console.info('Safari Content Blocker Converter v' + CONVERTER_VERSION);
    };

    /**
     * Converts ruleText string to Safari format
     * Used in iOS.
     *
     * @param ruleText string
     * @param errors array
     * @returns {*}
     */
    const convertLine = (ruleText, errors) => {
        try {
            return convertAGRuleToCB(parseAGRule(ruleText, errors));
        } catch (ex) {
            let message = 'Error converting rule from: ' + ruleText + ' cause:\n' + ex;
            message = ruleText + '\r\n' + message + '\r\n';
            adguard.console.debug(message);

            if (errors) {
                errors.push(message);
            }

            return null;
        }
    };

    /**
     * Creates AG rule form text
     *
     * @param ruleText
     * @param errors
     */
    const parseAGRule = (ruleText, errors) => {
        try {
            if (ruleText === null ||
                ruleText === '' ||
                ruleText.indexOf('!') === 0 ||
                ruleText.indexOf(' ') === 0 ||
                ruleText.indexOf(' - ') > 0) {
                return null;
            }

            const agRule = adguard.rules.builder.createRule(ruleText);
            if (agRule === null) {
                throw new Error('Cannot create rule from: ' + ruleText);
            }

            return agRule;
        } catch (ex) {
            let message = 'Error creating rule from: ' + ruleText + ' cause:\n' + ex;
            message = ruleText + '\r\n' + message + '\r\n';
            adguard.console.debug(message);

            if (errors) {
                errors.push(message);
            }

            return null;
        }
    };

    /**
     * Converts rule to Safari format
     *
     * @param rule AG rule object
     * @returns {*}
     */
    const convertAGRuleToCB = rule => {
        if (rule === null) {
            throw new Error('Invalid argument rule');
        }

        let result;
        if (rule instanceof adguard.rules.CssFilterRule) {
            result = AGRuleConverter.convertCssFilterRule(rule);
        } else if (rule instanceof adguard.rules.UrlFilterRule) {
            result = AGRuleConverter.convertUrlFilterRule(rule);
        } else if (rule instanceof adguard.rules.ScriptFilterRule) {
            result = AGRuleConverter.convertScriptFilterRule(rule);
        } else if (rule instanceof adguard.rules.ScriptletRule) {
            result = AGRuleConverter.convertScriptletRule(rule);
        } else {
            throw new Error('Rule is not supported: ' + rule);
        }

        return result;
    };

    /**
     * Converts rule to Safari format
     *
     * @param rule AG rule object
     * @param errors array
     * @returns {*}
     */
    const convertAGRule = (rule, errors) => {
        try {
            return convertAGRuleToCB(rule);
        } catch (ex) {
            const message = 'Error converting rule from: ' +
                ((rule && rule.ruleText) ? rule.ruleText : rule) +
                ' cause:\n' + ex + '\r\n';
            adguard.console.debug(message);

            if (errors) {
                errors.push(message);
            }

            return null;
        }
    };

    /**
     * Converts array to map object
     *
     * @param array
     * @param prop
     * @param prop2
     * @returns {null}
     * @private
     */
    const arrayToMap = (array, prop, prop2) => {
        const map = Object.create(null);
        for (let i = 0; i < array.length; i++) {
            const el = array[i];
            const property = el[prop][prop2];
            if (!(property in map)) {
                map[property] = [];
            }
            map[property].push(el);
        }
        return map;
    };

    /**
     * Updates if-domain and unless-domain fields.
     * Adds wildcard to every rule
     *
     * @private
     */
    const applyDomainWildcards = rules => {
        const addWildcard = array =>{
            if (!array || !array.length) {
                return;
            }

            for (let i = 0; i < array.length; i++) {
                if (!array[i].startsWith('*')) {
                    array[i] = "*" + array[i];
                }
            }
        };

        rules.forEach(rule =>{
            if (rule.trigger) {
                addWildcard(rule.trigger["if-domain"]);
                addWildcard(rule.trigger["unless-domain"]);
            }
        });
    };

    /**
     * Apply exceptions
     * http://jira.performix.ru/browse/AG-8710
     *
     * @param blockingItems
     * @param exceptions
     * @param actionValue action value (selector, script, css)
     * @private
     */
    const applyActionExceptions = (blockingItems, exceptions, actionValue) => {
        adguard.console.info(`Applying ${exceptions.length} ${actionValue} exceptions`);

        /**
         * Adds exception domain to the specified rule.
         * First it checks if rule has if-domain restriction.
         * If so - it may be that domain is redundant.
         */
        const pushExceptionDomain = (domain, rule) => {
            const permittedDomains = rule.trigger["if-domain"];
            if (permittedDomains && permittedDomains.length) {

                // First check that domain is not redundant
                let applicable = permittedDomains.some(permitted => domain.indexOf(permitted) >= 0);

                if (!applicable) {
                    return;
                }
            }

            let ruleRestrictedDomains = rule.trigger["unless-domain"];
            if (!ruleRestrictedDomains) {
                ruleRestrictedDomains = [];
                rule.trigger["unless-domain"] = ruleRestrictedDomains;
            }

            ruleRestrictedDomains.push(domain);
        };

        const rulesMap = arrayToMap(blockingItems, 'action', actionValue);
        const exceptionRulesMap = arrayToMap(exceptions, 'action', actionValue);

        let exceptionsAppliedCount = 0;
        let exceptionsErrorsCount = 0;

        let selectorRules, selectorExceptions;
        const iterator = exc =>{
            selectorRules.forEach(rule =>{
                const exceptionDomains = exc.trigger['if-domain'];
                if (exceptionDomains && exceptionDomains.length > 0) {
                    exceptionDomains.forEach(domain =>{
                        pushExceptionDomain(domain, rule);
                    });
                }
            });

            exceptionsAppliedCount++;
        };

        for (let selector in exceptionRulesMap) { // jshint ignore:line
            selectorRules = rulesMap[selector];
            selectorExceptions = exceptionRulesMap[selector];

            if (selectorRules && selectorExceptions) {
                selectorExceptions.forEach(iterator);
            }
        }

        const result = [];
        blockingItems.forEach(r =>{
            if (r.trigger["if-domain"] && (r.trigger["if-domain"].length > 0) &&
                r.trigger["unless-domain"] && (r.trigger["unless-domain"].length > 0)) {
                adguard.console.debug('Safari does not support permitted and restricted domains in one rule');
                adguard.console.debug(JSON.stringify(r));
                exceptionsErrorsCount++;
            } else {
                result.push(r);
            }
        });

        adguard.console.info(`Exceptions ${actionValue} applied: ${exceptionsAppliedCount}`);
        adguard.console.info(`Exceptions ${actionValue} errors: ${exceptionsErrorsCount}`);
        return result;
    };

    /**
     * Compacts wide CSS rules
     * @param cssBlocking unsorted css elemhide rules
     * @return {*} an object with two properties: cssBlockingWide and cssBlockingDomainSensitive
     */
    const compactCssRules = cssBlocking =>{
        adguard.console.info('Trying to compact ' + cssBlocking.length + ' elemhide rules');

        const cssBlockingWide = [];
        const cssBlockingDomainSensitive = [];
        const cssBlockingGenericDomainSensitive = [];

        let wideSelectors = [];
        const addWideRule = () =>{
            if (!wideSelectors.length) {
                // Nothing to add
                return;
            }

            const rule = {
                trigger: {
                    "url-filter": URL_FILTER_CSS_RULES
                    // https://github.com/AdguardTeam/AdguardBrowserExtension/issues/153#issuecomment-263067779
                    //,"resource-type": [ "document" ]
                },
                action: {
                    type: "css-display-none",
                    selector: wideSelectors.join(', ')
                }
            };
            cssBlockingWide.push(rule);
        };

        for (let i = 0; i < cssBlocking.length; i++) {

            let rule = cssBlocking[i];
            if (rule.trigger['if-domain']) {
                cssBlockingDomainSensitive.push(rule);
            } else if (rule.trigger['unless-domain']) {
                cssBlockingGenericDomainSensitive.push(rule);
            } else {
                wideSelectors.push(rule.action.selector);
                if (wideSelectors.length >= MAX_SELECTORS_PER_WIDE_RULE) {
                    addWideRule();
                    wideSelectors = [];
                }
            }
        }
        addWideRule();

        adguard.console.info('Compacted result: wide=' + cssBlockingWide.length + ' domainSensitive=' + cssBlockingDomainSensitive.length);
        return {
            cssBlockingWide: cssBlockingWide,
            cssBlockingDomainSensitive: cssBlockingDomainSensitive,
            cssBlockingGenericDomainSensitive: cssBlockingGenericDomainSensitive
        };
    };

    /**
     * Creates rule objects from string and parses bad-filter exceptions
     *
     * @param rules
     * @param errors
     * @return {{agRules: Array, badFilterExceptions: Array}}
     */
    const parseAGRules = (rules, errors) => {
        const agRules = [];

        // $badfilter rules
        const badFilterExceptions = [];

        for (let j = 0; j < rules.length; j++) {
            let rule;

            if (rules[j] !== null && rules[j].ruleText) {
                rule = rules[j];
            } else {
                rule = parseAGRule(rules[j], errors);
            }

            if (rule) {
                if (rule.isBadFilter && rule.isBadFilter()) {
                    badFilterExceptions.push(rule.badFilter);
                } else {
                    if (rule instanceof adguard.rules.CompositeRule) {
                        rule.rules.forEach(r => agRules.push(r));
                    } else {
                        agRules.push(rule);
                    }
                }
            }
        }

        return {
            agRules,
            badFilterExceptions
        }
    };

    /**
     * Converts array of rules to JSON
     *
     * @param rules array of strings or AG rules objects
     * @param optimize if true - ignore slow rules
     * @param advancedBlocking if true - convert advanced blocking rules (script and extended css)
     * @return {*} content blocker object with converted rules grouped by type
     */
    const convertLines = (rules, optimize, advancedBlocking) =>{
        adguard.console.info('Converting ' + rules.length + ' rules. Optimize=' + optimize);

        const contentBlocker = {
            // Elemhide rules (##) - wide generic rules
            cssBlockingWide: [],
            // Elemhide rules (##) - generic domain sensitive
            cssBlockingGenericDomainSensitive: [],
            // Generic hide exceptions
            cssBlockingGenericHideExceptions: [],
            // Elemhide rules (##) with domain restrictions
            cssBlockingDomainSensitive: [],
            // Elemhide exceptions ($elemhide)
            cssElemhide: [],
            // Url blocking rules
            urlBlocking: [],
            // Other exceptions
            other: [],
            // $important url blocking rules
            important: [],
            // $important url blocking exceptions
            importantExceptions: [],
            // Document url blocking exceptions
            documentExceptions: [],
            // Script rules (#%#)
            script: [],
            // JsInject exception ($jsinject)
            scriptJsInjectExceptions: [],
            // Extended css rules:
            // Extended css Elemhide rules (##) - wide generic rules
            extendedCssBlockingWide: [],
            // Extended css Elemhide rules (##) - generic domain sensitive
            extendedCssBlockingGenericDomainSensitive: [],
            // Elemhide rules (##) with domain restrictions
            extendedCssBlockingDomainSensitive: [],
            // Scriptlet rules (#%#//scriptlet)
            scriptlets: [],
            // Errors
            errors: []
        };

        // Elemhide rules (##)
        let cssBlocking = [];
        // Elemhide exceptions (#@#)
        const cssExceptions = [];
        // Extended css Elemhide rules (##)
        let extendedCssBlocking = [];
        // Cosmetic css exceptions (#@$#)
        const cosmeticCssExceptions = [];

        // Script rules (#%#)
        let scriptRules = [];
        const scriptExceptionRules = [];

        // Scriptlets
        let scriptlets = [];
        const scriptletsExceptions = [];

        const parsedRules = parseAGRules(rules, contentBlocker.errors);

        let i = 0;
        const len = parsedRules.agRules.length;
        for (; i < len; i++) {
            const agRule = parsedRules.agRules[i];
            if (parsedRules.badFilterExceptions.indexOf(agRule.ruleText) >= 0) {
                // Removed with bad-filter
                adguard.console.info('Rule ' + agRule.ruleText + ' removed with a $badfilter modifier');
                continue;
            }

            const item = convertAGRule(parsedRules.agRules[i], contentBlocker.errors);

            if (item !== null && item !== '') {
                if (item.action === null || item.action === '') {
                    continue;
                }

                if (item.action.type === 'block') {
                    // Url blocking rules
                    if (agRule.isImportant) {
                        contentBlocker.important.push(item);
                    } else {
                        contentBlocker.urlBlocking.push(item);
                    }
                } else if (item.action.type === 'css-display-none') {
                    cssBlocking.push(item);
                } else if (item.action.type === 'css') {
                    extendedCssBlocking.push(item);
                } else if (item.action.type === 'script') {
                    scriptRules.push(item);
                } else if (item.action.type === 'ignore-previous-rules' && agRule.script) {
                    // #@%# rules
                    scriptExceptionRules.push(item);
                } else if (item.action.type === 'scriptlet') {
                    scriptlets.push(item);
                } else if (item.action.type === 'ignore-previous-rules' && agRule.scriptlet) {
                    // #@%#//scriptlet
                    scriptletsExceptions.push(item);
                } else if (item.action.type === 'ignore-previous-rules' &&
                    (item.action.selector && item.action.selector !== '')) {
                    // #@# rules
                    cssExceptions.push(item);
                } else if (item.action.type === 'ignore-previous-rules' &&
                    (item.action.css && item.action.css !== '')) {
                    cosmeticCssExceptions.push(item);
                } else if (item.action.type === 'ignore-previous-rules' &&
                    AGRuleConverter.isSingleOption(agRule, adguard.rules.UrlFilterRule.options.GENERICHIDE)) {
                    contentBlocker.cssBlockingGenericHideExceptions.push(item);
                } else if (item.action.type === 'ignore-previous-rules' &&
                    AGRuleConverter.isSingleOption(agRule, adguard.rules.UrlFilterRule.options.ELEMHIDE)) {
                    // elemhide rules
                    contentBlocker.cssElemhide.push(item);
                } else if (item.action.type === 'ignore-previous-rules' &&
                    AGRuleConverter.isSingleOption(agRule, adguard.rules.UrlFilterRule.options.JSINJECT)) {
                    // jsinject rules
                    contentBlocker.scriptJsInjectExceptions.push(item);
                } else {
                    // other exceptions
                    if (agRule.isImportant) {
                        contentBlocker.importantExceptions.push(item);
                    } else if (agRule.isDocumentWhiteList && agRule.isDocumentWhiteList()) {
                        contentBlocker.documentExceptions.push(item);
                    } else {
                        contentBlocker.other.push(item);
                    }
                }
            }
        }

        // Applying CSS exceptions
        cssBlocking = applyActionExceptions(cssBlocking, cssExceptions, 'selector');
        const cssCompact = compactCssRules(cssBlocking);
        if (!optimize) {
            contentBlocker.cssBlockingWide = cssCompact.cssBlockingWide;
        }
        contentBlocker.cssBlockingGenericDomainSensitive = cssCompact.cssBlockingGenericDomainSensitive;
        contentBlocker.cssBlockingDomainSensitive = cssCompact.cssBlockingDomainSensitive;

        if (advancedBlocking) {
            // Applying CSS exceptions for extended css rules
            extendedCssBlocking = applyActionExceptions(extendedCssBlocking, cssExceptions.concat(cosmeticCssExceptions), 'selector');
            const extendedCssCompact = compactCssRules(extendedCssBlocking);
            if (!optimize) {
                contentBlocker.extendedCssBlockingWide = extendedCssCompact.cssBlockingWide;
            }
            contentBlocker.extendedCssBlockingGenericDomainSensitive = extendedCssCompact.cssBlockingGenericDomainSensitive;
            contentBlocker.extendedCssBlockingDomainSensitive = extendedCssCompact.cssBlockingDomainSensitive;

            // Applying script exceptions
            scriptRules = applyActionExceptions(scriptRules, scriptExceptionRules, 'script');
            contentBlocker.script = scriptRules;

            scriptlets = applyActionExceptions(scriptlets, scriptletsExceptions, 'scriptlet');
            contentBlocker.scriptlets = scriptlets;
        }

        const convertedCount = rules.length - contentBlocker.errors.length;
        let message = 'Rules converted: ' + convertedCount + ' (' + contentBlocker.errors.length + ' errors)';
        message += '\nBasic rules: ' + contentBlocker.urlBlocking.length;
        message += '\nBasic important rules: ' + contentBlocker.important.length;
        message += '\nElemhide rules (wide): ' + contentBlocker.cssBlockingWide.length;
        message += '\nElemhide rules (generic domain sensitive): ' + contentBlocker.cssBlockingGenericDomainSensitive.length;
        message += '\nExceptions Elemhide (wide): ' + contentBlocker.cssBlockingGenericHideExceptions.length;
        message += '\nElemhide rules (domain-sensitive): ' + contentBlocker.cssBlockingDomainSensitive.length;
        message += '\nScript rules: ' + contentBlocker.script.length;
        message += '\nScriptlets rules: ' + contentBlocker.scriptlets.length;
        message += '\nExtended Css Elemhide rules (wide): ' + contentBlocker.extendedCssBlockingWide.length;
        message += '\nExtended Css Elemhide rules (generic domain sensitive): ' + contentBlocker.extendedCssBlockingGenericDomainSensitive.length;
        message += '\nExtended Css Elemhide rules (domain-sensitive): ' + contentBlocker.extendedCssBlockingDomainSensitive.length;
        message += '\nExceptions (elemhide): ' + contentBlocker.cssElemhide.length;
        message += '\nExceptions (important): ' + contentBlocker.importantExceptions.length;
        message += '\nExceptions (document): ' + contentBlocker.documentExceptions.length;
        message += '\nExceptions (jsinject): ' + contentBlocker.scriptJsInjectExceptions.length;
        message += '\nExceptions (other): ' + contentBlocker.other.length;
        adguard.console.info(message);

        return contentBlocker;
    };

    /**
     * Creates result object
     *
     * @param contentBlocker
     * @param limit
     * @param advancedBlocking
     * @return {{totalConvertedCount: Number, convertedCount: Number, errorsCount: Number, overLimit: boolean, converted, advancedBlocking}}
     */
    const createConversionResult = (contentBlocker, limit, advancedBlocking) =>{
        let overLimit = false;
        let converted = [];
        converted = converted.concat(contentBlocker.cssBlockingWide);
        converted = converted.concat(contentBlocker.cssBlockingGenericDomainSensitive);
        converted = converted.concat(contentBlocker.cssBlockingGenericHideExceptions);
        converted = converted.concat(contentBlocker.cssBlockingDomainSensitive);
        converted = converted.concat(contentBlocker.cssElemhide);
        converted = converted.concat(contentBlocker.urlBlocking);
        converted = converted.concat(contentBlocker.other);
        converted = converted.concat(contentBlocker.important);
        converted = converted.concat(contentBlocker.importantExceptions);
        converted = converted.concat(contentBlocker.documentExceptions);

        const convertedLength = converted.length;

        if (limit && limit > 0 && converted.length > limit) {
            const message = '' + limit + ' limit is achieved. Next rules will be ignored.';
            contentBlocker.errors.push(message);
            adguard.console.error(message);
            overLimit = true;
            converted = converted.slice(0, limit);
        }

        applyDomainWildcards(converted);
        adguard.console.info('Content blocker length: ' + converted.length);

        const result = {
            totalConvertedCount: convertedLength,
            convertedCount: converted.length,
            errorsCount: contentBlocker.errors.length,
            overLimit: overLimit,
            converted: JSON.stringify(converted, null, "\t")
        };

        if (advancedBlocking) {
            let advancedBlocker = [];
            advancedBlocker = advancedBlocker.concat(contentBlocker.script);
            advancedBlocker = advancedBlocker.concat(contentBlocker.scriptlets);
            advancedBlocker = advancedBlocker.concat(contentBlocker.scriptJsInjectExceptions);
            advancedBlocker = advancedBlocker.concat(contentBlocker.extendedCssBlockingWide);
            advancedBlocker = advancedBlocker.concat(contentBlocker.extendedCssBlockingGenericDomainSensitive);
            advancedBlocker = advancedBlocker.concat(contentBlocker.cssBlockingGenericHideExceptions);
            advancedBlocker = advancedBlocker.concat(contentBlocker.extendedCssBlockingDomainSensitive);
            advancedBlocker = advancedBlocker.concat(contentBlocker.cssElemhide);
            advancedBlocker = advancedBlocker.concat(contentBlocker.other);
            advancedBlocker = advancedBlocker.concat(contentBlocker.importantExceptions);
            advancedBlocker = advancedBlocker.concat(contentBlocker.documentExceptions);

            applyDomainWildcards(advancedBlocker);
            adguard.console.info('Advanced Blocking length: ' + advancedBlocker.length);

            result.advancedBlocking = JSON.stringify(advancedBlocker, null, "\t");
            result.advancedBlockingConvertedCount = advancedBlocker.length;
        }

        return result;
    };

    /**
     * Converts array of rule texts or AG rules to JSON
     *
     * @param rules array of strings
     * @param limit over that limit rules will be ignored
     * @param optimize if true - "wide" rules will be ignored
     * @param advancedBlocking if true - advanced blocking json will be included
     */
    const convertArray = (rules, limit, optimize, advancedBlocking) =>{
        printVersionMessage();

        try {
            if (rules === null) {
                adguard.console.error('Invalid argument rules');
                return null;
            }

            if (rules.length === 0) {
                adguard.console.info('No rules presented for conversion');
                return null;
            }

            const contentBlocker = convertLines(rules, !!optimize, advancedBlocking);
            return createConversionResult(contentBlocker, limit, advancedBlocking);
        } catch (e) {
            adguard.console.error('Unexpected error: ' + e);
        }
    };

    // Expose SafariContentBlockerConverter API
    return {
        convertArray: convertArray
    }
})();