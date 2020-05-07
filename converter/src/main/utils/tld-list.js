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
        'com',
        'org',
        'ru',
        'net',
        'de',
        'com.br',
        'ir',
        'co.uk',
        'pl',
        'it',
        'com.au',
        'fr',
        'info',
        'in',
        'cz',
        'es',
        'io',
        'jp',
        'ro',
        'nl',
        'gr',
        'co',
        'ca',
        'eu',
        'ch',
        'com.tw',
        'se',
        'sk',
        'hu',
        'me',
        'co.za',
        'no',
        'tv',
        'dk',
        'at',
        'co.jp',
        'edu',
        'be',
        'cn',
        'co.kr',
        'com.ar',
        'com.ua',
        'cl',
        'biz',
        'xyz',
        'com.mx',
        'fi',
        'us',
        'vn',
        'pt',
        'com.tr',
        'club',
        'ie',
        'pro',
        'online',
        'co.in',
        'ua',
        'org.uk',
        'cc',
        'az',
        'by',
        'mx',
        'tw',
        'co.il',
        'gov.in',
        'com.cn',
        'kz',
        'bg',
        'lt',
        'site',
        'su',
        'hr',
        'org.br',
        'gov',
        'com.pl',
        'co.nz',
        'si',
        'top',
        'ac.in',
        'com.hk',
        'com.sg',
        'rs',
        'com.co',
        'kr',
        'co.id',
        'pw',
        'uz',
        'com.my',
        'ae',
        'nic.in',
        'com.vn',
        'hk',
        'org.au',
        'tk',
        'lv',
        'live',
        'to',
        'mobi',
        'gov.cn',
        'sh'
    ];

    api.TOP_LEVEL_DOMAINS_LIST = TOP_LEVEL_DOMAINS_LIST;

})(adguard.utils);


