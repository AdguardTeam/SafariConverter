/**
 * Test script for Safari content-blocking rules converter
 */

/* global SafariContentBlockerConverter, QUnit, URL_FILTER_REGEXP_START_URL, _checkResult, jsonFromFilters */

QUnit.test("Convert rules to JSON", async function (assert) {
    const safariJSON = await SafariContentBlockerConverter.convertArray(rules);
    const errors = [];
    _checkResult(safariJSON, errors);

    assert.equal(errors.length, 0);

    if (errors.length > 0) {
        var message = 'Errors: ' + errors.length + '\n';

        errors.forEach(function (e) {
            message += e;
            message += '\n';
        });

        assert.pushResult({
            result: false,
            actual: null,
            expected: null,
            message: message
        });
    }
});

QUnit.test("Convert a comment", async function(assert) {
    const ruleText = "! this is a comment";
    const result = await SafariContentBlockerConverter.convertArray([ruleText]);
    assert.equal(0, result.convertedCount);

    // Comments are simply ignored, that's why just a zero
    assert.equal(0, result.errorsCount);
});

QUnit.test("Convert a $network rule", async function(assert) {
    const ruleText = "127.0.0.1$network";
    const result = await SafariContentBlockerConverter.convertArray([ruleText]);

    assert.equal(0, result.convertedCount);
    assert.equal(1, result.errorsCount);
});

QUnit.test("Conversion of $popup and #document,popup rules", async function(assert) {
    const URL_START = '^[htpsw]+:\\/\\/([a-z0-9-]+\\.)?';
    let ruleText = [
        "||example1.com$document",
        "||example2.com$document,popup",
        "||example5.com$popup,document",
    ];
    let result = await SafariContentBlockerConverter.convertArray(ruleText);
    let converted = JSON.parse(result.converted);
    assert.equal(converted.length, 3);

    assert.equal(converted[0].trigger["resource-type"], 'document');
    assert.equal(converted[0].action["type"], 'block');
    assert.equal(Object.keys(converted[0]).length, 2);
    assert.equal(converted[0].trigger["url-filter"], URL_START + "example1\\.com");
    assert.equal(converted[1].trigger["resource-type"], 'document');
    assert.equal(converted[1].action["type"], 'block');
    assert.equal(Object.keys(converted[1]).length, 2);
    assert.equal(converted[1].trigger["url-filter"], URL_START + "example2\\.com");
    assert.equal(converted[2].trigger["resource-type"], 'document');
    assert.equal(converted[2].action["type"], 'block');
    assert.equal(Object.keys(converted[2]).length, 2);
    assert.equal(converted[2].trigger["url-filter"], URL_START + "example5\\.com");

    // conversion of $document rule
    ruleText = ["||example.com$document"];
    result = await SafariContentBlockerConverter.convertArray(ruleText);
    let expected =  [{
        "trigger": {
            "url-filter": URL_START + "example\\.com",
            "resource-type": [
                "document"
            ]
        },
        "action": {
            "type": "block"
        }
    }];
    converted = JSON.parse(result.converted);
    assert.deepEqual(converted, expected);

    // conversion of $document and $popup rule
    ruleText = ["||test.com$document,popup"];
    result = await SafariContentBlockerConverter.convertArray(ruleText);
    expected =  [{
        "trigger": {
            "url-filter": URL_START + "test\\.com",
            "resource-type": [
                "document"
            ]
        },
        "action": {
            "type": "block"
        }
    }];
    converted = JSON.parse(result.converted);
    assert.deepEqual(converted, expected);

    // conversion of $popup rule
    ruleText = ['||example.com^$popup'];
    result = await SafariContentBlockerConverter.convertArray(ruleText);
    expected =  [{
        "trigger": {
            "url-filter": URL_START + "example\\.com[/:&?]?",
            "resource-type": [
                "document"
            ]
        },
        "action": {
            "type": "block"
        }
    }];
    converted = JSON.parse(result.converted);
    assert.deepEqual(converted, expected);

    // conversion of $popup and third-party rule
    ruleText = ['||getsecuredfiles.com^$popup,third-party'];
    result = await SafariContentBlockerConverter.convertArray(ruleText);
    expected =  [{
        "trigger": {
            "url-filter": URL_START + "getsecuredfiles\\.com[/:&?]?",
            "resource-type": [
                "document"
            ],
            "load-type": [
                "third-party"
            ]
        },
        "action": {
            "type": "block"
        }
    }];
    converted = JSON.parse(result.converted);
    assert.deepEqual(converted, expected);
});

