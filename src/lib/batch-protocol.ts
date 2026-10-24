interface BatchItem {
  id: number;
  text: string;
}

interface DecodedBatch {
  translations: Map<number, string>;
  missing: number[];
  /**
   * 协议不可信标记：出现「同一 id 的标记重复」或「id 出现顺序不是单调递增」时置 true。
   *
   * 这类输入无法从文本层面区分「模型的重复/串段标记」与「正文里恰好以 <<<N>>> 开头的行」
   * （例如翻译一篇讲解本协议的文章、或代码块里就写着 <<<2>>>）。两种解释都会让某一段
   * 拿到别段的译文并写进 DOM —— 错位译文比「没有译文」更糟。因此这里只负责如实上报
   * 可疑，由调用方决定回落逐段翻译（保守但正确）。
   */
  suspicious: boolean;
}

/**
 * 标记识别：只要求出现在「行首」（允许前导空格 / Tab），不要求独占整行。
 *
 * 旧实现是 `/^<<<(\d+)>>>\s*$/gm`，即 `>>>` 之后到行尾只能是空白。真实模型
 * 经常把标记和译文写在同一行（`<<<1>>>你好`），旧正则整批匹配失败，导致
 * `translations` 为空，调用方判定协议失败并回落逐段翻译 —— 一批 5 段最坏
 * 放大成 5 次请求，成本与延迟都翻倍。
 *
 * 现在 `>>>` 之后跟换行、跟行尾空白、还是直接跟正文都算合法；行尾空白与
 * CRLF 由后续的 `trim()` 统一消化，因此这里不需要再匹配 `\s*$`。
 *
 * 仍保留行首锚定的原因：模型偶尔会在正文里原样带出 `前言 <<<1>>>` 这类
 * 字样。若行内标记也当分隔符，前面的正文会被丢弃且解析结果时对时错；
 * 行首锚定让行内标记保持「普通文本」语义，行为可预测。
 * 非法标记（`<<<abc>>>`、`<<<1>>`）根本匹配不上，自然留在正文里。
 *
 * 注意：行首锚定挡不住「正文行正好以 <<<N>>> 开头」，这类歧义由 `suspicious`
 * 上报（见 DecodedBatch.suspicious 注释）。
 */
const MARKER_RE = /^[ \t]*<<<(\d+)>>>/gm;

export function encodeBatch(items: BatchItem[]): string {
  // 生成端格式是权威：`<<<id>>>` 独占一行，下一行起为正文。
  return items.map(({ id, text }) => `<<<${id}>>>\n${text}`).join('\n');
}

/**
 * 把 `encodeBatch` 的产物还原为条目列表；无法**无歧义**还原时返回 null。
 *
 * 用途：聚合请求需要在缓存层按「单个段落」而不是「整批文本」读写（见 api.ts
 * 中逐段缓存的说明）。要按段落查缓存，就得先从请求文本里切出段落。
 *
 * 为什么必须做往返校验，而不是只按正则切分：正文里完全可能出现以 `<<<2>>>`
 * 开头的行（讲解本协议的文档页、代码块里的示例）。只按正则切分会在这类输入上
 * 切错段落，而切错比不切更糟 —— 会把残缺片段当成段落去查/写缓存，造成错误译文
 * 被复用。因此切分后立刻用 `encodeBatch` 重新拼装，只有**逐字节等于原文**才认可；
 * 否则返回 null，调用方回落到整批缓存路径（行为与修复前一致）。
 */
