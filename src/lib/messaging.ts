import type { BgMessage } from '@/types';

// background 的错误响应可能带稳定错误码（如图片翻译），供入口映射用户文案。
export class BgMessageError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'BgMessageError';
  }
}

export function sendBgMessage<T = unknown>(message: BgMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new BgMessageError(chrome.runtime.lastError.message ?? 'Unknown error'));
      } else if (response?.success) {
        resolve(response.data as T);
      } else {
        reject(new BgMessageError(response?.error ?? 'Unknown error', response?.code));
      }
    });
  });
}
