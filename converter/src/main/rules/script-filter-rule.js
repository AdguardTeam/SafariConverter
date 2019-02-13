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
     * JS injection rule:
     * http://adguard.com/en/filterrules.html#javascriptInjection
     */
    const ScriptFilterRule = function (rule, filterId) {

        api.FilterRule.call(this, rule, filterId);

        this.script = null;
        this.whiteListRule = adguard.utils.strings.contains(rule, api.FilterRule.MASK_SCRIPT_EXCEPTION_RULE);
        const mask = this.whiteListRule ? api.FilterRule.MASK_SCRIPT_EXCEPTION_RULE : api.FilterRule.MASK_SCRIPT_RULE;

        const indexOfMask = rule.indexOf(mask);
        if (indexOfMask > 0) {
            // domains are specified, parsing
            const domains = rule.substring(0, indexOfMask);
            this.loadDomains(domains);
        }

        this.script = rule.substring(indexOfMask + mask.length);
    };

    ScriptFilterRule.prototype = Object.create(api.FilterRule.prototype);

    /**
     * All content rules markers start with this character
     */
    ScriptFilterRule.RULE_MARKER_FIRST_CHAR = '#';

    /**
     * Content rule markers
     */
    ScriptFilterRule.RULE_MARKERS = [
        api.FilterRule.MASK_SCRIPT_EXCEPTION_RULE,
        api.FilterRule.MASK_SCRIPT_RULE
    ];

    api.ScriptFilterRule = ScriptFilterRule;

})(adguard, adguard.rules);

