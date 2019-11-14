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

    /**
     * Popular top level domains list
     *
     * @type {[*]}
     */
    const TOP_LEVEL_DOMAINS_LIST = [
        "com",
        "org",
        "edu",
        "gov",
        "uk",
        "net",
        "ca",
        "de",
        "jp",
        "fr",
        "au",
        "us",
        "ru",
        "ch",
        "it",
        "nl",
        "se",
        "no",
        "es",
        "mil",
    ];

    api.TOP_LEVEL_DOMAINS_LIST = TOP_LEVEL_DOMAINS_LIST;

})(adguard.utils);


