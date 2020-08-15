/**
 * Test script for Safari content-blocking rules converter - advanced blocking
 */

/* global SafariContentBlockerConverter, QUnit, URL_FILTER_REGEXP_START_URL, _checkResult, jsonFromFilters */

QUnit.module('Advanced Blocking');
QUnit.test("Test single file converter", function (assert) {
    const result = jsonFromFilters([
        'ksl.com#?#.queue:-abp-has(.sponsored)',
        'example.org#%#alert(1);',
        `example.org#$#hide-if-has-and-matches-style 'd[id^="_"]' 'div > s' 'display: none'; hide-if-contains /.*/ .p 'a[href^="/ad__c?"]'`,
    ], 100, true, true);
    assert.ok(result);
});
QUnit.test("Test ignore advanced blocking param", async function (assert) {
    const rule = new adguard.rules.CssFilterRule('filmitorrent.xyz#$#.content { margin-top: 0!important; }');

    const result = await SafariContentBlockerConverter.convertArray([rule], null, false, false);
    assert.equal(result.errorsCount, 0);

    assert.ok(result.converted);
    const converted = JSON.parse(result.converted);
    assert.equal(converted.length, 0);

    assert.notOk(result.advancedBlocking);
    assert.notOk(result.advancedBlockingConvertedCount);
});

QUnit.module('Script rules');
QUnit.test("Script rules", async function (assert) {

    const rule = new adguard.rules.ScriptFilterRule('example.org,example-more.com#%#alert(1);', 0);
    const ruleTwo = new adguard.rules.ScriptFilterRule("~test.com#%#alert(2);");

    const result = await SafariContentBlockerConverter.convertArray([rule, ruleTwo], null, false, true);
    assert.equal(result.errorsCount, 0);

    const converted = JSON.parse(result.converted);
    assert.equal(converted.length, 0);

    const advancedBlocking = JSON.parse(result.advancedBlocking);
    assert.equal(advancedBlocking.length, 2);
    assert.equal(result.advancedBlockingConvertedCount, 2);

    assert.equal(advancedBlocking[0].trigger['url-filter'], ".*");
    assert.equal(advancedBlocking[0].trigger['if-domain'][0], "*example-more.com");
    assert.equal(advancedBlocking[0].trigger['if-domain'][1], "*example.org");
    assert.notOk(advancedBlocking[0].trigger['unless-domain']);
    assert.equal(advancedBlocking[0].action.type, "script");
    assert.equal(advancedBlocking[0].action.script, "alert(1);");

    assert.equal(advancedBlocking[1].trigger['url-filter'], ".*");
    assert.notOk(advancedBlocking[1].trigger['if-domain']);
    assert.equal(advancedBlocking[1].trigger['unless-domain'], "*test.com");
    assert.equal(advancedBlocking[1].action.type, "script");
    assert.equal(advancedBlocking[1].action.script, "alert(2);");
});

