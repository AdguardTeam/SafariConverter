/**
 * Test script for Safari content-blocking rules converter - advanced blocking
 */

/* global SafariContentBlockerConverter, QUnit, URL_FILTER_REGEXP_START_URL, _checkResult, jsonFromFilters */

QUnit.test("Script rules", function (assert) {

    const rule = new adguard.rules.ScriptFilterRule('example.org#%#alert(1);', 0);
    const ruleTwo = new adguard.rules.ScriptFilterRule("test.com#%#alert(2);");

    const result = SafariContentBlockerConverter.convertArray([rule, ruleTwo]);
    assert.equal(result.errorsCount, 0);

    const converted = JSON.parse(result.converted);
    assert.equal(converted.length, 0);

    const advancedBlocking = JSON.parse(result.advancedBlocking);
    assert.equal(advancedBlocking.length, 2);

    assert.equal(advancedBlocking[0].trigger['url-filter'], ".*");
    assert.equal(advancedBlocking[0].trigger['if-domain'], "example.org");
    assert.equal(advancedBlocking[0].action.type, "script");
    assert.equal(advancedBlocking[0].action.script, "alert(1);");

    assert.equal(advancedBlocking[1].trigger['url-filter'], ".*");
    assert.equal(advancedBlocking[1].trigger['if-domain'], "test.com");
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

    const rule = new adguard.rules.ScriptFilterRule('example.org#%#alert(1);', 0);
    const ruleTwo = new adguard.rules.ScriptFilterRule("test.com#@%#alert(2);");

    const result = SafariContentBlockerConverter.convertArray([rule, ruleTwo]);
    assert.equal(result.errorsCount, 0);

    const converted = JSON.parse(result.converted);
    assert.equal(converted.length, 0);

    //console.log(result.advancedBlocking);
    const advancedBlocking = JSON.parse(result.advancedBlocking);
    assert.equal(advancedBlocking.length, 2);

    //TODO: Fix script exceptions
    assert.ok(false);
});

QUnit.test("Script rules exceptions", function (assert) {

    //TODO: Implement
    assert.ok(false);
});

QUnit.test("Test single file converter", function (assert) {
    const result = jsonFromFilters(['ksl.com#?#.queue:-abp-has(.sponsored)', 'example.org#%#alert(1);'], 100, true);
    assert.ok(result);
});