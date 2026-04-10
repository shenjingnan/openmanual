export default {
  '*.{ts,tsx}': ['biome check --write', 'cspell --no-gitignore', 'sh -c "pnpm run typecheck"'],
  '*.js': ['biome check --write'],
  '*.json': ['biome check --write'],
  '*.md': ['cspell --no-gitignore'],
  '*.mdx': ['cspell --no-gitignore'],
};