QUnit.test("Script rules exceptions", async function (assert) {

    let rule, exceptionRule, result, converted, advancedBlocking;

    rule = new adguard.rules.ScriptFilterRule("#%#window.__gaq = undefined;");
    exceptionRule = new adguard.rules.ScriptFilterRule("example.com#@%#window.__gaq = undefined;");

    result = await SafariContentBlockerConverter.convertArray([rule, exceptionRule], null, false, true);
    assert.equal(result.errorsCount, 0);
    converted = JSON.parse(result.converted);
    assert.equal(converted.length, 0);

    advancedBlocking = JSON.parse(result.advancedBlocking);
    assert.equal(advancedBlocking.length, 1);
    assert.equal(result.advancedBlockingConvertedCount, 1);

    assert.equal(advancedBlocking[0].trigger['url-filter'], ".*");
    assert.equal(advancedBlocking[0].trigger['unless-domain'], "*example.com");
    assert.equal(advancedBlocking[0].action.type, "script");
    assert.equal(advancedBlocking[0].action.script, "window.__gaq = undefined;");

    // jsinject rules
    rule = new adguard.rules.ScriptFilterRule('example.com#%#alert(1);', 0);
    exceptionRule = new adguard.rules.UrlFilterRule("@@||example.com^$jsinject");

    result = await SafariContentBlockerConverter.convertArray([rule, exceptionRule], null, false, true);
    assert.equal(result.errorsCount, 0);
    converted = JSON.parse(result.converted);
    assert.equal(converted.length, 0);

    advancedBlocking = JSON.parse(result.advancedBlocking);
    assert.equal(advancedBlocking.length, 2);
    assert.equal(result.advancedBlockingConvertedCount, 2);

    assert.equal(advancedBlocking[0].trigger['url-filter'], ".*");
    assert.equal(advancedBlocking[0].trigger['if-domain'], "*example.com");
    assert.equal(advancedBlocking[0].action.type, "script");
    assert.equal(advancedBlocking[0].action.script, "alert(1);");

    assert.equal(advancedBlocking[1].trigger['url-filter'], "^[htpsw]+:\\/\\/([a-z0-9-]+\\.)?example\\.com[/:&?]?");
    assert.equal(advancedBlocking[1].action.type, "ignore-previous-rules");
    assert.notOk(advancedBlocking[1].action.script);

    // document rules
    rule = new adguard.rules.ScriptFilterRule("example.com#%#alert(2);");
    exceptionRule = new adguard.rules.UrlFilterRule("@@||example.com^$document");

    result = await SafariContentBlockerConverter.convertArray([rule, exceptionRule], null, false, true);
    assert.equal(result.errorsCount, 0);
    converted = JSON.parse(result.converted);
    assert.equal(converted.length, 1);

    advancedBlocking = JSON.parse(result.advancedBlocking);
    assert.equal(advancedBlocking.length, 2);
    assert.equal(result.advancedBlockingConvertedCount, 2);

    assert.equal(advancedBlocking[0].trigger['url-filter'], ".*");
    assert.equal(advancedBlocking[0].trigger['if-domain'], "*example.com");
    assert.equal(advancedBlocking[0].action.type, "script");
    assert.equal(advancedBlocking[0].action.script, "alert(2);");

    assert.equal(advancedBlocking[1].trigger['url-filter'], ".*");
    assert.equal(advancedBlocking[1].trigger['if-domain'][0], "*example.com");
    assert.equal(advancedBlocking[1].action.type, "ignore-previous-rules");
    assert.notOk(advancedBlocking[1].action.script);
});

QUnit.module('Extended Css rules');
QUnit.test("Extended Css rules", async function (assert) {

    const rule = new adguard.rules.CssFilterRule('ksl.com#?#.queue:-abp-has(.sponsored)', 0);
    const ruleTwo = new adguard.rules.CssFilterRule('yelp.com#?#li[class^="domtags--li"]:-abp-has(a[href^="/adredir?"])');

    const result = await SafariContentBlockerConverter.convertArray([rule, ruleTwo], null, false, true);
    assert.equal(result.errorsCount, 0);

    const converted = JSON.parse(result.converted);
    assert.equal(converted.length, 0);

    const advancedBlocking = JSON.parse(result.advancedBlocking);
    assert.equal(advancedBlocking.length, 2);
    assert.equal(result.advancedBlockingConvertedCount, 2);

    assert.equal(advancedBlocking[0].trigger['url-filter'], ".*");
    assert.equal(advancedBlocking[0].trigger['if-domain'], "*ksl.com");
    assert.equal(advancedBlocking[0].action.type, "css");
    assert.equal(advancedBlocking[0].action.css, ".queue:-abp-has(.sponsored)");

    assert.equal(advancedBlocking[1].trigger['url-filter'], ".*");
    assert.equal(advancedBlocking[1].trigger['if-domain'], "*yelp.com");
    assert.equal(advancedBlocking[1].action.type, "css");
    assert.equal(advancedBlocking[1].action.css, "li[class^=\"domtags--li\"]:-abp-has(a[href^=\"/adredir?\"])");
});

