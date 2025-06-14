---
title: Begin
article: true
order: 1
star: false

category:
  - 语言

tag:
  - rust

date: 2025-06-04

description: rust 篇章的总览介绍
footer: Always coding, always learning
---
<!-- more -->

# Rust 学习之旅

> 本章记录作者学习 Rust 圣经的笔记与心得体会，方便以后复习。

## 安装 Rust

我们将使用 `rustup` 来安装 Rust。`rustup` 是 Rust 官方的工具链管理器，能够方便地安装、更新和卸载 Rust。

### Linux

```bash
# 安装 rustup
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh

# 安装 C 编译器（非必需）
sudo apt install build-essential
```

> 运行上述命令即可自动安装最新稳定版本的 Rust

### Windows

1. **安装 MSVC 工具链**
   首先安装 [Microsoft Visual Studio Build Tools](https://learn.microsoft.com/en-us/visualstudio/install/install-visual-studio?view=vs-2022)
2. **安装 Rust**
   从 Rust 官网下载 [rustup 安装程序](https://rustup.rs/)，运行安装即可
3. **配置环境变量**
   安装完成后，`rustup` 会自动配置环境变量，当然自己搞到环境变量也是一样的

### 检查安装

- **更新**：`rustup update`
- **卸载**：`rustup self uninstall`
- **查看版本**：`cargo --version` 或 `rustc --version`

**至此，Rust 安装完成，可喜可贺可喜可贺！**

## 推荐开发环境

- **编辑器**：推荐 [Visual Studio Code](https://code.visualstudio.com/)，味大，无需多言
- **语言服务**：安装 `rust-analyzer` 插件，提供智能补全、错误检查等功能
- **配置文件**：安装 `Even Better TOML` 插件，提供更好的 TOML 文件支持
- **错误提示**：安装 `Error Lens` 插件，可以在代码行内显示错误和警告(真的好用)

---

**下一步：** 从 Hello World 开始，简单认识一下 `Rust` 的大体框架
