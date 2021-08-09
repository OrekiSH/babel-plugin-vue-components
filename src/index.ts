import type { NodePath, Node } from 'babel-traverse';

const fs = require('fs');
const fg = require('fast-glob');
const path = require('path');
const kebabcase = require('lodash.kebabcase');
const camelcase = require('lodash.camelcase');

export interface RegisterOptions {
  include?: string[];
  main?: string;
  semicolon?: boolean;
  extension?: boolean;
  quotes?: 'single' | 'double';
}

export interface Entry {
  path: string;
  name: string;
  registerName: string;
  componentName?: string;
}

export type SourceType = 'script' | 'module' | 'unambiguous';

export type UseTemplate = (code: string, opts: {
  sourceType: SourceType,
}) => () => Node | Node[];

const scriptBlockReg = /<script.*>([\s\S]+)<\/script>/;

export default function register(
  { template }: { template: UseTemplate },
  options: RegisterOptions,
) {
  const {
    include = ['./src/components/**/*.vue'],
    main = './src/main.js',
    semicolon = true,
    extension = true,
    quotes = 'single',
  } = options || {};
  const quote = quotes === 'single' ? '\'' : '"';

  // scan dirs, 扫描指定目录
  let entries: Entry[] = fg.sync(include, {
    objectMode: true,
  });

  // use name attribute in option first as component name, 优先使用选项中的name属性作为组件名
  entries = entries.map((e) => {
    let name = null;
    try {
      const code = fs.readFileSync(e.path, { encoding: 'utf-8' });
      const scriptBlock = code.match(scriptBlockReg);
      let optionString = scriptBlock[1].trim();
      optionString = optionString.replace('export default ', '');
      // eslint-disable-next-line
      let option: Record<string, any> = {};
      // eslint-disable-next-line
      eval(`option = ${optionString}`)
      if (option?.name) {
        name = option.name;
      }
    } catch (err) {
      console.error(err);
    }

    return {
      ...e,
      componentName: name,
    };
  });

  entries = entries.map((e) => {
    // component name, 组件名
    const nameTokens = e.name.split('.');
    const name = e.componentName
      || nameTokens.slice(0, nameTokens.length - 1).join('.');
    // import path in main.js, main.js中的导入路径
    const importPath = `./${path.relative(path.resolve(main, '../'), e.path)}`;
    const importPathTokens = importPath.split('.');

    return {
      path: importPathTokens.slice(0, extension ? importPathTokens.length : importPathTokens.length - 1).join('.'),
      registerName: kebabcase(name),
      name: camelcase(name),
    };
  });

  const importDeclaration = entries
    .map((e) => `import ${e.name} from ${quote}${e.path}${quote}${semicolon ? ';' : ''}`);
  const registerDeclaration = entries
    .map((e) => `Vue.component(${quote}${e.registerName}${quote}, ${e.name})${semicolon ? ';' : ''}`);
  // import and register declaration, 导入并注册组件
  const declaration = `${importDeclaration.join('\n')}\n${registerDeclaration.join('\n')}`;

  const importFunc = template(declaration, { sourceType: 'module' });

  return {
    visitor: {
      Program(nodePath: NodePath) {
        const lastImport = (nodePath.get('body') as NodePath[])
          .filter((p) => p.isImportDeclaration()).pop();
        if (lastImport) lastImport.insertAfter(importFunc());
      },
    },
  };
}
