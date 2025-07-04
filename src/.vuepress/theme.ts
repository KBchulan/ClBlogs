import { hopeTheme } from "vuepress-theme-hope";

import navbar from "./navbar.js";
import sidebar from "./sidebar.js";

export default hopeTheme({
  hostname: "https://kbchulan.github.io/ClBlogs/",

  author: {
    name: "KBchulan",
    url: "https://kbchulan.github.io/ClBlogs/",
  },

  repo: "KBchulan/ClBlogs",

  docsDir: "src",

  // 强制暗色
  darkmode: "enable",

  // 导航栏
  navbar,

  // 导航栏布局
  navbarLayout: {
    start: ["Brand"],
    center: ["Links"],
    end: ["Search", "Repo", "Outlook"]
  },

  // 侧边栏
  sidebar,

  // 页脚
  footer: "默认页脚",
  displayFooter: true,

  // 博客相关
  blog: {
    avatar: "/assets/imgs/head.png",
    description: "啥都想学，啥都不会的程序猿",
    medias: {
      GitHub: "https://github.com/KBchulan",
      QQ: "2262317520",
      Wechat: "18737519552",
      Email: "18737519552@163.com",
      Gmail: "whx5234@gmail.com",
    },
  },

  // 加密配置
  encrypt: {
    config: {
      "/pages-other/week-once/Episode 132": {
        hint: "请输入密码：",
        password: "episode-132",
      },
      "/pages-other/week-once/Episode 169": {
        hint: "请输入密码：",
        password: "episode-169",
      },
      "/pages-other/week-once/Episode 229": {
        hint: "请输入密码：",
        password: "episode-229",
      },
      "/pages-other/week-once/Episode 270": {
        hint: "请输入密码：",
        password: "episode-270",
      },
      "/pages-other/week-once/Episode 320": {
        hint: "请输入密码：",
        password: "episode-320",
      },
    },
  },

  // 多语言配置
  metaLocales: {
    editLink: "在 GitHub 上编辑此页",
  },

  // 如果想要实时查看任何改变，启用它。注: 这对更新性能有很大负面影响
  // hotReload: true,

  // 此处开启了很多功能用于演示，你应仅保留用到的功能。
  markdown: {
    align: true,
    attrs: true,
    codeTabs: true,
    component: true,
    demo: true,
    figure: true,
    gfm: true,
    imgLazyload: true,
    imgSize: true,
    include: true,
    mark: true,
    plantuml: true,
    spoiler: true,
    stylize: [
      {
        matcher: "Recommended",
        replacer: ({ tag }) => {
          if (tag === "em")
            return {
              tag: "Badge",
              attrs: { type: "tip" },
              content: "Recommended",
            };
        },
      },
    ],
    sub: true,
    sup: true,
    tabs: true,
    tasklist: true,
    vPre: true,
  },

  sidebarSorter: ["order", "date", "title"],

  // 在这里配置主题提供的插件
  plugins: {
    // 启用搜索
    // slimsearch: true,

    blog: {
      filter: (page) => {
        if (page.filePathRelative?.endsWith('README.md')) {
          return false;
        }

        if (page.frontmatter.article === false) {
          return false;
        }

        if (page.frontmatter.index === false) {
          return false;
        }

        // 如果标题以 第 开头，则不显示
        if (page.frontmatter.title?.startsWith("第")) {
          return false;
        }

        return true;
      },

      excerptLength: 0,  // 设置摘要长度
    },

    components: {
      components: ["Badge", "VPCard"],
    },

    icon: {
      prefix: "fa6-solid:",
    },
  },
});