QUnit.test("Convert first-party rule", async function (assert) {
    const ruleText = "@@||adriver.ru^$~third-party";
    const result = await SafariContentBlockerConverter.convertArray([ruleText]);
    assert.equal(1, result.convertedCount);
    assert.equal(0, result.errorsCount);

    const converted = JSON.parse(result.converted);
    assert.equal(1, converted.length);

    const convertedRule = converted[0];
    assert.equal(URL_FILTER_REGEXP_START_URL + "adriver\\.ru[/:&?]?", convertedRule.trigger["url-filter"]);
    assert.notOk(convertedRule.trigger["if-domain"]);
    assert.notOk(convertedRule.trigger["unless-domain"]);
    assert.ok(convertedRule.trigger["load-type"]);
    assert.equal("first-party", convertedRule.trigger["load-type"][0]);
    assert.equal("ignore-previous-rules", convertedRule.action.type);
});

QUnit.test("Convert websocket rules", async function (assert) {
    var result = await SafariContentBlockerConverter.convertArray(["||test.com^$websocket"]);
    assert.equal(1, result.convertedCount);
    assert.equal(0, result.errorsCount);

    var converted = JSON.parse(result.converted);
    assert.equal(1, converted.length);

    var convertedRule = converted[0];
    assert.equal(URL_FILTER_REGEXP_START_URL + "test\\.com[/:&?]?", convertedRule.trigger["url-filter"]);
    assert.notOk(convertedRule.trigger["if-domain"]);
    assert.notOk(convertedRule.trigger["unless-domain"]);
    assert.notOk(convertedRule.trigger["load-type"]);
    assert.ok(convertedRule.trigger["resource-type"]);
    assert.equal("raw", convertedRule.trigger["resource-type"][0]);


    result = await SafariContentBlockerConverter.convertArray(["$websocket,domain=123movies.is"]);
    assert.equal(1, result.convertedCount);
    assert.equal(0, result.errorsCount);

    converted = JSON.parse(result.converted);
    assert.equal(1, converted.length);

    convertedRule = converted[0];
    assert.equal(convertedRule.trigger["url-filter"], URL_FILTER_WS_ANY_URL);
    assert.equal(convertedRule.trigger["if-domain"][0], "*123movies.is");
    assert.ok(convertedRule.trigger["resource-type"]);
    assert.equal(convertedRule.trigger["resource-type"][0], "raw");

    result = await SafariContentBlockerConverter.convertArray([".rocks^$third-party,websocket"]);
    assert.equal(1, result.convertedCount);
    assert.equal(0, result.errorsCount);

    converted = JSON.parse(result.converted);
    assert.equal(1, converted.length);

    convertedRule = converted[0];
    assert.equal(convertedRule.trigger["url-filter"], URL_FILTER_WS_ANY_URL + ".*\\.rocks" + URL_FILTER_REGEXP_SEPARATOR);
    assert.notOk(convertedRule.trigger["if-domain"]);
    assert.notOk(convertedRule.trigger["unless-domain"]);
    assert.equal(convertedRule.trigger["load-type"], "third-party");
    assert.ok(convertedRule.trigger["resource-type"]);
    assert.equal(convertedRule.trigger["resource-type"][0], "raw");
});

QUnit.test("Convert ~script rule", async function (assert) {
    const ruleText = "||test.com^$~script,third-party";
    const result = await SafariContentBlockerConverter.convertArray([ruleText]);
    assert.equal(1, result.convertedCount);
    assert.equal(0, result.errorsCount);

    const converted = JSON.parse(result.converted);
    assert.equal(1, converted.length);

    const convertedRule = converted[0];
    assert.equal(URL_FILTER_REGEXP_START_URL + "test\\.com[/:&?]?", convertedRule.trigger["url-filter"]);
    assert.notOk(convertedRule.trigger["if-domain"]);
    assert.notOk(convertedRule.trigger["unless-domain"]);
    assert.ok(convertedRule.trigger["load-type"]);
    assert.ok(convertedRule.trigger["resource-type"]);
    assert.equal(-1, convertedRule.trigger["resource-type"].indexOf("script"));
    assert.equal("third-party", convertedRule.trigger["load-type"][0]);
});

QUnit.test("Convert subdocument first-party rule", async function (assert) {
    const ruleText = "||youporn.com^$subdocument,~third-party";
    const result = await SafariContentBlockerConverter.convertArray([ruleText]);
    assert.equal(0, result.convertedCount);
    assert.equal(1, result.errorsCount);
});

