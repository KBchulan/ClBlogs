---
title: 18 tsconfig配置

article: true
order: 18
star: false

category:
  - 语言

tag:
  - typescript

date: 2025-08-04

description: 介绍tsc初始化后的 tsconfig.json 的所有配置选项
footer: Always coding, always learning
---

<!-- more -->

本章节会介绍一下 tsconfig.json 的所有配置选项，在前面的章节只用上了 "strict" 的配置，如下是所有的配置选项的解释。

```json
{
  "compilerOptions": {
    /* 访问 https://aka.ms/tsconfig 以阅读有关此文件的更多信息 */

    /* Projects */
    // "incremental": true,                              /* 将 .tsbuildinfo 文件保存起来，以便项目可以进行增量编译。 */
    // "composite": true,                                /* 启用约束，允许一个 TypeScript 项目可以被项目引用功能使用。 */
    // "tsBuildInfoFile": "./.tsbuildinfo",              /* 指定 .tsbuildinfo 增量编译文件的路径。 */
    // "disableSourceOfProjectReferenceRedirect": true,  /* 在引用复合项目时，禁用优先使用源文件而不是声明文件。 */
    // "disableSolutionSearching": true,                 /* 在编辑时，使项目退出多项目引用的检查。 */
    // "disableReferencedProjectLoad": true,             /* 减少 TypeScript 自动加载的项目数量。 */

    /* Language and Environment */
    "target": "es2016",                                  /* 为生成的 JavaScript 设置语言版本，并包含兼容的库声明。 */
    // "lib": [],                                        /* 指定一组描述目标运行时环境的捆绑库声明文件。 */
    // "jsx": "preserve",                                /* 指定生成的 JSX 代码的格式。 */
    // "libReplacement": true,                           /* 启用对 'lib' 选项的替代支持。 */
    // "experimentalDecorators": true,                   /* 启用对旧版实验性装饰器的实验性支持。 */
    // "emitDecoratorMetadata": true,                    /* 在源文件中为带装饰器的声明生成设计时类型元数据。 */
    // "jsxFactory": "",                                 /* 指定在目标为 React JSX 时使用的 JSX 工厂函数，例如 'React.createElement' 或 'h'。 */
    // "jsxFragmentFactory": "",                         /* 指定在目标为 React JSX 时用于片段的 JSX Fragment 引用，例如 'React.Fragment' 或 'Fragment'。 */
    // "jsxImportSource": "",                            /* 在使用 'jsx: react-jsx*' 时，指定用于导入 JSX 工厂函数的模块说明符。 */
    // "reactNamespace": "",                             /* 指定为 'createElement' 调用的对象。这只在目标为 'react' JSX 时适用。 */
    // "noLib": true,                                    /* 禁止包含任何库文件，包括默认的 lib.d.ts。 */
    // "useDefineForClassFields": true,                  /* 生成符合 ECMAScript 标准的类字段。 */
    // "moduleDetection": "auto",                        /* 控制用于检测模块格式的 JS 文件的方法。 */

    /* Modules */
    "module": "commonjs",                                /* 指定生成什么样的模块代码。 */
    // "rootDir": "./",                                  /* 指定源文件中的根文件夹。 */
    // "moduleResolution": "node10",                     /* 指定 TypeScript 如何从给定的模块说明符中查找文件。 */
    // "baseUrl": "./",                                  /* 指定解析非相对模块名的基准目录。 */
    // "paths": {},                                      /* 指定一组路径映射，将导入重定向到其他查找位置。 */
    // "rootDirs": [],                                   /* 允许在解析模块时将多个文件夹视为一个。 */
    // "typeRoots": [],                                  /* 指定多个像 './node_modules/@types' 一样作用的文件夹。 */
    // "types": [],                                      /* 指定要包含的类型包名称，即使在源文件中没有引用它们。 */
    // "allowUmdGlobalAccess": true,                     /* 允许从模块中访问 UMD 全局变量。 */
    // "moduleSuffixes": [],                             /* 解析模块时要搜索的文件名后缀列表。 */
    // "allowImportingTsExtensions": true,               /* 允许导入时包含 TypeScript 文件扩展名。需要设置 '--moduleResolution bundler' 以及 '--noEmit' 或 '--emitDeclarationOnly'。 */
    // "rewriteRelativeImportExtensions": true,          /* 在输出文件中，将相对导入路径中的 '.ts', '.tsx', '.mts', 和 '.cts' 文件扩展名重写为其对应的 JavaScript 扩展名。 */
    // "resolvePackageJsonExports": true,                /* 在解析包导入时，使用 package.json 的 'exports' 字段。 */
    // "resolvePackageJsonImports": true,                /* 在解析导入时，使用 package.json 的 'imports' 字段。 */
    // "noUncheckedSideEffectImports": true,             /* 禁止从没有副作用的导入中导入未使用的绑定。 */
    // "customConditions": [],                           /* 解析导入时，除了特定于解析器的默认条件外，还要设置的额外条件。 */
    // "resolveJsonModule": true,                        /* 允许导入 .json 文件。 */
    // "allowArbitraryExtensions": true,                 /* 允许导入任何扩展名的文件，前提是存在一个声明文件。 */
    // "noResolve": true,                                /* 禁止 'import'、'require' 或 '<reference>' 扩大 TypeScript 应添加到项目中的文件数量。 */

    /* JavaScript Support */
    // "allowJs": true,                                  /* 允许 JavaScript 文件成为程序的一部分。使用 'checkJS' 选项从这些文件中获取错误。 */
    // "checkJs": true,                                  /* 在进行类型检查的 JavaScript 文件中启用错误报告。 */
    // "maxNodeModuleJsDepth": 1,                        /* 指定用于检查 'node_modules' 中 JavaScript 文件的最大文件夹深度。仅在 'allowJs' 为 true 时适用。 */

    /* Emit */
    // "declaration": true,                              /* 从项目中的 TypeScript 和 JavaScript 文件生成 .d.ts 文件。 */
    // "declarationMap": true,                           /* 为 .d.ts 文件创建源映射（sourcemaps）。 */
    // "emitDeclarationOnly": true,                      /* 只输出 .d.ts 文件，不输出 JavaScript 文件。 */
    // "sourceMap": true,                                /* 为生成的 JavaScript 文件创建源映射文件。 */
    // "inlineSourceMap": true,                          /* 将源映射文件内联到生成的 JavaScript 文件中。 */
    // "noEmit": true,                                   /* 禁止从编译中生成任何文件。 */
    // "outFile": "./",                                  /* 指定一个文件，将所有输出捆绑到一个 JavaScript 文件中。如果 'declaration' 为 true，也指定一个文件捆绑所有 .d.ts 输出。 */
    // "outDir": "./",                                   /* 为所有生成的文件指定一个输出文件夹。 */
    // "removeComments": true,                           /* 禁止在输出中生成注释。 */
    // "importHelpers": true,                            /* 允许每个项目从 tslib 中导入一次辅助函数，而不是在每个文件中都包含它们。 */
    // "downlevelIteration": true,                       /* 为迭代生成更兼容但更冗长且性能较低的 JavaScript。 */
    // "sourceRoot": "",                                 /* 指定调试器查找引用源代码的根路径。 */
    // "mapRoot": "",                                    /* 指定调试器应该定位映射文件的位置，而不是生成的位置。 */
    // "inlineSources": true,                            /* 在生成的 JavaScript 文件内的源映射中包含源代码。 */
    // "emitBOM": true,                                  /* 在输出文件的开头生成一个 UTF-8 字节顺序标记 (BOM)。 */
    // "newLine": "crlf",                                /* 设置生成文件时使用的换行符。 */
    // "stripInternal": true,                            /* 禁止为 JSDoc 注释中带有 '@internal' 的声明生成定义。 */
    // "noEmitHelpers": true,                            /* 禁止在编译输出中生成像 '__extends' 这样的自定义辅助函数。 */
    // "noEmitOnError": true,                            /* 如果报告了任何类型检查错误，则禁止生成文件。 */
    // "preserveConstEnums": true,                       /* 禁止在生成的代码中擦除 'const enum' 声明。 */
    // "declarationDir": "./",                           /* 指定生成的声明文件的输出目录。 */

    /* Interop Constraints */
    // "isolatedModules": true,                          /* 确保每个文件都可以安全地转译，而无需依赖其他导入。 */
    // "verbatimModuleSyntax": true,                     /* 不转换或省略任何未标记为仅类型的导入或导出，确保它们根据 'module' 设置以输出文件的格式写入。 */
    // "isolatedDeclarations": true,                     /* 确保每个声明文件都可以独立使用，而无需依赖其他声明文件。 */
    // "erasableSyntaxOnly": true,                       /* 确保仅使用可擦除的语法生成代码。 */
    // "allowSyntheticDefaultImports": true,             /* 当一个模块没有默认导出时，允许使用 'import x from y' 这种形式。 */
    "esModuleInterop": true,                             /* 生成额外的 JavaScript 以简化对 CommonJS 模块的导入。这会为类型兼容性启用 'allowSyntheticDefaultImports'。 */
    // "preserveSymlinks": true,                         /* 禁止将符号链接解析为其真实路径。这与 node 中的同名标志相关。 */
    "forceConsistentCasingInFileNames": true,            /* 确保导入中的文件名大小写一致。 */

    /* Type Checking */
    "strict": true,                                      /* 启用所有严格的类型检查选项。 */
    // "noImplicitAny": true,                            /* 为具有隐式 'any' 类型的表达式和声明启用错误报告。 */
    // "strictNullChecks": true,                         /* 在类型检查时，考虑 'null' 和 'undefined'。 */
    // "strictFunctionTypes": true,                      /* 在分配函数时，检查以确保参数和返回值是子类型兼容的。 */
    // "strictBindCallApply": true,                      /* 检查 'bind'、'call' 和 'apply' 方法的参数是否与原始函数匹配。 */
    // "strictPropertyInitialization": true,             /* 检查在构造函数中已声明但未设置的类属性。 */
    // "noImplicitThis": true,                           /* 当 'this' 被赋予 'any' 类型时启用错误报告。 */
    // "useUnknownInCatchVariables": true,               /* 将 catch 子句变量的默认类型设置为 'unknown' 而不是 'any'。 */
    // "alwaysStrict": true,                             /* 确保始终生成 'use strict'。 */
    // "noUnusedLocals": true,                           /* 当局部变量未被读取时启用错误报告。 */
    // "noUnusedParameters": true,                       /* 当函数参数未被读取时引发错误。 */
    // "exactOptionalPropertyTypes": true,               /* 按照书面形式解释可选属性类型，而不是添加 'undefined'。 */
    // "noImplicitReturns": true,                        /* 为函数中没有显式返回的代码路径启用错误报告。 */
    // "noFallthroughCasesInSwitch": true,               /* 为 switch 语句中的 fall-through 情况启用错误报告。 */
    // "noUncheckedIndexedAccess": true,                 /* 当使用索引访问时，向类型中添加 'undefined'。 */
    // "noImplicitOverride": true,                       /* 确保派生类中重写的成员标有 override 修饰符。 */
    // "noPropertyAccessFromIndexSignature": true,       /* 强制对使用索引类型声明的键使用索引访问器。 */
    // "allowUnusedLabels": true,                        /* 禁止对未使用的标签进行错误报告。 */
    // "allowUnreachableCode": true,                     /* 禁止对无法访问的代码进行错误报告。 */

    /* Completeness */
    // "skipDefaultLibCheck": true,                      /* 跳过对 TypeScript 附带的 .d.ts 文件的类型检查。 */
    "skipLibCheck": true                                 /* 跳过对所有 .d.ts 文件的类型检查。 */
  }
}
```

如果需要修改配置，可以直接查阅，并参考[官文](https://www.typescriptlang.org/zh/tsconfig/)给出的示例效果进行修改。
