import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function luminance(hex: string) {
  const [red, green, blue] = hex.match(/\w\w/g)!.map(value => {
    const channel = parseInt(value, 16) / 255;
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  });
  return .2126 * red + .7152 * green + .0722 * blue;
}
function contrast(foreground: string, background: string) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
}
const css = readFileSync(new URL('./global.css', import.meta.url), 'utf8');
const token = (name: string) => css.match(new RegExp(`--${name}: (#[0-9a-f]{6});`))![1];

describe('accessible palette', () => {
  it.each(['#ffffff', '#f1f3f7', '#f7f9fd', '#dae5f5', '#c2d4ee', '#e6edf6', '#e3eaf3'])('keeps normal and supporting text above 4.5:1 on %s', background => {
    expect(contrast(token('text'), background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('muted'), background)).toBeGreaterThanOrEqual(4.5);
  });
  it('keeps white text on primary buttons above 4.5:1', () => {
    expect(contrast('#ffffff', token('primary'))).toBeGreaterThanOrEqual(4.5);
  });
  it.each(['#ffffff', '#f1f3f7'])('keeps input outlines and focus indicators above 3:1 on %s', background => {
    expect(contrast(token('control-border'), background)).toBeGreaterThanOrEqual(3);
    expect(contrast(token('primary-dark'), background)).toBeGreaterThanOrEqual(3);
  });
});
