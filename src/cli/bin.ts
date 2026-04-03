import { basename } from 'node:path';
import { Command } from 'commander';
import { buildCommand } from './commands/build.js';
import { devCommand } from './commands/dev.js';
import { previewCommand } from './commands/preview.js';
import { regenerateCommand } from './commands/regenerate.js';

declare const __VERSION__: string;

const program = new Command();
const commandName = basename(process.argv[1] ?? 'openmanual');

program
  .name(commandName)
  .description('AI 友好的开源文档系统框架')
  .version(__VERSION__, '-v, --version');

program.addCommand(devCommand);
program.addCommand(buildCommand);
program.addCommand(previewCommand);
program.addCommand(regenerateCommand, { hidden: true });

program.parse();
