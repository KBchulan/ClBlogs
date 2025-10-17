import { sidebar } from "vuepress-theme-hope";

export default sidebar({
  "/": ["intro"],

  // blogs-main 目录的独立侧边栏
  "/blogs-main/": [
    "",
    {
      text: "cpp",
      prefix: "cpp/",
      collapsible: true,
      children: "structure",
    },
    {
      text: "asio",
      prefix: "asio/",
      collapsible: true,
      children: "structure",
    },
    {
      text: "golang",
      prefix: "golang/",
      collapsible: true,
      children: "structure",
    },
    {
      text: "concurrent",
      prefix: "concurrent/",
      collapsible: true,
      children: "structure",
    },
  ],

  // program-main 目录的独立侧边栏
  "/excerpts/": [
    "",
    {
      text: "程序员工作法",
      prefix: "work-method/",
      collapsible: true,
      children: "structure",
    },
    {
      text: "通关Go语言",
      prefix: "golang-teach/",
      collapsible: true,
      children: "structure",
    },
    {
      text: "Go 语言项目开发实战",
      prefix: "golang-program/",
      collapsible: true,
      children: "structure",
    }
  ],

  // pages-other 目录的独立侧边栏
  "/pages-other/": [
    "",
    {
      text: "一周一次",
      prefix: "week-once/",
      collapsible: true,
      children: "structure",
    },
    {
      text: "杂货铺",
      prefix: "mystore/",
      collapsible: true,
      children: "structure",
    },
    {
      text: "bug排查",
      prefix: "bug-fix/",
      collapsible: true,
      children: "structure",
    },
  ],
});