QUnit.test("Convert subdocument third-party rule", async function (assert) {
    const ruleText = "||youporn.com^$subdocument,third-party";
    const result = await SafariContentBlockerConverter.convertArray([ruleText]);
    assert.equal(1, result.convertedCount);
    assert.equal(0, result.errorsCount);

    const converted = JSON.parse(result.converted);
    assert.equal(1, converted.length);

    const convertedRule = converted[0];
    assert.equal(URL_FILTER_REGEXP_START_URL + "youporn\\.com[/:&?]?", convertedRule.trigger["url-filter"]);
    assert.notOk(convertedRule.trigger["if-domain"]);
    assert.notOk(convertedRule.trigger["unless-domain"]);
    assert.ok(convertedRule.trigger["load-type"]);
    assert.ok(convertedRule.trigger["resource-type"]);
    assert.equal("third-party", convertedRule.trigger["load-type"][0]);
    assert.equal("document", convertedRule.trigger["resource-type"][0]);
    assert.equal("block", convertedRule.action.type);
});

QUnit.test("Convert rule with empty regexp", async function (assert) {
    const ruleText = "@@$image,domain=moonwalk.cc";
    const result = await SafariContentBlockerConverter.convertArray([ruleText]);
    assert.equal(1, result.convertedCount);
    assert.equal(0, result.errorsCount);
    const converted = JSON.parse(result.converted);
    assert.equal(1, converted.length);

    const convertedRule = converted[0];
    assert.equal(URL_FILTER_ANY_URL, convertedRule.trigger["url-filter"]);
    assert.equal(1, convertedRule.trigger["if-domain"].length);
    assert.equal("*moonwalk.cc", convertedRule.trigger["if-domain"][0]);
    assert.equal(1, convertedRule.trigger["resource-type"].length);
    assert.equal("image", convertedRule.trigger["resource-type"][0]);
    assert.equal("ignore-previous-rules", convertedRule.action.type);
});

QUnit.test("Inverted whitelist", async function (assert) {
    const ruleText = "@@||*$domain=~whitelisted.domain.com|~whitelisted.domain2.com";
    const result = await SafariContentBlockerConverter.convertArray([ruleText]);
    assert.equal(1, result.convertedCount);
    assert.equal(0, result.errorsCount);
    const converted = JSON.parse(result.converted);
    assert.equal(1, converted.length);

    const convertedRule = converted[0];
    assert.equal(URL_FILTER_ANY_URL, convertedRule.trigger["url-filter"]);
    assert.equal(2, convertedRule.trigger["unless-domain"].length);
    assert.equal("*whitelisted.domain2.com", convertedRule.trigger["unless-domain"][0]);
    assert.equal("*whitelisted.domain.com", convertedRule.trigger["unless-domain"][1]);
    assert.equal("ignore-previous-rules", convertedRule.action.type);
});

QUnit.test("Generichide rules", async function (assert) {
    const ruleText = '@@||hulu.com/page$generichide';

    const result = await SafariContentBlockerConverter.convertArray([ruleText]);
    assert.equal(1, result.convertedCount);
    assert.equal(0, result.errorsCount);
    const converted = JSON.parse(result.converted);
    assert.equal(1, converted.length);

    const convertedRule = converted[0];
    assert.equal(convertedRule.action.type, "ignore-previous-rules");
    assert.equal(convertedRule.trigger["url-filter"], URL_FILTER_REGEXP_START_URL + 'hulu\\.com\\/page');
});

QUnit.test("Generic domain sensitive rules", async function (assert) {
    const ruleText = '~google.com##banner';

    const result = await SafariContentBlockerConverter.convertArray([ruleText]);
    assert.equal(1, result.convertedCount);
    assert.equal(0, result.errorsCount);
    const converted = JSON.parse(result.converted);
    assert.equal(1, converted.length);

    const convertedRule = converted[0];
    assert.equal(convertedRule.action.type, "css-display-none");
    assert.equal(convertedRule.trigger["unless-domain"], '*google.com');
    assert.equal(convertedRule.trigger["url-filter"], URL_FILTER_CSS_RULES);
});

