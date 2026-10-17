import { describe, expect, test } from 'bun:test';
import type { ImageTranslationBlock } from '../src/types';
import {
  boxToPercentRect,
  contrastRatioForHex,
  fitFontSize,
  pickContrastColor
} from '../src/lib/image-translate/layout';
import {
  clearImageTranslateState,
  getImageTranslateState,
  setImageTranslateState,
  setImageTranslateView
} from '../src/entrypoints/content/image-translate/state';
import {
  OVERLAY_LINE_HEIGHT,
  OVERLAY_MAX_FONT_SIZE,
  OVERLAY_MIN_FONT_SIZE,
  buildOverlayBlockLayouts,
  hasOverlaySizeChanged,
  imageSourceSignature,
  isOverlayBlockRenderable,
  isOverlayViewTranslation,
  nextOverlayView,
  resolveOverlayInsets,
  resolveOverlayRect
} from '../src/entrypoints/content/image-translate/overlay-model';

function makeBlock(overrides: Partial<ImageTranslationBlock> = {}): ImageTranslationBlock {
  return {
    text: 'Hello world',
    box: { x: 0.1, y: 0.2, w: 0.4, h: 0.15 },
    bgColor: '#eef2ff',
    skipped: false,
    translatedText: '你好，世界',
    ...overrides
  };
}

describe('overlay view state machine', () => {
  test('toggles between translation and original', () => {
    expect(nextOverlayView('translation')).toBe('original');
    expect(nextOverlayView('original')).toBe('translation');
    expect(nextOverlayView(nextOverlayView('translation'))).toBe('translation');
  });

  test('reports whether the translated layer should be visible', () => {
    expect(isOverlayViewTranslation('translation')).toBe(true);
    expect(isOverlayViewTranslation('original')).toBe(false);
  });
});

describe('overlay view persisted in image state', () => {
  test('records the toggled view and ignores updates after the state is cleared', () => {
    const image = {} as HTMLImageElement;
    setImageTranslateState(image, {
      status: 'translated',
      src: 'https://example.com/a.png',
      requestId: 1,
      view: 'translation'
    });

    setImageTranslateView(image, 'original');
    expect(getImageTranslateState(image)?.view).toBe('original');

    // 关闭覆盖层清掉状态后，切换按钮的残留回调不应重建状态。
    clearImageTranslateState(image);
    setImageTranslateView(image, 'translation');
    expect(getImageTranslateState(image)).toBeUndefined();
  });
});

describe('overlay block selection', () => {
  test('skips blocks already in the target language and empty translations', () => {
    expect(isOverlayBlockRenderable(makeBlock())).toBe(true);
    expect(isOverlayBlockRenderable(makeBlock({ skipped: true }))).toBe(false);
    expect(isOverlayBlockRenderable(makeBlock({ translatedText: '   ' }))).toBe(false);
    expect(isOverlayBlockRenderable(makeBlock({ translatedText: undefined }))).toBe(false);
  });

  test('builds layouts only for renderable blocks', () => {
    const layouts = buildOverlayBlockLayouts(
      [
        makeBlock(),
        makeBlock({ skipped: true, translatedText: undefined }),
        makeBlock({ translatedText: ' ' })
      ],
      800,
      600
    );

    expect(layouts).toHaveLength(1);
    expect(layouts[0].text).toBe('你好，世界');
  });
});

