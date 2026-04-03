import { Command } from 'commander';
import { buildCommand } from './commands/build.js';
import { devCommand } from './commands/dev.js';
import { previewCommand } from './commands/preview.js';
import { regenerateCommand } from './commands/regenerate.js';

const program = new Command();

program.name('openmanual').description('AI 友好的开源文档系统框架').version('0.1.0');

program.addCommand(devCommand);
program.addCommand(buildCommand);
program.addCommand(previewCommand);
program.addCommand(regenerateCommand);

program.parse();
