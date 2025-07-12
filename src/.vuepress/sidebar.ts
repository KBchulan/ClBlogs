import { sidebar } from "vuepress-theme-hope";

export default sidebar({
  "/": [
    "intro",
  ],

  // blogs-main 目录的独立侧边栏
  "/blogs-main/": [
    "",
    {
      text: "go",
      prefix: "go/",
      collapsible: true,
      children: "structure",
    },
    {
      text: "cpp",
      prefix: "cpp/",
      collapsible: true,
      children: "structure",
    },
    {
      text: "vue",
      prefix: "vue3/",
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
      text: "rust",
      prefix: "rust/",
      collapsible: true,
      children: "structure",
    },
    {
      text: "typescript",
      prefix: "typescript/",
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
  "/program-main/": [
    "",
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
      text: "程序员工作法",
      prefix: "work-method/",
      collapsible: true,
      children: "structure"
    },
    {
      text: "跟小满学点东西",
      prefix: "xmzs/",
      collapsible: true,
      children: "structure"
    },
    {
      text: "bug排查",
      prefix: "bug-fix/",
      collapsible: true,
      children: "structure"
    }
  ],
});
