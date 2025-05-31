import { defineUserConfig } from "vuepress";

import theme from "./theme.js";

export default defineUserConfig({
  base: "/ClBlogs/",

  lang: "zh-CN",
  title: "Chulan's Blog",
  description: "Chulan's Blog",

  theme,

  // 和 PWA 一起启用
  // shouldPrefetch: false,
});
