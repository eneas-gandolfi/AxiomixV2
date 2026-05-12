import { describe, it, expect } from "vitest";
import { stripMessageHtml } from "../strip-message-html";

describe("stripMessageHtml", () => {
  it("removes <p> wrapping", () => {
    expect(stripMessageHtml("<p>olá</p>")).toBe("olá");
  });

  it("removes multi-line <p> blocks", () => {
    expect(stripMessageHtml("<p>linha 1</p><p>linha 2</p>")).toBe("linha 1linha 2");
  });

  it("removes <br>, <br/>, <br /> variants", () => {
    expect(stripMessageHtml("a<br>b<br/>c<br />d")).toBe("abcd");
  });

  it("removes nested formatting tags", () => {
    expect(stripMessageHtml("<p><strong>negrito</strong></p>")).toBe("negrito");
  });

  it("decodes common entities", () => {
    expect(stripMessageHtml("foo&nbsp;bar")).toBe("foo bar");
    expect(stripMessageHtml("&amp;")).toBe("&");
    expect(stripMessageHtml("&quot;ok&quot;")).toBe('"ok"');
  });

  it("preserves user text that looks tag-like but is not a known tag", () => {
    expect(stripMessageHtml("<3 voce")).toBe("<3 voce");
    expect(stripMessageHtml("<= 5 itens")).toBe("<= 5 itens");
  });

  it("returns empty string for null/undefined/empty", () => {
    expect(stripMessageHtml(null)).toBe("");
    expect(stripMessageHtml(undefined)).toBe("");
    expect(stripMessageHtml("")).toBe("");
  });

  it("preserves whitespace inside but trims outer", () => {
    expect(stripMessageHtml("  <p>oi   mundo</p>  ")).toBe("oi   mundo");
  });

  it("strips paragraph attributes", () => {
    expect(stripMessageHtml('<p class="x" style="color:red">texto</p>')).toBe("texto");
  });

  it("leaves plain text untouched", () => {
    expect(stripMessageHtml("boa noite")).toBe("boa noite");
    expect(stripMessageHtml("esse valor não podemos fazer")).toBe(
      "esse valor não podemos fazer",
    );
  });
});
