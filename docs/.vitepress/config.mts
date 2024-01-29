import { defineConfig } from 'vitepress';

export default defineConfig({
  base: '/52bot/',
  themeConfig: {
    returnToTopLabel: '返回顶部',
    lastUpdated: {
      text: '最近更新',
    },
    search: {
      provider: 'local',
      options: {
        detailedView: 'auto',
      },
    },
    editLink: {
      pattern: 'https://github.com/lc-cn/52bot/edit/master/docs/src/:path',
      text: '修改',
    },
    nav: [
      { text: '开始', link: '/guide/start', activeMatch: '/guide/' },
      { text: '配置', link: '/config', activeMatch: '/config' },
      {
        text: '插件市场',
        activeMatch: '/market/',
        items: [
          { text: '官方插件', link: '/market/official' },
          { text: '社区插件', link: '/market/community' },
        ],
      },
      {
        text: '演练场',
        link: '/playground',
      },
      { text: '更新日志', link: 'https://github.com/lc-cn/qq-group-bot/blob/master/CHANGELOG.md', target: '_blank' },
    ],
    sidebar: [
      {
        text: '开始',
        items: [
          { text: '简介', link: '/guide/instruction' },
          { text: '快速开始', link: '/guide/start' },
          { text: '适配器', link: '/guide/adapter' },
          { text: '插件', link: '/guide/plugin' },
          { text: '指令', link: '/guide/command' },
          { text: '中间件', link: '/guide/middleware' },
        ],
      },
      {
        text: '入门',
        items: [
          { text: '指令系统', link: '/command' },
          { text: '对话系统', link: '/prompt' },
          { text: '组件化', link: '/component' },
        ],
      },
      {
        text: '进阶',
        items: [
          { text: 'setup', link: '/setup' },
          { text: '适配器', link: '/adapter'}
        ],
      },
    ],
    footer: {
      message: 'Released under the <a href="https://github.com/lc-cn/52bot/blob/master/LICENSE">MIT License</a>.',
      copyright: 'Copyright © 2023-present <a href="https://github.com/lc-cn">lc-cn</a>',
    },
  },
  title: '52bot',
  srcDir: './src',
  outDir: './dist',
  lastUpdated: true,
  ignoreDeadLinks: true,
  description: '基于NodeJS的机器人开发框架',
});
