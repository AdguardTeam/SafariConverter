# Safari Converter

Safari Content Blocker Converter code and testing extension.


## Safari Content Blocker

Converts filter rules in AdGuard format to the format supported by Safari.
* https://webkit.org/blog/3476/content-blockers-first-look/

### How to build:

#### Requirements

- [nodejs](https://nodejs.org/en/download/)
- [yarn](https://yarnpkg.com/en/docs/install/)

Install local dependencies by runnning:
```
    yarn install
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
    yarn convert 1,2,3,4,11,12 blocklist.json
```


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