QUnit.test("Extended Css rules exceptions", async function (assert) {

    let rule, exceptionRule, result, converted, advancedBlocking;

    // elemhide rules
    rule = new adguard.rules.CssFilterRule("ksl.com#?#.queue:-abp-has(.sponsored)");
    exceptionRule = new adguard.rules.UrlFilterRule("@@||ksl.com^$elemhide");

    result = await SafariContentBlockerConverter.convertArray([rule, exceptionRule], null, false, true);
    assert.equal(result.errorsCount, 0);
    converted = JSON.parse(result.converted);
    assert.equal(converted.length, 1);

    advancedBlocking = JSON.parse(result.advancedBlocking);
    assert.equal(advancedBlocking.length, 2);
    assert.equal(result.advancedBlockingConvertedCount, 2);

    assert.equal(advancedBlocking[0].trigger['url-filter'], ".*");
    assert.equal(advancedBlocking[0].trigger['if-domain'], "*ksl.com");
    assert.equal(advancedBlocking[0].action.type, "css");
    assert.equal(advancedBlocking[0].action.css, ".queue:-abp-has(.sponsored)");

    assert.equal(advancedBlocking[1].trigger['url-filter'], ".*");
    assert.equal(advancedBlocking[1].trigger['if-domain'][0], "*ksl.com");
    assert.equal(advancedBlocking[1].action.type, "ignore-previous-rules");
    assert.notOk(advancedBlocking[1].action.script);
    assert.notOk(advancedBlocking[1].action.css);

    // document rules
    rule = new adguard.rules.CssFilterRule("ksl.com#?#.queue:-abp-has(.sponsored)");
    exceptionRule = new adguard.rules.UrlFilterRule("@@||ksl.com^$document");

    result = await SafariContentBlockerConverter.convertArray([rule, exceptionRule], null, false, true);
    assert.equal(result.errorsCount, 0);
    converted = JSON.parse(result.converted);
    assert.equal(converted.length, 1);

    advancedBlocking = JSON.parse(result.advancedBlocking);
    assert.equal(advancedBlocking.length, 2);
    assert.equal(result.advancedBlockingConvertedCount, 2);

    assert.equal(advancedBlocking[0].trigger['url-filter'], ".*");
    assert.equal(advancedBlocking[0].trigger['if-domain'], "*ksl.com");
    assert.equal(advancedBlocking[0].action.type, "css");
    assert.equal(advancedBlocking[0].action.css, ".queue:-abp-has(.sponsored)");

    assert.equal(advancedBlocking[1].trigger['url-filter'], ".*");
    assert.equal(advancedBlocking[1].trigger['if-domain'][0], "*ksl.com");
    assert.equal(advancedBlocking[1].action.type, "ignore-previous-rules");
    assert.notOk(advancedBlocking[1].action.script);
    assert.notOk(advancedBlocking[1].action.css);
});

QUnit.module('Cosmetic css rules');
QUnit.test("Cosmetic css rules", async function (assert) {
    const rule = new adguard.rules.CssFilterRule('filmitorrent.xyz#$#.content { margin-top: 0!important; }');

    const result = await SafariContentBlockerConverter.convertArray([rule], null, false, true);
    assert.equal(result.errorsCount, 0);

    const converted = JSON.parse(result.converted);
    assert.equal(converted.length, 0);

    const advancedBlocking = JSON.parse(result.advancedBlocking);
    assert.equal(advancedBlocking.length, 1);
    assert.equal(result.advancedBlockingConvertedCount, 1);

    assert.equal(advancedBlocking[0].trigger['url-filter'], ".*");
    assert.equal(advancedBlocking[0].trigger['if-domain'], "*filmitorrent.xyz");
    assert.equal(advancedBlocking[0].action.type, "css");
    assert.equal(advancedBlocking[0].action.css, ".content { margin-top: 0!important; }");
});

QUnit.test("Cosmetic css rules invalids", async function (assert) {
    const rule = new adguard.rules.CssFilterRule('filmitorrent.xyz#$#.content { url("http://example.com/style.css") }');

    const result = await SafariContentBlockerConverter.convertArray([rule], null, false, true);
    assert.equal(result.errorsCount, 1);

    const converted = JSON.parse(result.converted);
    assert.equal(converted.length, 0);

    const advancedBlocking = JSON.parse(result.advancedBlocking);
    assert.equal(advancedBlocking.length, 0);
    assert.equal(result.advancedBlockingConvertedCount, 0);
});