QUnit.test("Generic domain sensitive rules sorting order", async function (assert) {
    const result = await SafariContentBlockerConverter.convertArray(['~example.org##generic', '##wide1', '##specific', '@@||example.org^$generichide']);
    assert.equal(result.convertedCount, 3);
    assert.equal(result.errorsCount, 0);
    const converted = JSON.parse(result.converted);
    assert.equal(converted.length, 3);

    assert.equal(converted[0].action.selector, "wide1, specific");
    assert.equal(converted[0].action.type, "css-display-none");
    assert.equal(converted[0].trigger["url-filter"], URL_FILTER_CSS_RULES);

    assert.equal(converted[1].action.selector, "generic");
    assert.equal(converted[1].action.type, "css-display-none");
    assert.equal(converted[1].trigger["unless-domain"], '*example.org');
    assert.equal(converted[1].trigger["url-filter"], URL_FILTER_CSS_RULES);

    assert.equal(converted[2].action.type, "ignore-previous-rules");
    assert.equal(converted[2].trigger["url-filter"], URL_FILTER_URL_RULES_EXCEPTIONS);
    assert.equal(converted[2].trigger["if-domain"], '*example.org');
});

QUnit.test("Generic domain sensitive rules sorting order - generichide", async function (assert) {
    const result = await SafariContentBlockerConverter.convertArray(['###generic', '@@||example.org^$generichide']);
    assert.equal(result.convertedCount, 2);
    assert.equal(result.errorsCount, 0);
    const converted = JSON.parse(result.converted);
    assert.equal(converted.length, 2);

    assert.equal(converted[0].action.selector, "#generic");
    assert.equal(converted[0].action.type, "css-display-none");
    assert.equal(converted[0].trigger["url-filter"], URL_FILTER_CSS_RULES);

    assert.equal(converted[1].action.type, "ignore-previous-rules");
    assert.equal(converted[1].trigger["url-filter"], URL_FILTER_URL_RULES_EXCEPTIONS);
    assert.equal(converted[1].trigger["if-domain"], '*example.org');
});

QUnit.test("Generic domain sensitive rules sorting order - elemhide", async function (assert) {
    const result = await SafariContentBlockerConverter.convertArray(['example.org###generic', '@@||example.org^$elemhide']);
    assert.equal(result.convertedCount, 2);
    assert.equal(result.errorsCount, 0);
    const converted = JSON.parse(result.converted);
    assert.equal(converted.length, 2);

    assert.equal(converted[0].action.selector, "#generic");
    assert.equal(converted[0].action.type, "css-display-none");
    assert.equal(converted[0].trigger["if-domain"], '*example.org');
    assert.equal(converted[0].trigger["url-filter"], URL_FILTER_CSS_RULES);

    assert.equal(converted[1].action.type, "ignore-previous-rules");
    assert.equal(converted[1].trigger["url-filter"], URL_FILTER_URL_RULES_EXCEPTIONS);
    assert.equal(converted[1].trigger["if-domain"], '*example.org');
});

QUnit.test("Convert cyrillic rules", async function (assert) {
    const ruleText = 'меил.рф';
    const ruleTextMarkedDomain = '||меил.рф';

    const result = await SafariContentBlockerConverter.convertArray([ruleText, ruleTextMarkedDomain]);
    assert.equal(2, result.convertedCount);
    assert.equal(0, result.errorsCount);
    const converted = JSON.parse(result.converted);
    assert.equal(2, converted.length);

    assert.equal(converted[0].trigger["url-filter"], "xn--e1agjb\\.xn--p1ai");
    assert.equal(converted[1].trigger["url-filter"], URL_FILTER_REGEXP_START_URL + "xn--e1agjb\\.xn--p1ai");
});

QUnit.test("Convert regexp rules", async function (assert) {
    var ruleText = "/^https?://(?!static\.)([^.]+\.)+?fastpic\.ru[:/]/$script,domain=fastpic.ru";
    var result = await SafariContentBlockerConverter.convertArray([ruleText]);
    assert.equal(0, result.convertedCount);
    assert.equal(1, result.errorsCount);

    ruleText = "^https?://(?!static)([^.]+)+?fastpicru[:/]$script,domain=fastpic.ru";
    result = await SafariContentBlockerConverter.convertArray([ruleText]);
    assert.equal(1, result.convertedCount);
    assert.equal(0, result.errorsCount);

    ruleText = "@@/:\/\/.*[.]wp[.]pl\/[a-z0-9_]{30,50}[.][a-z]{2,5}[/:&?]?/";
    result = await SafariContentBlockerConverter.convertArray([ruleText]);
    assert.equal(0, result.convertedCount);
    assert.equal(1, result.errorsCount);

    ruleText = "@@/:\/\/.*[.]wp[.]pl\/[a-z0-9_]+[.][a-z]+\\b/";
    result = await SafariContentBlockerConverter.convertArray([ruleText]);
    assert.equal(0, result.convertedCount);
    assert.equal(1, result.errorsCount);
});

