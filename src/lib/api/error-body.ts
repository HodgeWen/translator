/**
 * HTTP 错误响应体的脱敏与限长。
 *
 * 从 `api.ts` 拆出：这块是纯字符串处理，不依赖任何其它模块状态，与「请求怎么发、
 * 失败怎么降级」是两件独立的事（SMELLS「发散式变化」：错误文案策略会因合规/隐私
 * 要求单独变动，不该牵动调用链）。
 *
 * 对外契约：`api.ts` 仍 re-export 这里的全部导出，既有 `from '@/lib/api'` 导入不变。
 */

/** HTTP 错误响应体截断上限，避免把整段 HTML（或回显了密钥的响应体）塞进用户可见的错误信息 */
export const HTTP_ERROR_BODY_LIMIT = 200;

/**
 * 截断 HTTP 错误响应体：去首尾空白，超过 200 字符截断并补 `…`。
 * 文本链路与识图链路共用，保证两处错误信息长度策略一致。
 */
export function truncateHttpErrorBody(body: string): string {
  const trimmed = body.trim();
  return trimmed.length > HTTP_ERROR_BODY_LIMIT
    ? trimmed.slice(0, HTTP_ERROR_BODY_LIMIT) + '…'
    : trimmed;
}

/**
 * 错误响应体脱敏：部分服务商在 4xx/5xx 回显请求头或部分密钥
 * （如 `Invalid Authorization: Bearer sk-abc...`）。截断只控制长度、不解决泄露，
 * 因此把形似密钥的片段替换为占位符，再交给 truncateHttpErrorBody 限长。
 */
const SECRET_PATTERNS: RegExp[] = [
  // Authorization: Bearer xxx / 裸 sk- 前缀密钥
  /\bBearer\s+[A-Za-z0-9._\-]{8,}/gi,
  /\bsk-[A-Za-z0-9._\-]{8,}/gi,
  // 常见厂商密钥前缀
  /\b(?:ak|pk|api[_-]?key)[=:"]\s*[A-Za-z0-9._\-]{8,}/gi,
  // 通用长 base64/hex 风格 token（保守：仅在键名提示下命中）。
  // 值可能被引号包裹（JSON 里的 "token":"xxx"、shell 风格 token="xxx"），
  // 因此键名与分隔符之后允许一个可选的引号。
  /\b(?:token|secret|password)["']?\s*[=:]\s*["']?[A-Za-z0-9._\-]{8,}/gi,
];

export function redactHttpErrorBody(body: string): string {
  let out = body;
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, (match) => {
      // 保留键名/Bearer 前缀，便于用户判断是哪一类凭据出问题
      const head = match.match(/^[^:=]*[=:]\s*|^Bearer\s+/i)?.[0] ?? '';
      return `${head}[REDACTED]`;
    });
  }
  return out;
}

/** 错误体对外展示前的统一处理：先脱敏再限长 */
export function sanitizeHttpErrorBody(body: string): string {
  return truncateHttpErrorBody(redactHttpErrorBody(body));
}
