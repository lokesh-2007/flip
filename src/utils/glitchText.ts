const GLITCH_GLYPHS = '░▒▓█#%&@?!01XZ';

/**
 * Deterministically scrambles characters in a string during Glitch Storm
 * based on a rotating tick integer so React renders stay predictable and crisp.
 */
export function scrambleGlitchText(text: string, tick: number, intensity = 0.45): string {
  if (!text || intensity <= 0) return text;
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === ' ' || ch === '·' || ch === '/') {
      out += ch;
      continue;
    }
    const hash = ((i * 73 + tick * 131 + ch.charCodeAt(0) * 17) >>> 0) % 100;
    if (hash < intensity * 100) {
      const glyphIdx = ((i * 29 + tick * 47 + ch.charCodeAt(0)) >>> 0) % GLITCH_GLYPHS.length;
      out += GLITCH_GLYPHS[glyphIdx];
    } else {
      out += ch;
    }
  }
  return out;
}
