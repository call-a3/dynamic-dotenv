# dynamic-dotenv

[![NPM](https://img.shields.io/npm/v/dynamic-dotenv.svg)](https://www.npmjs.com/package/dynamic-dotenv)
[![Travis](https://img.shields.io/travis/call-a3/dynamic-dotenv.svg)](https://travis-ci.com/call-a3/dynamic-dotenv)
[![Codecov](https://img.shields.io/codecov/c/github/call-a3/dynamic-dotenv.svg)](https://codecov.io/gh/call-a3/dynamic-dotenv)
[![Greenkeeper badge](https://badges.greenkeeper.io/call-a3/dynamic-dotenv.svg)](https://greenkeeper.io/)
[![David](https://img.shields.io/david/call-a3/dynamic-dotenv.svg)](https://david-dm.org/call-a3/dynamic-dotenv)
[![David Dev](https://img.shields.io/david/dev/call-a3/dynamic-dotenv.svg)](https://david-dm.org/call-a3/dynamic-dotenv?type=dev)

Like dotenv, but dynamic!

## Installing

```bash
# npm
npm install -s dynamic-dotenv

# yarn
yarn add dynamic-dotenv
```

## Usage

This package essentially behaves the same as using the manual initialisation of the [dotenv package](https://www.npmjs.com/package/dotenv).
The main difference to dotenv, is that the response value is an EventEmitter.
It will emit "change" events every time the loaded env file changes, as well as update the process.env values when that happens.
If an error occurs, either from filesystem interaction or from dotenv, it will also be emitted as an "error" event.

```js
import dynamicDotenv from 'dynamic-dotenv'

const dd = dynamicDotenv(/* you can pass the same options as dotenv here */)
// process.env now contains the values in your .env file

dd.on('change', () => {
  // this event will be emitted every time the .env file changes
})
```