QUnit.test("CSS pseudo classes", async function (assert) {
    // Valid selectors
    var result = await SafariContentBlockerConverter.convertArray([
        'w3schools.com###main > table.w3-table-all.notranslate:first-child > tbody > tr:nth-child(17) > td.notranslate:nth-child(2)',
        'w3schools.com###:root div.ads',
        "w3schools.com###body div[attr='test']:first-child  div",
        'w3schools.com##.todaystripe::after'
    ]);
    assert.equal(4, result.convertedCount);
    assert.equal(0, result.errorsCount);
});

QUnit.test("Regular expressions performance", function (assert) {

    function _testCompare(regExp1, regExp2, count) {
        const startTime1 = new Date().getTime();
        _testRegex(regExp1, count);

        const startTime2 = new Date().getTime();
        _testRegex(regExp2, count);

        const elapsed1 = startTime2 - startTime1;
        const elapsed2 = new Date().getTime() - startTime2;

        const diff = Math.round((elapsed1 - elapsed2) / elapsed1 * 100);
        assert.ok(1, 'Performance gain: ' + diff + '%');
    }

    function _testRegex(regExp, count) {

        const testUrl = 'http://www.some-domain.com/some-very/long/path/here/';
        const startTime = new Date().getTime();
        for (var i = 0; i < count; i++) {
            regExp.test(testUrl);
        }
        const elapsed = new Date().getTime() - startTime;
        assert.ok(1, 'Elapsed: ' + elapsed + 'ms');
    }

    const count = 1000 * 1000;

    // Test URL with domain rule
    const regExp1 = new RegExp('^https?://([a-z0-9-_.]+\\.)?some-domain.com\\.com([^ a-zA-Z0-9.%]|$)', 'i');
    const regExp2 = new RegExp('^https?://[^.]+\\.?some-domain.com\\.com[/:&?]?', 'i');
    const regExp3 = new RegExp('^https?://([^/]*\\.)?some-domain.com\\.com[/:&?]?', 'i');
    const regExp4 = new RegExp('^https?://[^/]*\\.?some-domain.com\\.com[/:&?]?', 'i');
    _testCompare(regExp1, regExp2, count);
    _testCompare(regExp1, regExp3, count);
    _testCompare(regExp1, regExp4, count);
});

QUnit.test("Content Blocker RegExp Problem", async function (assert) {

    const rule = new adguard.rules.UrlFilterRule('@@||4players.de^$genericblock', 0);

    var result = await SafariContentBlockerConverter.convertArray([rule]);
    assert.equal(result.errorsCount, 0);

    // Initialize regexp (while processing request from content script for example)
    assert.ok(!!rule.getUrlRegExp());

    // Convert again
    result = await SafariContentBlockerConverter.convertArray([rule]);
    assert.equal(result.errorsCount, 0);
});

QUnit.test("UpperCase domains", async function (assert) {

    const rule = new adguard.rules.UrlFilterRule('@@||UpperCase.test^$genericblock', 0);

    const result = await SafariContentBlockerConverter.convertArray([rule]);
    assert.equal(result.errorsCount, 0);

    const converted = JSON.parse(result.converted);
    assert.equal(1, converted.length);

    assert.equal(converted[0].trigger["if-domain"], "*uppercase.test");
});

QUnit.test("CSP rules", async function (assert) {

    const rule = new adguard.rules.UrlFilterRule('|blob:$script,domain=pornhub.com|xhamster.com|youporn.com', 0);

    const result = await SafariContentBlockerConverter.convertArray([rule]);
    assert.equal(result.errorsCount, 0);
    assert.equal(result.convertedCount, 1);
});

