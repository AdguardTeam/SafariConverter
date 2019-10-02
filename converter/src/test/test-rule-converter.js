/**
 * Test script for Safari content-blocking rules converter - rule converter
 */

/* global QUnit, adguard */

QUnit.module('Basic');
QUnit.test('Test scriptlet adguard rule', (assert) => {
    const rule = "example.org#%#//scriptlet('abort-on-property-read', 'I10C')";
    const exp = "example.org#%#//scriptlet('abort-on-property-read', 'I10C')";
    const res = adguard.rules.ruleConverter.convertRule(rule);
    assert.equal(res, exp);
});

QUnit.test('Test scriptlet adguard rule exception', (assert) => {
    const rule = "example.org#@%#//scriptlet('abort-on-property-read', 'I10C')";
    const exp = "example.org#@%#//scriptlet('abort-on-property-read', 'I10C')";
    const res = adguard.rules.ruleConverter.convertRule(rule);
    assert.equal(res, exp);
});

QUnit.module('Scriptlets');
QUnit.test('Test converter scriptlet ubo rule', (assert) => {
    // blocking rule
    const rule = 'example.org##+js(setTimeout-defuser.js, [native code], 8000)';
    const exp = 'example.org#%#//scriptlet("ubo-setTimeout-defuser.js", "[native code]", "8000")';
    const res = adguard.rules.ruleConverter.convertRule(rule);
    assert.equal(res, exp);
    // whitelist rule
    const whitelistRule = 'example.org#@#+js(setTimeout-defuser.js, [native code], 8000)';
    const expectedResult = 'example.org#@%#//scriptlet("ubo-setTimeout-defuser.js", "[native code]", "8000")';
    assert.equal(adguard.rules.ruleConverter.convertRule(whitelistRule), expectedResult);
});

QUnit.test('Test converter scriptlet abp rule', (assert) => {
    const rule = "example.org#$#hide-if-contains li.serp-item 'li.serp-item div.label'";
    const exp = 'example.org#%#//scriptlet("abp-hide-if-contains", "li.serp-item", "li.serp-item div.label")';
    const res = adguard.rules.ruleConverter.convertRule(rule);
    assert.equal(res, exp);
});

QUnit.test('Test converter scriptlet multiple abp rule', (assert) => {
    const rule = 'example.org#$#hide-if-has-and-matches-style \'d[id^="_"]\' \'div > s\' \'display: none\'; hide-if-contains /.*/ .p \'a[href^="/ad__c?"]\'';
    const exp1 = 'example.org#%#//scriptlet("abp-hide-if-has-and-matches-style", "d[id^=\\"_\\"]", "div > s", "display: none")';
    const exp2 = 'example.org#%#//scriptlet("abp-hide-if-contains", "/.*/", ".p", "a[href^=\\"/ad__c?\\"]")';
    const res = adguard.rules.ruleConverter.convertRule(rule);

    assert.equal(res.length, 2);
    assert.equal(res[0], exp1);
    assert.equal(res[1], exp2);
});

QUnit.module('Misc');
QUnit.test('Test converter css adguard rule', (assert) => {
    const rule = 'firmgoogle.com#$#.pub_300x250 {display:block!important;}';
    const exp = 'firmgoogle.com#$#.pub_300x250 {display:block!important;}';
    const res = adguard.rules.ruleConverter.convertRule(rule);

    assert.equal(res, exp, 'the issue of this test that adg css rule and abp snippet rule has the same mask, but different content');

    // https://github.com/AdguardTeam/AdguardBrowserExtension/issues/1412
    const whitelistCssRule = 'example.com#@$#h1 { display: none!important; }';
    const expected = 'example.com#@$#h1 { display: none!important; }';
    const actual = adguard.rules.ruleConverter.convertRule(whitelistCssRule);
    assert.equal(actual, expected, 'AG CSS whitelist rules should not be parsed as ABP scriptlet rule');
});

QUnit.test('Comments in rule', (assert) => {
    let rule = adguard.rules.builder.createRule('! example.com#$#.pub_300x250 {display:block!important;}', 0);
    assert.notOk(rule, 'rule with comment mask should return null');

    rule = adguard.rules.builder.createRule('! ain.ua#$#body - удаление брендированного фона, отступа сверху', 0);
    assert.notOk(rule, 'rule with comment mask should return null');
});


QUnit.module('Modifiers conversion');
QUnit.test('Converts ##^script:has-text to $$script[tag-containts]', (assert) => {
    let rule = 'example.com##^script:some-another-rule(test)';
    let actual = adguard.rules.ruleConverter.convertRule(rule);
    assert.equal(actual, rule, 'Should returns the same rule');

    rule = 'example.com##^script:has-text(12313)';
    actual = adguard.rules.ruleConverter.convertRule(rule);
    assert.equal(actual.length, 1, 'Single rule check');
    assert.equal(actual[0], 'example.com$$script[tag-content="12313"]', 'Should be converted to adg rule');

    rule = 'example.com##^script:has-text(===):has-text(/[\w\W]{16000}/)';
    actual = adguard.rules.ruleConverter.convertRule(rule);
    assert.equal(actual.length, 2, 'Two rules, one of then nor supporting');
    assert.equal(actual[0], 'example.com$$script[tag-content="==="]', 'Should be converted to adg rule');
    assert.equal(actual[1], 'example.com##^script:has-text(/[wW]{16000}/)', 'Should be separated to ubo rule');
});

QUnit.test('Converts rules with $all modifier into 2 rules with: $document and $popup', (assert) => {
    // test simple rule;
    let rule = '||example.org^$all';
    let actual = adguard.rules.ruleConverter.convertRule(rule);
    let exp1 = '||example.org^$document';
    let exp2 = '||example.org^$popup';

    assert.equal(actual.length, 2);
    assert.ok(actual.includes(exp1));
    assert.ok(actual.includes(exp2));

    // test rule with more options
    rule = '||example.org^$all,important';
    actual = adguard.rules.ruleConverter.convertRule(rule);
    exp1 = '||example.org^$document,important';
    exp2 = '||example.org^$popup,important';

    assert.equal(actual.length, 2);
    assert.ok(actual.includes(exp1));
    assert.ok(actual.includes(exp2));
});
