# Safari Converter

Safari Content Blocker Converter code and testing extension.

## Safari Content Blocker

Converts filter rules in AdGuard format to the format supported by Safari.
* https://webkit.org/blog/3476/content-blockers-first-look/

### Requirements

- node
- npm

### How to build:

`
build
`

### How to run tests:

`
run test 
`

### How to build the code to one file:

For iOS version of Adguard we need a js rules converter compiled to one single file.

## Safari Content Blocker Tester

Utility safari extension sample. However Safari doesn't log or throw any exception on incorrect rules, this sample extension will find invalid rules and log it to browser console.

### How to run this extension:

- Install this extension to the Safari Extension Builder.
- The result could be found in background page console log.

#### To test specific rules set:

- update test_filter.txt to /SafariContentBlockerTester.safariextension/filters