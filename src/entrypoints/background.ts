import { defineBackground } from 'wxt/utils/define-background';
import type { BackgroundDefinition } from 'wxt';
import { translate } from '@/lib/api';
import { detectLanguage } from '@/lib/lang-detect';
import { clearExpiredCache } from '@/lib/cache';
import { importSettings } from '@/lib/storage';
import type { BgMessage } from '@/types';

const ALARM_NAME = 'cache-cleanup';

export default defineBackground(() => {
  // 开发模式下自动导入 dev-settings.json
  if (import.meta.env.DEV && __DEV_SETTINGS__) {
    importSettings(__DEV_SETTINGS__).catch((err) => {
      console.warn('[Translator] Failed to import dev settings:', err);
    });
  }

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
        await clearExpiredCache();
      } catch (err) {
        console.warn('[Translator] cache cleanup alarm failed:', err);
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
              hasPlaceholders: message.payload.hasPlaceholders,
              extraPrompt: message.payload.extraPrompt,
            });
            sendResponse({ success: true, data: result });
            break;
          }

          case 'DETECT_LANG': {
            const lang = await detectLanguage(message.payload.text);
            sendResponse({ success: true, data: { lang } });
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
}) as BackgroundDefinition;
