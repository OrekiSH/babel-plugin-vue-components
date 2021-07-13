import type { NodePath, Node } from 'babel-traverse';

const fg = require('fast-glob');
const path = require('path');
const kebabcase = require('lodash.kebabcase');
const camelcase = require('lodash.camelcase');

export interface RegisterOptions {
  include: string[];
  main: string;
  semicolon: boolean;
  extension: boolean;
  quotes: 'single' | 'double';
}

export interface Entry {
  path: string;
  name: string;
  registerName: string;
}

export type SourceType = 'script' | 'module' | 'unambiguous';

export type UseTemplate = (code: string, opts: {
  sourceType: SourceType,
}) => () => Node | Node[];

export default function register(
  { template }: { template: UseTemplate },
  options: RegisterOptions,
) {
  const {
    include, main, semicolon, extension, quotes,
  } = options || {};
  const quote = quotes === 'single' ? '\'' : '"';

  // scan dirs, 扫描指定目录
  let entries: Entry[] = fg.sync(include, {
    objectMode: true,
  });
  entries = entries.map((e) => {
    // component name, 组件名
    const nameTokens = e.name.split('.');
    const name = nameTokens.slice(0, nameTokens.length - 1).join('.');
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
