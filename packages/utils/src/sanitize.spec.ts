import { describe, it, expect } from "vitest";
import { sanitizeHtml, safeHtml } from "./sanitize";

describe("sanitizeHtml", () => {
  it("deve remover tags <script> e seu conteúdo", () => {
    const malicious = '<p>Olá mundo!</p><script>alert("hacked");</script>';
    const result = sanitizeHtml(malicious);
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("alert");
    expect(result).toContain("<p>Olá mundo!</p>");
  });

  it("deve remover manipuladores de evento inline como onerror e onclick", () => {
    const malicious = '<img src="invalid.jpg" onerror="alert(1)" alt="teste">';
    const result = sanitizeHtml(malicious);
    expect(result).not.toContain("onerror");
    expect(result).not.toContain("alert(1)");
    expect(result).toContain('src="invalid.jpg"');
    expect(result).toContain('alt="teste"');
  });

  it("deve neutralizar URLs com protocolo javascript: em links", () => {
    const malicious = '<a href="javascript:alert(document.cookie)">Clique aqui</a>';
    const result = sanitizeHtml(malicious);
    expect(result).not.toContain("javascript:");
    expect(result).toContain('href="#"');
    expect(result).toContain("Clique aqui");
  });

  it("deve remover iframe e embeds maliciosos", () => {
    const malicious = '<div>Texto legítimo<iframe src="https://attacker.com"></iframe></div>';
    const result = sanitizeHtml(malicious);
    expect(result).not.toContain("<iframe");
    expect(result).not.toContain("attacker.com");
    expect(result).toContain("<div>Texto legítimo</div>");
  });

  it("deve preservar tags seguras de formatação (b, i, strong, p, span, br)", () => {
    const safeInput = "<p>Proposta <strong>Solar</strong> com taxa de <em>5%</em> ao mês.<br></p>";
    const result = sanitizeHtml(safeInput);
    expect(result).toBe(
      "<p>Proposta <strong>Solar</strong> com taxa de <em>5%</em> ao mês.<br></p>"
    );
  });

  it("safeHtml deve retornar o formato pronto para dangerouslySetInnerHTML", () => {
    const input = "<b>Economia estimada</b><script>eval()</script>";
    const output = safeHtml(input);
    expect(output).toEqual({ __html: "<b>Economia estimada</b>" });
  });
});
