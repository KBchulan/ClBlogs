---
title: Begin
article: true
order: 1
star: false

category:
  - 语言

tag:
  - cpp

date: 2025-06-04

description: c++ 篇章的总览介绍
footer: Always coding, always learning
---
<!-- more -->

# C++ 学习之旅

> 本章记录作者学习现代 C++ 的笔记与心得体会， 应该只会记录一些不太熟悉的特性。

## 编译器选择

要想学习现代 C++，一个较高的编译器版本是必不可少的。

### 主流编译器对比

- **GCC**：GNU Compiler Collection，开源编译器，标准库为 `libstdc++`，支持多平台。
- **Clang**：LLVM 的 C/C++/Objective-C 编译器，开源，标准库为 `libc++`，支持多平台。
- **MSVC**：Microsoft Visual C++，集成在 Visual Studio 中，标准库为 `MSVC STL`，主要是windows。

### 推荐配置

我建议使用 [MSYS2](https://www.msys2.org/) 来安装编译器环境，这个更新很及时，默认下载的 gcc 就是15.1，这里我选择 `ucrt64` 的配置：

```bash
# 打开 msys2 终端
pacman -S mingw-w64-ucrt-x86_64-gcc
pacman -S mingw-w64-ucrt-x86_64-clang
```

### 验证安装

把 `ucrt64` 的 `bin` 目录添加到环境变量，然后可以通过以下命令验证安装是否成功：

```bash
# 编译器版本
g++ --version
clang++ --version

# Make 版本，Windows 下默认应该是 mingw32-make，可以起一个别名方便使用
make --version
```

## 其他配置

### CMake 配置

如果没有安装 cmake，请从 [官网](https://cmake.org/download/)进行安装。

在 Windows 系统下，默认情况 cmake 会生成 `MSVC` 解决方案。可以通过设置环境变量来使用 `MinGW`：

```bash
# 设置环境变量
CMAKE_GENERATOR=MinGW Makefiles
```

我原来写过一个 cmake 的[项目模板](https://github.com/KBchulan/ClBlogs-Src/tree/main/blogs-main/cpp/cmake-template)，可以拿来直接使用。

### 开发工具配置

- **编辑器**：推荐 [Visual Studio Code](https://code.visualstudio.com/)，味大，无需多言
- **语言服务**：使用 `clangd`，它提供了对 `CMake` 路径的支持和优秀的 IntelliSense 功能。

> 微软的 `c/c++` 插件就是 shit，跟这个没得比。

以下是作者的 `clangd` 配置：

```json
{
  "clangd.path": "c:\\Users\\18737\\AppData\\Roaming\\Cursor\\User\\globalStorage\\llvm-vs-code-extensions.vscode-clangd\\install\\19.1.2\\clangd_19.1.2\\bin\\clangd.exe",
  "clangd.arguments": [
    "--header-insertion=iwyu",
    "--compile-commands-dir=${workspaceFolder}",
    "--query-driver=C:/msys64/ucrt64/bin/*,C:/msys64/mingw64/bin/*",
    "--background-index",
    "--all-scopes-completion",
    "--completion-style=detailed",
    "--pch-storage=memory"
  ],
  "clangd.fallbackFlags": [
    "-IC:/msys64/ucrt64/include",
    "-IC:/msys64/mingw64/include",
    "-std=c++23",
    "--target=x86_64-w64-mingw32"
  ]
}
```

### 自定义配置

如果需要自定义，可以在项目根目录创建 `.clangd` 配置文件进行自定义设置，这个会覆盖我们的插件设置。

---

**至此，我们的 C++ 开发环境配置完成，可以开始愉快的开始 C++ 的学习之旅啦！**