QUnit.test("Elemhide rules", async function (assert) {

    const ruleCss = new adguard.rules.CssFilterRule('lenta.ru###root > section.b-header.b-header-main.js-header:nth-child(4) > div.g-layout > div.row', 0);
    const ruleBlockingUrl = new adguard.rules.UrlFilterRule('https://icdn.lenta.ru/images/2017/04/10/16/20170410160659586/top7_f07b6db166774abba29e0de2e335f50a.jpg', 0);
    const ruleElemhide = new adguard.rules.UrlFilterRule('@@||lenta.ru^$elemhide', 0);
    const ruleElemhideGenericBlock = new adguard.rules.UrlFilterRule('@@||lenta.ru^$elemhide,genericblock', 0);

    const result = await SafariContentBlockerConverter.convertArray([ruleCss, ruleBlockingUrl, ruleElemhide, ruleElemhideGenericBlock]);
    assert.equal(result.errorsCount, 0);

    const converted = JSON.parse(result.converted);
    assert.equal(4, converted.length);

    assert.equal(converted[0].action.selector, "#root > section.b-header.b-header-main.js-header:nth-child(4) > div.g-layout > div.row");
    assert.equal(converted[0].action.type, "css-display-none");

    assert.equal(converted[1].trigger["url-filter"], URL_FILTER_URL_RULES_EXCEPTIONS);
    assert.equal(converted[1].trigger["if-domain"], "*lenta.ru");
    assert.equal(converted[1].action.type, "ignore-previous-rules");

    assert.equal(converted[2].trigger["url-filter"], "https:\\/\\/icdn\\.lenta\\.ru\\/images\\/2017\\/04\\/10\\/16\\/20170410160659586\\/top7_f07b6db166774abba29e0de2e335f50a\\.jpg");
    assert.equal(converted[2].action.type, "block");

    assert.equal(converted[3].action.type, "ignore-previous-rules");
    assert.equal(converted[3].trigger["url-filter"], URL_FILTER_REGEXP_START_URL + "lenta\\.ru[/:&?]?");
});

QUnit.test("Important modifier rules sorting order", async function(assert) {
    const result = await SafariContentBlockerConverter.convertArray([
        '||example-url-block.org^',
        '||example-url-block-important.org^$important',
        '@@||example-url-block-exception.org^',
        '@@||example-url-block-exception-important.org^$important',
        '@@||example-url-block-exception-document.org^$document']);
    assert.equal(result.convertedCount, 5);
    assert.equal(result.errorsCount, 0);
    const converted = JSON.parse(result.converted);
    assert.equal(converted.length, 5);

    assert.equal(converted[0].action.type, "block");
    assert.equal(converted[0].trigger["url-filter"], URL_FILTER_REGEXP_START_URL + "example-url-block\\.org[/:&?]?");

    assert.equal(converted[1].action.type, "ignore-previous-rules");
    assert.equal(converted[1].trigger["url-filter"], URL_FILTER_REGEXP_START_URL + "example-url-block-exception\\.org[/:&?]?");

    assert.equal(converted[2].action.type, "block");
    assert.equal(converted[2].trigger["url-filter"], URL_FILTER_REGEXP_START_URL + "example-url-block-important\\.org[/:&?]?");

    assert.equal(converted[3].action.type, "ignore-previous-rules");
    assert.equal(converted[3].trigger["url-filter"], URL_FILTER_REGEXP_START_URL + "example-url-block-exception-important\\.org[/:&?]?");

    assert.equal(converted[4].action.type, "ignore-previous-rules");
    assert.equal(converted[4].trigger["url-filter"], URL_FILTER_URL_RULES_EXCEPTIONS);
    assert.equal(converted[4].trigger["if-domain"], "*example-url-block-exception-document.org");
});

QUnit.test("BadFilter rules", async function (assert) {

    const rule = new adguard.rules.UrlFilterRule('||example.org^$image', 0);
    const ruleTwo = new adguard.rules.UrlFilterRule("||test.org^");
    const badFilterRule = new adguard.rules.UrlFilterRule("||example.org^$badfilter,image");

    const result = await SafariContentBlockerConverter.convertArray([rule, ruleTwo, badFilterRule]);
    assert.equal(result.errorsCount, 0);

    const converted = JSON.parse(result.converted);
    assert.equal(converted.length, 1);
    assert.equal(converted[0].trigger['url-filter'], URL_FILTER_REGEXP_START_URL + "test\\.org[/:&?]?");

});