describe('overlay block mapping', () => {
  test('maps normalized boxes to percentage rectangles', () => {
    const block = makeBlock();
    const [layout] = buildOverlayBlockLayouts([block], 1000, 500);

    expect(layout).toMatchObject(boxToPercentRect(block.box));
    expect(layout).toMatchObject({
      left: '10%',
      top: '20%',
      width: '40%',
      height: '15%',
      backgroundColor: '#eef2ff',
      color: pickContrastColor('#eef2ff'),
      lineHeight: OVERLAY_LINE_HEIGHT
    });
  });

  test('computes font sizes from the rendered image size within overlay bounds', () => {
    const block = makeBlock();
    const width = 1200;
    const height = 800;
    const [layout] = buildOverlayBlockLayouts([block], width, height);

    expect(layout.fontSize).toBe(
      fitFontSize('你好，世界', block.box.w * width, block.box.h * height, {
        minFontSize: OVERLAY_MIN_FONT_SIZE,
        maxFontSize: OVERLAY_MAX_FONT_SIZE,
        lineHeightRatio: OVERLAY_LINE_HEIGHT
      })
    );
    expect(layout.fontSize).toBeGreaterThanOrEqual(OVERLAY_MIN_FONT_SIZE);
    expect(layout.fontSize).toBeLessThanOrEqual(OVERLAY_MAX_FONT_SIZE);

    const [small] = buildOverlayBlockLayouts([block], 200, 120);
    expect(small.fontSize).toBeLessThanOrEqual(layout.fontSize);
    expect(small.fontSize).toBeGreaterThanOrEqual(OVERLAY_MIN_FONT_SIZE);

    const [zero] = buildOverlayBlockLayouts([block], 0, 0);
    expect(zero.fontSize).toBe(OVERLAY_MIN_FONT_SIZE);
  });

  test('picks text colors meeting 4.5:1 contrast for sampled backgrounds', () => {
    const backgrounds = ['#ffffff', '#000000', '#777777', '#123456', '#abc', '#ff00ff80', '#eef2ff'];

    for (const bgColor of backgrounds) {
      const [layout] = buildOverlayBlockLayouts([makeBlock({ bgColor })], 800, 600);
      const ratio = contrastRatioForHex(layout.color, layout.backgroundColor);
      expect(ratio).not.toBeNull();
      expect(ratio!).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('trims translated text before rendering', () => {
    const [layout] = buildOverlayBlockLayouts(
      [makeBlock({ translatedText: '  translated line  ' })],
      800,
      600
    );

    expect(layout.text).toBe('translated line');
  });
});

describe('overlay geometry', () => {
  test('subtracts border and padding from the image border box', () => {
    const insets = resolveOverlayInsets({
      borderTopWidth: '2px',
      borderRightWidth: '1.5px',
      borderBottomWidth: '0px',
      borderLeftWidth: '3px',
      paddingTop: '4px',
      paddingRight: '2px',
      paddingBottom: '6px',
      paddingLeft: '1px'
    });

    expect(insets).toEqual({ top: 6, right: 3.5, bottom: 6, left: 4 });
    expect(
      resolveOverlayRect({ left: 100, top: 200, width: 400, height: 300 }, insets)
    ).toEqual({ left: 104, top: 206, width: 392.5, height: 288 });
  });

  test('ignores invalid or negative insets and clamps empty areas', () => {
    const insets = resolveOverlayInsets({
      borderTopWidth: 'auto',
      borderRightWidth: '',
      borderBottomWidth: '-4px',
      borderLeftWidth: '3px',
      paddingTop: '0',
      paddingRight: '1px',
      paddingBottom: '2px',
      paddingLeft: '1px'
    });

    expect(insets).toEqual({ top: 0, right: 1, bottom: 2, left: 4 });
    expect(
      resolveOverlayRect({ left: 0, top: 0, width: 3, height: 3 }, insets)
    ).toEqual({ left: 4, top: 0, width: 0, height: 1 });
  });

  test('only reports size changes larger than the epsilon', () => {
    expect(hasOverlaySizeChanged({ width: 100, height: 100 }, { width: 100.4, height: 100.4 })).toBe(
      false
    );
    expect(hasOverlaySizeChanged({ width: 100, height: 100 }, { width: 100.6, height: 100 })).toBe(
      true
    );
    expect(hasOverlaySizeChanged({ width: 0, height: 0 }, { width: 0.6, height: 0 })).toBe(true);
  });

  test('snapshots src and srcset to detect image replacement', () => {
    expect(imageSourceSignature('a.png', 'a-2x.png')).toBe(imageSourceSignature('a.png', 'a-2x.png'));
    expect(imageSourceSignature('a.png', 'a-2x.png')).not.toBe(
      imageSourceSignature('a.png', 'a-3x.png')
    );
    expect(imageSourceSignature('a.png', null)).not.toBe(imageSourceSignature('b.png', null));
    expect(imageSourceSignature(null, null)).not.toBe(imageSourceSignature('', null));
  });
});
