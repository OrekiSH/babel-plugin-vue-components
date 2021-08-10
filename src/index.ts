import type { NodePath, Node } from 'babel-traverse';

const fs = require('fs');
const fg = require('fast-glob');
const path = require('path');
const kebabcase = require('lodash.kebabcase');
const camelcase = require('lodash.camelcase');

export interface RegisterOptionInclude {
  path: string;
  // match name attribute in the nearest package.json as scope
  // 匹配最近的package.json的name属性作为组件名的前缀
  scope?: boolean;
  componentName?: 'file' | 'package' | 'option';
}

export interface RegisterOptions {
  include?: RegisterOptionInclude[] | string[];
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

  let entries: Entry[] = [];
  if (Array.isArray(include)) {
    include.forEach((item) => {
      const filePath = typeof item === 'string' ? item : item?.path;
      // scan dirs, 扫描指定目录
      let files = fg.sync([filePath], {
        objectMode: true,
      });

      if (typeof item === 'object') {
        const isPkg = item?.componentName === 'package';
        const isScope = item?.scope;

        files = files.map((e: Entry) => {
          let componentName = null;
          let scope = null;

          // parse name attribute in package.json
          // 解析package.json中的name属性
          if (isScope || isPkg) {
            const tokens = e.path.split('/');
            const len = tokens.length;
            for (let i = 1; i < len; i += 1) {
              const pkg = [...tokens.slice(0, len - i), 'package.json'].join('/');
              try {
                if (fs.existsSync(pkg)) {
                  const code = fs.readFileSync(pkg, { encoding: 'utf-8' });
                  const pkgObj = JSON.parse(code);
                  if (pkgObj.name) {
                    if (isPkg) componentName = pkgObj.name;
                    if (isScope) scope = pkgObj.name;
                  }
                  break;
                }
              } catch (err) {
                console.error(err);
              }
            }
          }

          // use name attribute in Vue SFC option first as component name
          // 优先使用Vue SFC选项中的name属性作为组件名
          if (!componentName && item?.componentName === 'option') {
            try {
              const code = fs.readFileSync(e.path, { encoding: 'utf-8' });
              const scriptBlock = code.match(scriptBlockReg);
              if (scriptBlock?.[1]) {
                let optionString = scriptBlock[1].trim();
                optionString = optionString.replace('export default ', '');
                // eslint-disable-next-line
                let option: Record<string, any> = {};
                // eslint-disable-next-line
                eval(`option = ${optionString}`)
                if (option?.name) {
                  componentName = option.name;
                }
              }
            } catch (err) {
              console.error(err);
            }
          }

          // use file name as component name
          // 使用文件名作为组件名
          if (!componentName) {
            const nameTokens = e.name.split('.');
            componentName = nameTokens.slice(0, nameTokens.length - 1).join('.');
          }

          if (scope && isScope) {
            componentName = `${scope}-${componentName}`;
          }

          return { ...e, componentName };
        });
      }

      entries.push(...files);
    });
  }

  entries = entries.map((e) => {
    const name = e.componentName;
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
