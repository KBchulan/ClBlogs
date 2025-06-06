import { sidebar } from "vuepress-theme-hope";

export default sidebar({
  "/": [
    "intro",
  ],

  // blogs-main 目录的独立侧边栏
  "/blogs-main/": [
    "",
    {
      text: "modern-cpp",
      icon: "placeholder",
      prefix: "modern-cpp/",
      collapsible: true,
      children: "structure",
    },
    {
      text: "typescript",
      icon: "placeholder",
      prefix: "typescript/",
      collapsible: true,
      children: "structure",
    },
    {
      text: "rust",
      icon: "placeholder",
      prefix: "rust/",
      collapsible: true,
      children: "structure",
    },
    {
      text: "asio",
      icon: "placeholder",
      prefix: "asio/",
      collapsible: true,
      children: "structure",
    },
    {
      text: "concurrent",
      icon: "placeholder",
      prefix: "concurrent/",
      collapsible: true,
      children: "structure",
    },
    {
      text: "vue3",
      icon: "placeholder",
      prefix: "vue3/",
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
      icon: "placeholder",
      prefix: "WeekOnce/",
      collapsible: true,
      children: "structure",
    },
  ],
});
