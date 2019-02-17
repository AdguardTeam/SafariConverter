/**
 * Test script for Safari content-blocking rules converter - advanced blocking
 */

/* global SafariContentBlockerConverter, QUnit, URL_FILTER_REGEXP_START_URL, _checkResult, jsonFromFilters */

QUnit.test("Script rules", function (assert) {

    const rule = new adguard.rules.ScriptFilterRule('example.org,example-more.com#%#alert(1);', 0);
    const ruleTwo = new adguard.rules.ScriptFilterRule("~test.com#%#alert(2);");

    const result = SafariContentBlockerConverter.convertArray([rule, ruleTwo]);
    assert.equal(result.errorsCount, 0);

    const converted = JSON.parse(result.converted);
    assert.equal(converted.length, 0);

    const advancedBlocking = JSON.parse(result.advancedBlocking);
    assert.equal(advancedBlocking.length, 2);

    assert.equal(advancedBlocking[0].trigger['url-filter'], ".*");
    assert.equal(advancedBlocking[0].trigger['if-domain'][0], "example-more.com");
    assert.equal(advancedBlocking[0].trigger['if-domain'][1], "example.org");
    assert.notOk(advancedBlocking[0].trigger['unless-domain']);
    assert.equal(advancedBlocking[0].action.type, "script");
    assert.equal(advancedBlocking[0].action.script, "alert(1);");

    assert.equal(advancedBlocking[1].trigger['url-filter'], ".*");
    assert.notOk(advancedBlocking[1].trigger['if-domain']);
    assert.equal(advancedBlocking[1].trigger['unless-domain'], "test.com");
    assert.equal(advancedBlocking[1].action.type, "script");
    assert.equal(advancedBlocking[1].action.script, "alert(2);");
});

QUnit.test("Extended Css rules", function (assert) {

    const rule = new adguard.rules.CssFilterRule('ksl.com#?#.queue:-abp-has(.sponsored)', 0);
    const ruleTwo = new adguard.rules.CssFilterRule('yelp.com#?#li[class^="domtags--li"]:-abp-has(a[href^="/adredir?"])');

    const result = SafariContentBlockerConverter.convertArray([rule, ruleTwo]);
    assert.equal(result.errorsCount, 0);

    const converted = JSON.parse(result.converted);
    assert.equal(converted.length, 0);

    const advancedBlocking = JSON.parse(result.advancedBlocking);
    assert.equal(advancedBlocking.length, 2);

    assert.equal(advancedBlocking[0].trigger['url-filter'], ".*");
    assert.equal(advancedBlocking[0].trigger['if-domain'], "ksl.com");
    assert.equal(advancedBlocking[0].action.type, "css");
    assert.equal(advancedBlocking[0].action.css, ".queue:-abp-has(.sponsored)");

    assert.equal(advancedBlocking[1].trigger['url-filter'], ".*");
    assert.equal(advancedBlocking[1].trigger['if-domain'], "yelp.com");
    assert.equal(advancedBlocking[1].action.type, "css");
    assert.equal(advancedBlocking[1].action.css, "li[class^=\"domtags--li\"]:-abp-has(a[href^=\"/adredir?\"])");
});

