/**
 * Lista de tags potencialmente perigosas que devem ser completamente removidas
 * juntamente com seu conteúdo interno.
 */
const BLOCKED_TAGS_WITH_CONTENT = [
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "applet",
  "noembed",
  "noframes",
  "noscript",
  "frame",
  "frameset",
];

/**
 * Tags permitidas para formatação segura de texto rico e templates.
 */
const ALLOWED_TAGS = new Set([
  "a",
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "strike",
  "p",
  "br",
  "hr",
  "span",
  "div",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "pre",
  "code",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "img",
  "small",
  "sub",
  "sup",
  "mark",
]);

/**
 * Atributos permitidos em tags HTML seguras.
 */
const ALLOWED_ATTRIBUTES = new Set([
  "class",
  "className",
  "style",
  "align",
  "href",
  "target",
  "rel",
  "src",
  "alt",
  "title",
  "width",
  "height",
  "border",
  "cellpadding",
  "cellspacing",
  "colspan",
  "rowspan",
]);

/**
 * Sanitiza uma string HTML removendo scripts maliciosos, manipuladores de evento
 * (onload, onerror, onclick, etc.), protocolos perigosos (javascript:, data:)
 * e tags não autorizadas.
 *
 * Funciona de forma isomórfica (tanto no Node.js SSR quanto no navegador).
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty || typeof dirty !== "string") return "";

  let clean = dirty;

  // 1. Remove tags perigosas com todo o conteúdo interno (ex: <script>...</script>)
  for (const tag of BLOCKED_TAGS_WITH_CONTENT) {
    const regex = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi");
    clean = clean.replace(regex, "");
    // Remove também tags auto-fechadas ou orfãs (ex: <script ... />)
    const selfClosingRegex = new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi");
    clean = clean.replace(selfClosingRegex, "");
  }

  // 2. Remove manipuladores de evento inline (on*)
  clean = clean.replace(/\s+on[a-zA-Z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, "");

  // 3. Remove chamadas perigosas em atributos href/src (javascript:, vbscript:, data:text/html)
  clean = clean.replace(
    /\b(href|src)\s*=\s*(['"]?)\s*(?:javascript|vbscript|data\s*:\s*text\/html)[^'">\s]*\2/gi,
    '$1="#"'
  );

  // 4. Garante que links externos com target="_blank" contenham rel="noopener noreferrer"
  clean = clean.replace(
    /<a\b([^>]*?)target\s*=\s*['"]_blank['"]([^>]*?)>/gi,
    (match, before, after) => {
      if (/rel\s*=/i.test(match)) {
        return match.replace(/rel\s*=\s*['"][^'"]*['"]/gi, 'rel="noopener noreferrer"');
      }
      return `<a${before}target="_blank" rel="noopener noreferrer"${after}>`;
    }
  );

  // 5. Filtra tags desconhecidas ou não permitidas mantendo apenas as aprovadas
  clean = clean.replace(
    /<\/?([a-zA-Z0-9-]+)(\s[^>]*)?\/?>/g,
    (fullMatch, tagName: string, attributes: string | undefined) => {
      const lowerTag = tagName.toLowerCase();
      const isClosing = fullMatch.startsWith("</");

      if (!ALLOWED_TAGS.has(lowerTag)) {
        return "";
      }

      if (isClosing) {
        return `</${lowerTag}>`;
      }

      // Filtrar atributos permitidos
      if (!attributes) {
        return `<${lowerTag}>`;
      }

      const attrRegex = /([a-zA-Z0-9-]+)(?:\s*=\s*(?:'([^']*)'|"([^"]*)"|([^\s>]+)))?/g;
      let match: RegExpExecArray | null;
      const sanitizedAttrs: string[] = [];

      while ((match = attrRegex.exec(attributes)) !== null) {
        const attrName = match[1]?.toLowerCase() ?? "";
        const attrValue = match[2] ?? match[3] ?? match[4] ?? "";

        if (ALLOWED_ATTRIBUTES.has(attrName)) {
          // Bloquear css expressions ou javascript em styles
          if (attrName === "style" && /expression|javascript|behavior|vbscript/i.test(attrValue)) {
            continue;
          }
          sanitizedAttrs.push(`${attrName}="${attrValue.replace(/"/g, "&quot;")}"`);
        }
      }

      const attrString = sanitizedAttrs.length > 0 ? " " + sanitizedAttrs.join(" ") : "";
      const isSelfClosing = fullMatch.trim().endsWith("/>");
      return `<${lowerTag}${attrString}${isSelfClosing ? " />" : ">"}`;
    }
  );

  return clean;
}

/**
 * Retorna o objeto esperado pelo React `dangerouslySetInnerHTML` de forma segura.
 */
export function safeHtml(dirty: string | null | undefined): { __html: string } {
  return { __html: sanitizeHtml(dirty) };
}
