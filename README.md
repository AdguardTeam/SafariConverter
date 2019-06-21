# Safari Converter

Safari Content Blocker Converter code and testing extension.


## Safari Content Blocker

Converts filter rules in AdGuard format to the format supported by Safari.
* https://webkit.org/blog/3476/content-blockers-first-look/

### How to build:

#### Requirements

- [nodejs](https://nodejs.org/en/download/)
- [yarn](https://yarnpkg.com/en/docs/install/)

Install local dependencies by running:
```
    yarn install
```

Create directories:
```
    mkdir build
    mkdir build/converter
    touch build/converter/JSConverter.js
```

Compiles converter and dependencies to one single file in `/build` directory. 

```
    yarn build
```

### How to run tests:

```
    yarn test
```

### How to convert some filters to content blocker format:

```
    yarn convert --1,2,3,4,11,12
```

### How to use converter:

```
    const result = SafariContentBlockerConverter.convertArray([ruleOne, ruleTwo], rulesLimit, optimize, advancedBlocking);
```

The result contains following properties:
- totalConvertedCount: length of content blocker
- convertedCount: length after reducing to limit if provided
- errorsCount: errors count
- overLimit: is limit exceeded flag
- converted: string of content blocker rules
- advancedBlocking: string of advanced blocking rules

### Supported AdGuard rules types:

#### Basic content blocker format:
- Elemhide rules (##)
- Elemhide exceptions
- Url blocking rules
- Url blocking exceptions

#### Extended Advanced blocking types:
- Script rules (#%#)
- Script rules exceptions
- Extended css elemhide rules (##)
- Scriptlet rules (#%#//scriptlet)
- Scriptlet rules exceptions

## Safari Content Blocker Tester

Utility safari extension sample. However Safari doesn't log or throw any exception on incorrect rules, this sample extension will find invalid rules and log it to browser console.

### How to build:

```
    yarn extension
```

### How to run this extension:

- Install this extension to the Safari Extension Builder.
- The result could be found in background page console log.

#### To test specific rules set:

- update test_filter.txt