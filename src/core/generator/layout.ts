import type { LogoConfig } from '../config/schema.js';

const IMAGE_EXTENSIONS = ['.svg', '.png', '.jpg', '.jpeg', '.webp'];

export function isImagePath(value: string): boolean {
  if (value.startsWith('/')) return true;
  return IMAGE_EXTENSIONS.some((ext) => value.toLowerCase().endsWith(ext));
}

export function resolveLogoPaths(logo: LogoConfig): { light: string; dark: string } {
  if (typeof logo === 'string') {
    return { light: logo, dark: logo };
  }
  return { light: logo.light, dark: logo.dark };
}