QUnit.test("TLD wildcard rules", async function (assert) {

    let rule = new adguard.rules.CssFilterRule('testcases.adguard.*,surge.*###case-5-wildcard-for-tld > .test-banner');

    let result = await SafariContentBlockerConverter.convertArray([rule]);
    assert.equal(result.errorsCount, 0);

    let converted = JSON.parse(result.converted);
    assert.equal(converted.length, 1);
    assert.equal(converted[0].trigger['url-filter'], URL_FILTER_CSS_RULES);
    assert.equal(converted[0].trigger["if-domain"][0], "*surge.com");
    assert.equal(converted[0].trigger["if-domain"][1], "*surge.org");
    assert.equal(converted[0].trigger["if-domain"][2], "*surge.ru");
    assert.equal(converted[0].trigger["if-domain"][99], "*surge.sh");
    assert.equal(converted[0].trigger["if-domain"][100], "*testcases.adguard.com");
    assert.equal(converted[0].trigger["if-domain"][101], "*testcases.adguard.org");
    assert.equal(converted[0].trigger["if-domain"][199], "*testcases.adguard.sh");

    rule = new adguard.rules.UrlFilterRule('||*/test-files/adguard.png$domain=testcases.adguard.*|surge.*');

    result = await SafariContentBlockerConverter.convertArray([rule]);
    assert.equal(result.errorsCount, 0);

    converted = JSON.parse(result.converted);
    assert.equal(converted.length, 1);
    assert.equal(converted[0].trigger['url-filter'], URL_FILTER_REGEXP_START_URL + '.*\\/test-files\\/adguard\\.png');
    assert.equal(converted[0].trigger["if-domain"][0], "*surge.com");
    assert.equal(converted[0].trigger["if-domain"][1], "*surge.org");
    assert.equal(converted[0].trigger["if-domain"][2], "*surge.ru");
    assert.equal(converted[0].trigger["if-domain"][99], "*surge.sh");
    assert.equal(converted[0].trigger["if-domain"][100], "*testcases.adguard.com");
    assert.equal(converted[0].trigger["if-domain"][101], "*testcases.adguard.org");
    assert.equal(converted[0].trigger["if-domain"][199], "*testcases.adguard.sh");

    rule = new adguard.rules.UrlFilterRule('|http$script,domain=forbes.*');

    result = await SafariContentBlockerConverter.convertArray([rule]);
    assert.equal(result.errorsCount, 0);

    converted = JSON.parse(result.converted);
    assert.equal(converted.length, 1);
    assert.equal(converted[0].trigger["url-filter"], "^http");
    assert.equal(converted[0].trigger["resource-type"][0], "script");
    assert.equal(converted[0].trigger["if-domain"][0], "*forbes.com");
    assert.equal(converted[0].trigger["if-domain"][1], "*forbes.org");
    assert.equal(converted[0].trigger["if-domain"][2], "*forbes.ru");
    assert.equal(converted[0].trigger["if-domain"][99], "*forbes.sh");
    assert.equal(converted[0].action.type, "block");
});

QUnit.test("Test single file converter", async function (assert) {
    const result = await jsonFromFilters(['test.com', 'domain.com###banner'], 100, true);
    assert.ok(result);
});

