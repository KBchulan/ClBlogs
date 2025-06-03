import { defineUserConfig } from "vuepress";

import theme from "./theme.js";

export default defineUserConfig({
  base: "/ClBlogs/",

  lang: "zh-CN",
  title: "KBchulan的博客",
  description: "KBchulan的博客",

  head: [
    ["link", { rel: "icon", href: "/ClBlogs/favicon.png" }]
  ],

  theme,

  // 和 PWA 一起启用
  // shouldPrefetch: false,
});
