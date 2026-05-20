import type { SiteRule } from './index';

export const githubRule: SiteRule = {
  id: 'github',
  matches: (url) => url.hostname === 'github.com',
  excludeSelectors: [
    '.react-directory-row',              // 新版 GitHub 目录树单行
    '.react-tree-show-tree-items',       // 左侧侧边栏文件树
    'div[aria-labelledby="folders-and-files"]', // 仓库文件列表容器
    '.js-navigation-container',          // 旧版文件列表容器
    '.file-navigation',                  // 分支选择及文件操作栏
    '.gh-header-meta',                   // 仓库头部元数据
    '.js-path-segment',                  // 路径面包屑导航
    '.blob-num',                         // 代码行号
    '.blob-code',                        // 代码内容区（双重保险，代码本身不应翻译）
  ],
};
