import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  srcDir: 'src',
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'zh_CN',
    version: '0.1.0',
    permissions: [
      'storage',
      'activeTab',
      'alarms',
    ],
    host_permissions: ['<all_urls>'],
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      96: 'icon/96.png',
      128: 'icon/128.png',
    },
    commands: {
      'toggle-translate': {
        suggested_key: {
          default: 'Alt+W',
          windows: 'Alt+W',
          linux: 'Alt+W',
          mac: 'Alt+W',
        },
        description: '__MSG_command_toggle_desc__',
      },
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  webExt: {
    binaries: {
      chrome: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    },
  },
});
