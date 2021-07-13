<h1 align="center">babel-plugin-vue-components</h1>

自动引入并将Vue组件注册为全局组件

<a href="https://github.com/OrekiSH/babel-plugin-vue-components/blob/main/README.md">English</a> | 简体中文

## 安装

* 首先安装 [babel/core](https://github.com/babel/babel/blob/main/packages/babel-core/README.md)

* 接着安装插件

```bash
$ npm i -D babel-plugin-vue-components
# 或者
$ yarn add -D babel-plugin-vue-components
```

## 用法

```js
const babel = require('@babel/core');
const VueComponentsPlugin = require('babel-plugin-vue-components');

babel.transform(code, {
  plugins: [
    [VueComponentsPlugin, {
      main: './src/main.ts',
      includes: ['./src/components/**/*.vue', './src/components/**/*.tsx'],
      semicolon: true,
      extension: true,
      quotes: 'single',
    }],
  ],
});
```

## 自动导入并注册

假设我们的项目中的`src/components`目录存在: `foo.vue`和`bar.tsx`, 以默认配置运行的结果是:

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

## 配置

### `main`

类型: `String`<br>
默认值: `./src/main.js`

main.js文件相对于当前运行脚本的位置

### `include`

类型: `Array[...String]`<br>
默认值: `['./src/components/**/*.vue']`

声明一个[minimatch pattern](https://github.com/isaacs/minimatch)匹配模式的数组，指定插件应该操作的文件

### `semicolon`

类型: `Boolean`<br>
默认值: `true`

语句末尾是否添加分号

### `extension`

类型: `Boolean`<br>
默认值: `true`

导入文件是否保留文件后缀

### `quotes`

类型: `'single' | 'double'`<br>
默认值: `'single'`

导入文件使用单引号/双引号