QUnit.test("Cosmetic css exception rules", async function (assert) {
    const cssRule = 'example.com##h1';
    const cosmeticRule = 'example.com#$#div { max-height: 2px !important; }';
    const exceptionRule = 'example.com#@$#div { max-height: 2px !important; }';

    let result = await SafariContentBlockerConverter.convertArray([cssRule, exceptionRule], null, false, true);
    assert.equal(result.errorsCount, 0);

    let converted = JSON.parse(result.converted);
    assert.equal(converted.length, 1);

    let advancedBlocking = JSON.parse(result.advancedBlocking);
    assert.equal(advancedBlocking.length, 0);
    assert.equal(result.advancedBlockingConvertedCount, 0);

    result = await SafariContentBlockerConverter.convertArray([cosmeticRule, exceptionRule], null, false, true);
    assert.equal(result.errorsCount, 0);

    converted = JSON.parse(result.converted);
    assert.equal(converted.length, 0);

    advancedBlocking = JSON.parse(result.advancedBlocking);
    assert.equal(advancedBlocking.length, 0);
    assert.equal(result.advancedBlockingConvertedCount, 0);

    result = await SafariContentBlockerConverter.convertArray([cssRule, cosmeticRule, exceptionRule], null, false, true);
    assert.equal(result.errorsCount, 0);

    converted = JSON.parse(result.converted);
    assert.equal(converted.length, 1);

    advancedBlocking = JSON.parse(result.advancedBlocking);
    assert.equal(advancedBlocking.length, 0);
    assert.equal(result.advancedBlockingConvertedCount, 0);
});

QUnit.module('Scriptlet rules');
QUnit.test("Scriptlet adguard rule", async function (assert) {
    const ruleText = "example.org#%#//scriptlet('abort-on-property-read', 'I10C')";
    const rule = new adguard.rules.ScriptletRule(ruleText);

    const result = await SafariContentBlockerConverter.convertArray([rule], null, false, true);
    assert.equal(result.errorsCount, 0);

    const converted = JSON.parse(result.converted);
    assert.equal(converted.length, 0);

    const advancedBlocking = JSON.parse(result.advancedBlocking);
    assert.equal(advancedBlocking.length, 1);
    assert.equal(result.advancedBlockingConvertedCount, 1);

    assert.equal(advancedBlocking[0].trigger['url-filter'], ".*");
    assert.equal(advancedBlocking[0].trigger['if-domain'], "*example.org");
    assert.equal(advancedBlocking[0].action.type, "scriptlet");
    assert.equal(advancedBlocking[0].action.scriptlet, "abort-on-property-read");
    assert.equal(advancedBlocking[0].action.scriptletParam, "{\"name\":\"abort-on-property-read\",\"args\":[\"I10C\"]}");
});

QUnit.test("Scriptlet exception adguard rule", async function (assert) {
    const ruleText = "example.org#%#//scriptlet('abort-on-property-read', 'I10C')";
    const rule = new adguard.rules.ScriptletRule(ruleText);
    const exceptionRule = new adguard.rules.ScriptletRule("example.org#@%#//scriptlet('abort-on-property-read', 'I10C')");

    const result = await SafariContentBlockerConverter.convertArray([rule, exceptionRule], null, false, true);
    assert.equal(result.errorsCount, 0);

    const converted = JSON.parse(result.converted);
    assert.equal(converted.length, 0);

    const advancedBlocking = JSON.parse(result.advancedBlocking);
    assert.equal(advancedBlocking.length, 0);
    assert.equal(result.advancedBlockingConvertedCount, 0);
});