QUnit.test("Test css blocking rules with more then 250 domains", async function (assert) {

    const rule = "10daily.com.au,2gofm.com.au,923thefox.com,abajournal.com,abovethelaw.com,adn.com,advosports.com,adyou.me,androidfirmwares.net,aroundosceola.com,autoaction.com.au,autos.ca,autotrader.ca,ballstatedaily.com,baydriver.co.nz,bellinghamherald.com,bestproducts.com,birdmanstunna.com,blitzcorner.com,bnd.com,bradenton.com,browardpalmbeach.com,cantbeunseen.com,carynews.com,centredaily.com,chairmanlol.com,citymetric.com,citypages.com,claytonnewsstar.com,clicktogive.com,clinicaltrialsarena.com,coastandcountrynews.co.nz,cokeandpopcorn.com,commercialappeal.com,cosmopolitan.co.uk,cosmopolitan.com,cosmopolitan.in,cosmopolitan.ng,courierpress.com,cprogramming.com,dailynews.co.zw,dallasobserver.com,digitalspy.com,directupload.net,dispatch.com,diyfail.com,docspot.com,donchavez.com,driving.ca,dummies.com,edmunds.com,electrek.co,elledecor.com,energyvoice.com,enquirerherald.com,esquire.com,explainthisimage.com,expressandstar.com,film.com,foodista.com,fortmilltimes.com,forums.thefashionspot.com,fox.com.au,fox1150.com,fresnobee.com,funnyexam.com,funnytipjars.com,galatta.com,gamesindustry.biz,gamesville.com,geek.com,givememore.com.au,gmanetwork.com,goldenpages.be,goldfm.com.au,goodhousekeeping.com,gosanangelo.com,guernseypress.com,hardware.info,heart1073.com.au,heraldonline.com,hi-mag.com,hit105.com.au,hit107.com,hot1035.com,hot1035radio.com,hotfm.com.au,hourdetroit.com,housebeautiful.com,houstonpress.com,hypegames.com,iamdisappoint.com,idahostatesman.com,idello.org,imedicalapps.com,independentmail.com,indie1031.com,intomobile.com,ioljobs.co.za,irishexaminer.com,islandpacket.com,itnews.com.au,japanisweird.com,jerseyeveningpost.com,kentucky.com,keysnet.com,kidspot.com.au,kitsapsun.com,knoxnews.com,kofm.com.au,lakewyliepilot.com,laweekly.com,ledger-enquirer.com,legion.org,lgbtqnation.com,lifezette.com,lolhome.com,lonelyplanet.com,lsjournal.com,mac-forums.com,macon.com,mapcarta.com,marieclaire.co.za,marieclaire.com,marinmagazine.com,mcclatchydc.com,medicalnewstoday.com,mercedsunstar.com,meteovista.co.uk,meteovista.com,miaminewtimes.com,milesplit.com,mix.com.au,modbee.com,monocle.com,morefailat11.com,myrtlebeachonline.com,nameberry.com,naplesnews.com,nature.com,nbl.com.au,newarkrbp.org,newsobserver.com,newstatesman.com,nowtoronto.com,nxfm.com.au,objectiface.com,onnradio.com,openfile.ca,organizedwisdom.com,overclockers.com,passedoutphotos.com,pehub.com,peoplespharmacy.com,perfectlytimedphotos.com,phoenixnewtimes.com,photographyblog.com,pinknews.co,pons.com,pons.eu,radiowest.com.au,readamericanfootball.com,readarsenal.com,readastonvilla.com,readbasketball.com,readbetting.com,readbournemouth.com,readboxing.com,readbrighton.com,readbundesliga.com,readburnley.com,readcars.co,readceltic.com,readchampionship.com,readchelsea.com,readcricket.com,readcrystalpalace.com,readeverton.com,readeverything.co,readfashion.co,readfilm.co,readfood.co,readfootball.co,readgaming.co,readgolf.com,readhorseracing.com,readhuddersfield.com,readhull.com,readinternationalfootball.com,readlaliga.com,readleicester.com,readliverpoolfc.com,readmancity.com,readmanutd.com,readmiddlesbrough.com,readmma.com,readmotorsport.com,readmusic.co,readnewcastle.com,readnorwich.com,readnottinghamforest.com,readolympics.com,readpl.com,readrangers.com,readrugbyunion.com,readseriea.com,readshowbiz.co,readsouthampton.com,readsport.co,readstoke.com,readsunderland.com,readswansea.com,readtech.co,readtennis.co,readtottenham.com,readtv.co,readussoccer.com,readwatford.com,readwestbrom.com,readwestham.com,readwsl.com,rebubbled.com,recode.net,redding.com,reporternews.com,roadandtrack.com,roadrunner.com,roulettereactions.com,rr.com,sacarfan.co.za,sanluisobispo.com,scifinow.co.uk,seafm.com.au,searchenginesuggestions.com,shinyshiny.tv,shitbrix.com,shocktillyoudrop.com,shropshirestar.com,slashdot.org,slideshare.net,southerncrossten.com.au,space.com,spacecast.com,sparesomelol.com,spoiledphotos.com,sportsnet.ca,sportsvite.com,starfm.com.au,stopdroplol.com,straitstimes.com,stripes.com,stv.tv,sunfm.com.au,sunherald.com,supersport.com,tattoofailure.com,tbreak.com,tcpalm.com,techdigest.tv,techzim.co.zw,terra.com,theatermania.com,thecrimson.com,thejewishnews.com,thenewstribune.com,theolympian.com,therangecountry.com.au,theriver.com.au,theskanner.com,thestar.com.my,thestate.com,timescolonist.com,timesrecordnews.com,titantv.com,treehugger.com,tri-cityherald.com,triplem.com.au,triplemclassicrock.com,tutorialrepublic.com,tvfanatic.com,uswitch.com,vcstar.com,villagevoice.com,vivastreet.co.uk,walyou.com,waterline.co.nz,westword.com,where.ca,wired.com,wmagazine.com,yodawgpics.com,yoimaletyoufinish.com##.leaderboard";
    const adgRule = new adguard.rules.CssFilterRule(rule);

    const result = await SafariContentBlockerConverter.convertArray([adgRule]);
    assert.equal(result.errorsCount, 0);

    const converted = JSON.parse(result.converted);
    assert.equal(converted.length, 2);
    // ToDo: add more asserts
});