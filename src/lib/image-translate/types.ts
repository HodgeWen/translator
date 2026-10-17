// 图片翻译共享类型与稳定错误码。识图、缓存与覆盖层共用这些契约。

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
