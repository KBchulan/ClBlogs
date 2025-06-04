---
title: cpp 学习之旅
icon: placeholder
article: true
order: 1
star: false

category:
  - 语言

tag:
  - modern-cpp

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

| 编译器          | 标准库    | 平台支持            | 特点                     |
| --------------- | --------- | ------------------- | ------------------------ |
| **GCC**   | libstdc++ | Linux/Windows/macOS | 开源，标准支持完善       |
| **Clang** | libc++    | Linux/Windows/macOS | 错误信息友好，编译速度快 |
| **MSVC**  | MSVC STL  | Windows             | Visual Studio 集成度高   |

### 推荐配置

我建议使用 [MSYS2](https://www.msys2.org/) 来安装编译器环境，这个更新很及时，默认下载的gcc就是15.1，这里我选择ucrt64的配置：

```bash
# 打开msys2终端
pacman -S mingw-w64-ucrt-x86_64-gcc
pacman -S mingw-w64-ucrt-x86_64-clang
```

### 验证安装

把ucrt64的bin目录添加到环境变量，然后可以通过以下命令验证安装是否成功：

```bash
# 编译器版本
g++ --version
clang++ --version

# Make 版本，windows下默认应该是mingw32-make，可以起一个别名方便使用
make --version
```

## 其他配置

### CMake 配置

如果没有安装cmake，请按照[cmake官网](https://cmake.org/download/)进行安装。

在 Windows 系统下，默认情况 CMake 会生成 MSVC 解决方案。可以通过设置环境变量来使用 MinGW：

```bash
# 设置环境变量
CMAKE_GENERATOR=MinGW Makefiles
```

我原来写过一个cmake的[项目模板](https://github.com/KBchulan/ClBlogs-Src/tree/main/blogs-main/modern-cpp/cmake-template)，可以拿来直接使用。

### 开发工具配置

#### 推荐工具组合

| 工具类型           | 推荐选择                                          | 说明                                     |
| ------------------ | ------------------------------------------------- | ---------------------------------------- |
| **编辑器**   | [Visual Studio Code](https://code.visualstudio.com/) | 轻量级，插件丰富                         |
| **语言服务** | clangd                                            | 提供 CMake 路径支持和优秀的 IntelliSense |

> 微软的c/c++插件就是shit，跟这个没得比。

#### VSCode + clangd 配置

以下是作者推荐的 clangd 配置：

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
