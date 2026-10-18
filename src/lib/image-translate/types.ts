// 图片翻译共享类型与稳定错误码。识图、缓存与覆盖层共用这些契约。

/** 图片翻译的两种输入来源：网页 http(s) 图片或页面/popup 侧读到的 data URL */
export type ImageSource =
  | { kind: 'url'; url: string; pageUrl?: string }
  | { kind: 'dataUrl'; dataUrl: string };

/** 相对原图归一化的矩形，取值 0–1 */
export interface ImageBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 视觉模型识别出的一个文字块 */
export interface ImageTextBlock {
  text: string;
  box: ImageBox;
}

/** 已采样背景色、可供覆盖层使用（或写入识别缓存）的文字块 */
export interface RecognizedImageBlock extends ImageTextBlock {
  bgColor: string;
}

/** 识图成功的结果：按阅读顺序排列的文字块与命中的模型 */
export interface VisionRecognitionResult {
  blocks: ImageTextBlock[];
  providerId: string;
  modelId: string;
}

/** 图片翻译链路的稳定错误码，入口按 code 映射为用户文案 */
export type ImageTranslationErrorCode =
  | 'NO_VISION_MODEL'
  | 'IMAGE_FETCH_FAILED'
  | 'IMAGE_DECODE_FAILED'
  | 'IMAGE_TOO_LARGE'
  /** 识图请求超时（独立于文本翻译的 requestTimeout） */
  | 'VISION_TIMEOUT'
  /** 识图失败且 HTTP 400/422 明确表示模型不接受图片输入 */
  | 'VISION_MODEL_UNSUPPORTED'
  /** 识图请求返回其它 HTTP 错误 */
  | 'VISION_HTTP_ERROR'
  /** 解析失败、空响应等未知识图失败的兜底码 */
  | 'VISION_RECOGNITION_FAILED'
  | 'TRANSLATION_ALL_FAILED';

export class ImageTranslationError extends Error {
  constructor(
    public readonly code: ImageTranslationErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'ImageTranslationError';
  }
}
