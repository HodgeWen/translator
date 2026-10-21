// 图片翻译共享类型与稳定错误码。识图直译与缓存共用这些契约。

/** 视觉模型直译结果：整图译文文本与命中的模型 */
export interface VisionTranslationResult {
  text: string;
  providerId: string;
  modelId: string;
}

/** 图片翻译链路的稳定错误码，入口按 code 映射为用户文案 */
export type ImageTranslationErrorCode =
  | 'NO_VISION_MODEL'
  | 'IMAGE_DECODE_FAILED'
  | 'IMAGE_TOO_LARGE'
  /** 图片里没有可翻译的文字 */
  | 'NO_TEXT_IN_IMAGE'
  /** 识图请求超时（独立于文本翻译的 requestTimeout） */
  | 'VISION_TIMEOUT'
  /** 识图失败且 HTTP 400/422 明确表示模型不接受图片输入 */
  | 'VISION_MODEL_UNSUPPORTED'
  /** 识图请求返回其它 HTTP 错误 */
  | 'VISION_HTTP_ERROR'
  /** 解析失败、空响应等未知识图失败的兜底码 */
  | 'VISION_RECOGNITION_FAILED';

export class ImageTranslationError extends Error {
  constructor(
    public readonly code: ImageTranslationErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'ImageTranslationError';
  }
}