export function parseEncodedBatch(raw: string): BatchItem[] | null {
  // 用独立正则实例，不复用模块级的 MARKER_RE：后者被 decodeBatch 依赖
  // lastIndex 语义，共享会让两处的匹配状态互相干扰。
  const markerRe = /^[ \t]*<<<(\d+)>>>/gm;
  const items: BatchItem[] = [];
  let bodyStart: number | null = null;
  let markerCount = 0;

  let m: RegExpExecArray | null;
  while ((m = markerRe.exec(raw)) !== null) {
    markerCount++;
    // 生成端 id 恒为 1..n，与标记出现次序一一对应。
    // 不连续即说明命中了正文里的伪标记，放弃解析。
    if (Number(m[1]) !== markerCount) return null;

    if (bodyStart !== null) {
      // 上一段正文 = 上一个标记行之后 ~ 本标记行之前，去掉 encodeBatch 补的分隔换行
      const body = raw.slice(bodyStart, m.index);
      items.push({
        id: items.length + 1,
        text: body.endsWith('\n') ? body.slice(0, -1) : body,
      });
    }
    // 标记行自身占 `<<<N>>>` + 一个换行，正文从其后开始
    bodyStart = m.index + m[0].length + 1;
  }

  if (bodyStart === null) return null;
  // 最后一段一直到文本末尾（其后没有分隔换行）
  items.push({ id: items.length + 1, text: raw.slice(bodyStart) });

  // 往返校验：只有拼回去与原文完全一致，才证明切分没有歧义
  return encodeBatch(items) === raw ? items : null;
}

export function decodeBatch(raw: string, expected: number): DecodedBatch {
  type Marker = { id: number; start: number; end: number };
  const markers: Marker[] = [];

  MARKER_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MARKER_RE.exec(raw)) !== null) {
    markers.push({
      id: Number(m[1]),
      start: m.index,
      end: m.index + m[0].length,
    });
  }

  const translations = new Map<number, string>();
  let suspicious = false;

  for (let i = 0; i < markers.length; i++) {
    const cur = markers[i];
    const next = markers[i + 1];
    // 段落范围 = 本标记之后 ~ 下一个标记之前。
    // 这里先按原始切片再 trim：
    // - trim 消化 `\n`、`\r\n`、行尾空格，所以「标记与译文同行」和 CRLF 都兼容；
    // - 非法标记不在 markers 里，会完整保留在切片中，按普通文本处理。
    const segment = raw.slice(cur.end, next ? next.start : raw.length).trim();

    // 越界 id（id < 1 或 id > expected）丢弃其内容，但它已在上方充当分隔符，
    // 所以它的正文不会被并进前一段：例如 expected=2 时返回
    // `<<<1>>>\nA\n<<<3>>>\nC\n<<<2>>>\nB`，C 被丢弃而 A、B 各自完整。
    // 旧实现会把越界段存进 Map 却永远不会被取用（脏数据），这里显式过滤。
    if (cur.id < 1 || cur.id > expected) continue;

    // 空译文视为缺失：不写入 Map（后续统一进 missing）。
    // 调用方用 `translations.get(id)` 的真值判断是否写回 DOM，空串一旦入 Map
    // 会被当成翻译成功，直接把段落清空。
    if (segment.length === 0) continue;

    // 重复 id 是「不可信」信号：正常输出里每个 id 只应出现一次。
    // 它要么是模型串段（后一个更可能是正确续写），要么是正文行首恰好长得像标记。
    // 两种情况都无法判定，标记 suspicious 让调用方回落，避免把错段译文写进 DOM。
    if (translations.has(cur.id)) {
      suspicious = true;
      continue;
    }

    // 非单调递增同样不可信（首段除外）：正常协议按 1,2,3… 输出。
    // 乱序往往意味着正文里的伪标记被当成了分隔符。
    if (i > 0 && cur.id <= markers[i - 1].id) {
      suspicious = true;
    }

    translations.set(cur.id, segment);
  }

  const missing: number[] = [];
  for (let id = 1; id <= expected; id++) {
    // 空译文 / 从未出现 / 越界被过滤的 id 都落到这里，保证 missing 与
    // translations 互补：调用方可以据此只重试缺失段。
    if (!translations.has(id)) missing.push(id);
  }

  return { translations, missing, suspicious };
}