QUnit.test("Script rules exceptions", function (assert) {

    let rule, exceptionRule, result, converted, advancedBlocking;

    //TODO: Fix script exceptions
    rule = new adguard.rules.ScriptFilterRule("#%#window.__gaq = undefined;");
    exceptionRule = new adguard.rules.ScriptFilterRule("example.com#@%#window.__gaq = undefined;");

    result = SafariContentBlockerConverter.convertArray([rule, exceptionRule]);
    assert.equal(result.errorsCount, 0);
    converted = JSON.parse(result.converted);
    assert.equal(converted.length, 0);

    advancedBlocking = JSON.parse(result.advancedBlocking);
    assert.equal(advancedBlocking.length, 2);

    assert.equal(advancedBlocking[0].trigger['url-filter'], ".*");
    assert.equal(advancedBlocking[0].action.type, "script");
    assert.equal(advancedBlocking[0].action.script, "window.__gaq = undefined;");

    assert.equal(advancedBlocking[1].trigger['url-filter'], ".*");
    assert.equal(advancedBlocking[1].trigger['if-domain'], "example.com");
    assert.equal(advancedBlocking[1].action.type, "ignore-previous-rules");
    assert.notOk(advancedBlocking[1].action.script);

    // jsinject rules
    rule = new adguard.rules.ScriptFilterRule('example.com#%#alert(1);', 0);
    exceptionRule = new adguard.rules.UrlFilterRule("@@||example.com^$jsinject");

    result = SafariContentBlockerConverter.convertArray([rule, exceptionRule]);
    assert.equal(result.errorsCount, 0);
    converted = JSON.parse(result.converted);
    assert.equal(converted.length, 0);

    advancedBlocking = JSON.parse(result.advancedBlocking);
    assert.equal(advancedBlocking.length, 2);

    assert.equal(advancedBlocking[0].trigger['url-filter'], ".*");
    assert.equal(advancedBlocking[0].trigger['if-domain'], "example.com");
    assert.equal(advancedBlocking[0].action.type, "script");
    assert.equal(advancedBlocking[0].action.script, "alert(1);");

    assert.equal(advancedBlocking[1].trigger['url-filter'], "^[htpsw]+:\\/\\/([a-z0-9-]+\\.)?example\\.com[/:&?]?");
    assert.equal(advancedBlocking[1].action.type, "ignore-previous-rules");
    assert.notOk(advancedBlocking[1].action.script);

    // document rules
    rule = new adguard.rules.ScriptFilterRule("example.com#%#alert(2);");
    exceptionRule = new adguard.rules.UrlFilterRule("@@||example.com^$document");

    result = SafariContentBlockerConverter.convertArray([rule, exceptionRule]);
    assert.equal(result.errorsCount, 0);
    converted = JSON.parse(result.converted);
    assert.equal(converted.length, 1);

    advancedBlocking = JSON.parse(result.advancedBlocking);
    assert.equal(advancedBlocking.length, 2);

    assert.equal(advancedBlocking[0].trigger['url-filter'], ".*");
    assert.equal(advancedBlocking[0].trigger['if-domain'], "example.com");
    assert.equal(advancedBlocking[0].action.type, "script");
    assert.equal(advancedBlocking[0].action.script, "alert(2);");

    assert.equal(advancedBlocking[1].trigger['url-filter'], "^[htpsw]+:\\/\\/");
    assert.equal(advancedBlocking[1].trigger['if-domain'][0], "*example.com");
    assert.equal(advancedBlocking[1].action.type, "ignore-previous-rules");
    assert.notOk(advancedBlocking[1].action.script);
});

QUnit.test("Extended Css rules exceptions", function (assert) {

    let rule, exceptionRule, result, converted, advancedBlocking;

    // elemhide rules
    rule = new adguard.rules.CssFilterRule("ksl.com#?#.queue:-abp-has(.sponsored)");
    exceptionRule = new adguard.rules.UrlFilterRule("@@||ksl.com^$elemhide");

    result = SafariContentBlockerConverter.convertArray([rule, exceptionRule]);
    assert.equal(result.errorsCount, 0);
    converted = JSON.parse(result.converted);
    assert.equal(converted.length, 1);

    console.log(result.advancedBlocking);
    advancedBlocking = JSON.parse(result.advancedBlocking);
    assert.equal(advancedBlocking.length, 2);

    assert.equal(advancedBlocking[0].trigger['url-filter'], ".*");
    assert.equal(advancedBlocking[0].trigger['if-domain'], "ksl.com");
    assert.equal(advancedBlocking[0].action.type, "css");
    assert.equal(advancedBlocking[0].action.css, ".queue:-abp-has(.sponsored)");

    assert.equal(advancedBlocking[1].trigger['url-filter'], "^[htpsw]+:\\/\\/");
    assert.equal(advancedBlocking[1].trigger['if-domain'][0], "*ksl.com");
    assert.equal(advancedBlocking[1].action.type, "ignore-previous-rules");
    assert.notOk(advancedBlocking[1].action.script);
    assert.notOk(advancedBlocking[1].action.css);

    // document rules
    rule = new adguard.rules.CssFilterRule("ksl.com#?#.queue:-abp-has(.sponsored)");
    exceptionRule = new adguard.rules.UrlFilterRule("@@||ksl.com^$document");

    result = SafariContentBlockerConverter.convertArray([rule, exceptionRule]);
    assert.equal(result.errorsCount, 0);
    converted = JSON.parse(result.converted);
    assert.equal(converted.length, 1);

    advancedBlocking = JSON.parse(result.advancedBlocking);
    assert.equal(advancedBlocking.length, 2);

    assert.equal(advancedBlocking[0].trigger['url-filter'], ".*");
    assert.equal(advancedBlocking[0].trigger['if-domain'], "ksl.com");
    assert.equal(advancedBlocking[0].action.type, "css");
    assert.equal(advancedBlocking[0].action.css, ".queue:-abp-has(.sponsored)");

    assert.equal(advancedBlocking[1].trigger['url-filter'], "^[htpsw]+:\\/\\/");
    assert.equal(advancedBlocking[1].trigger['if-domain'][0], "*ksl.com");
    assert.equal(advancedBlocking[1].action.type, "ignore-previous-rules");
    assert.notOk(advancedBlocking[1].action.script);
    assert.notOk(advancedBlocking[1].action.css);
});

QUnit.test("Test single file converter", function (assert) {
    const result = jsonFromFilters(['ksl.com#?#.queue:-abp-has(.sponsored)', 'example.org#%#alert(1);'], 100, true);
    assert.ok(result);
});