QUnit.test("Composite rule", async function (assert) {
    const ruleText = `example.org#$#hide-if-has-and-matches-style 'd[id^="_"]' 'div > s' 'display: none'; hide-if-contains /.*/ .p 'a[href^="/ad__c?"]'`;
    const compositeRule = adguard.rules.builder.createRule(ruleText);

    assert.ok(compositeRule);
    assert.ok(compositeRule instanceof adguard.rules.CompositeRule);

    const result = await SafariContentBlockerConverter.convertArray([compositeRule], null, false, true);
    assert.equal(result.errorsCount, 0);

    const converted = JSON.parse(result.converted);
    assert.equal(converted.length, 0);

    const advancedBlocking = JSON.parse(result.advancedBlocking);
    assert.equal(advancedBlocking.length, 2);
    assert.equal(result.advancedBlockingConvertedCount, 2);

    assert.equal(advancedBlocking[0].trigger['url-filter'], ".*");
    assert.equal(advancedBlocking[0].trigger['if-domain'], "*example.org");
    assert.equal(advancedBlocking[0].action.type, "scriptlet");
    assert.equal(advancedBlocking[0].action.scriptlet, "abp-hide-if-has-and-matches-style");
    assert.equal(advancedBlocking[0].action.scriptletParam, "{\"name\":\"abp-hide-if-has-and-matches-style\",\"args\":[\"d[id^=\\\\\\\"_\\\\\\\"]\",\"div > s\",\"display: none\"]}");

    assert.equal(advancedBlocking[1].trigger['url-filter'], ".*");
    assert.equal(advancedBlocking[1].trigger['if-domain'], "*example.org");
    assert.equal(advancedBlocking[1].action.type, "scriptlet");
    assert.equal(advancedBlocking[1].action.scriptlet, "abp-hide-if-contains");
    assert.equal(advancedBlocking[1].action.scriptletParam, "{\"name\":\"abp-hide-if-contains\",\"args\":[\"/.*/\",\".p\",\"a[href^=\\\\\\\"/ad__c?\\\\\\\"]\"]}");
});

QUnit.module('Rule converter');
QUnit.test('Test scriptlet adguard rule', function (assert) {
    const rule = "example.org#%#//scriptlet('abort-on-property-read', 'I10C')";
    const exp = "example.org#%#//scriptlet('abort-on-property-read', 'I10C')";
    const res = adguard.rules.ruleConverter.convertRule(rule);
    assert.equal(res, exp);
});
QUnit.test('Test scriptlet adguard rule exception', function (assert) {
    const rule = "example.org#@%#//scriptlet('abort-on-property-read', 'I10C')";
    const exp = "example.org#@%#//scriptlet('abort-on-property-read', 'I10C')";
    const res = adguard.rules.ruleConverter.convertRule(rule);
    assert.equal(res, exp);
});
QUnit.test('Test converter scriptlet ubo rule', function (assert) {
    const rule = "example.org##+js(setTimeout-defuser.js, [native code], 8000)";
    const exp = 'example.org#%#//scriptlet("ubo-setTimeout-defuser.js", "[native code]", "8000")';
    const res = adguard.rules.ruleConverter.convertRule(rule);
    assert.equal(res, exp);
});
QUnit.test('Test converter scriptlet abp rule', function (assert) {
    const rule = "example.org#$#hide-if-contains li.serp-item 'li.serp-item div.label'";
    const exp = 'example.org#%#//scriptlet("abp-hide-if-contains", "li.serp-item", "li.serp-item div.label")';
    const res = adguard.rules.ruleConverter.convertRule(rule);
    assert.equal(res, exp);
});
QUnit.test('Test converter scriptlet multiple abp rule', function (assert) {
    const rule = `example.org#$#hide-if-has-and-matches-style 'd[id^="_"]' 'div > s' 'display: none'; hide-if-contains /.*/ .p 'a[href^="/ad__c?"]'`;
    const exp1 = 'example.org#%#//scriptlet("abp-hide-if-has-and-matches-style", "d[id^=\\"_\\"]", "div > s", "display: none")';
    const exp2 = 'example.org#%#//scriptlet("abp-hide-if-contains", "/.*/", ".p", "a[href^=\\"/ad__c?\\"]")';
    const res = adguard.rules.ruleConverter.convertRule(rule);

    assert.equal(res.length, 2);
    assert.equal(res[0], exp1);
    assert.equal(res[1], exp2);
});
