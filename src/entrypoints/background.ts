import { defineBackground } from 'wxt/utils/define-background';
import { translate } from '@/lib/api';
import { detectLanguage } from '@/lib/lang-detect';
import { clearExpiredCache } from '@/lib/cache';
import type { BgMessage } from '@/types';

const ALARM_NAME = 'cache-cleanup';

export default defineBackground(() => {
  console.log('Translator background service worker started');

  // Set up daily cache cleanup alarm
  chrome.alarms.get(ALARM_NAME, (alarm) => {
    if (!alarm) {
      chrome.alarms.create(ALARM_NAME, {
        periodInMinutes: 60 * 24, // Daily
      });
    }
  });

  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === ALARM_NAME) {
      try {
        const cleared = await clearExpiredCache();
        console.log(`Cache cleanup: removed ${cleared} expired entries`);
      } catch (error) {
        console.error('Cache cleanup failed:', error);
      }
    }
  });

  // Handle keyboard shortcut
  chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'toggle-translate') {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_TRANSLATION' });
        }
      } catch {
        // Tab may not have content script injected
      }
    }
  });

  // Handle messages from content script / popup / options
  chrome.runtime.onMessage.addListener((message: BgMessage, _sender, sendResponse) => {
    (async () => {
      try {
        switch (message.type) {
          case 'TRANSLATE': {
            const result = await translate({
              text: message.payload.text,
              sourceLang: message.payload.sourceLang,
              targetLang: message.payload.targetLang,
              isAggregate: message.payload.isAggregate,
            });
            sendResponse({ success: true, data: result });
            break;
          }

          case 'DETECT_LANG': {
            const lang = await detectLanguage(message.payload.text);
            sendResponse({ success: true, data: { lang } });
            break;
          }

          case 'CLEAR_CACHE': {
            const cleared = await clearExpiredCache();
            sendResponse({ success: true, data: { cleared } });
            break;
          }

          case 'PING': {
            sendResponse({ success: true, data: 'pong' });
            break;
          }

          default:
            sendResponse({ success: false, error: 'Unknown message type' });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        sendResponse({ success: false, error: errorMsg });
      }
    })();

    // Return true to indicate we will send a response asynchronously
    return true;
  });
});
