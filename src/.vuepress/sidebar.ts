import { sidebar } from "vuepress-theme-hope";

export default sidebar({
  "/": [
    "intro",
  ],

  // blogs-main 目录的独立侧边栏
  "/blogs-main/": [
    "",
    {
      text: "cpp",
      prefix: "modern-cpp/",
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
    }
  ],
});
