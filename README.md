<h1 align="center">babel-plugin-vue-components</h1>

Auto import and global register Vue components

English | <a href="https://github.com/OrekiSH/babel-plugin-vue-components/blob/main/README-zh_CN.md">简体中文</a>

## Install

* First of all, install [babel/core](https://github.com/babel/babel/blob/main/packages/babel-core/README.md)

* Then install the plugin

```bash
$ npm i -D babel-plugin-vue-components
# OR
$ yarn add -D babel-plugin-vue-components
```

## Usage

```js
const babel = require('@babel/core');
const VueComponentsPlugin = require('babel-plugin-vue-components');

babel.transform(code, {
  plugins: [
    [VueComponentsPlugin, {
      main: './src/main.ts',
      includes: ['./src/components/**/*.vue', './src/components/**/*.tsx'],
    }],
  ],
});
```

## Auto import and register

If `src/components` contains file `foo.vue` and `bar.tsx`, run with the default config, the result is:

```js
// before
import Vue from 'vue';
```

```js
// after
import Vue from 'vue';
import foo from './foo.vue';
import bar from './bar.tsx';

Vue.component('foo', foo);
Vue.component('bar', bar);
```

## Options

### `main`

Type: `String`<br>
Default: `./src/main.js`

Script path to be transformed

### `include`

Type: `Array[...String]`<br>
Default: `['./src/components/**/*.vue']`

An array of [minimatch patterns](https://github.com/isaacs/minimatch), which specifies the files in the build the plugin should operate on. By default all files are targeted.

### `semicolon`

Type: `Boolean`<br>
Default: `true`

Add semicolon at the end of lines or not.

### `extension`

Type: `Boolean`<br>
Default: `true`

Keep file extension for import file or not.

### `quotes`

Type: `'single' | 'double'`<br>
Default: `'single'`

Single or double quotes around import file path.
