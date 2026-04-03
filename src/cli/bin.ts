import { readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { buildCommand } from './commands/build.js';
import { devCommand } from './commands/dev.js';
import { previewCommand } from './commands/preview.js';
import { regenerateCommand } from './commands/regenerate.js';

declare const __VERSION__: string;

function getVersion(): string {
  if (typeof __VERSION__ !== 'undefined') {
    return __VERSION__;
  }
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const pkgPath = join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version: string };
    return pkg.version;
  } catch {
    // tsx dev 模式下 __dirname 是 src/cli，需要多上一层
    try {
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const pkgPath = join(__dirname, '..', '..', 'package.json');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version: string };
      return pkg.version;
    } catch {
      return '0.0.0';
    }
  }
}

const program = new Command();
const commandName = basename(process.argv[1] ?? 'openmanual');

program
  .name(commandName)
  .description('AI 友好的开源文档系统框架')
  .version(getVersion(), '-v, --version');

program.addCommand(devCommand);
program.addCommand(buildCommand);
program.addCommand(previewCommand);
program.addCommand(regenerateCommand, { hidden: true });

program.parse();
