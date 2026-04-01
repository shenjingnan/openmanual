const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
} as const;

function timestamp(): string {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false });
}

export const logger = {
  info(msg: string): void {
    console.log(
      `${COLORS.gray}[${timestamp()}]${COLORS.reset} ${COLORS.cyan}info${COLORS.reset} ${msg}`
    );
  },

  success(msg: string): void {
    console.log(
      `${COLORS.gray}[${timestamp()}]${COLORS.reset} ${COLORS.green}done${COLORS.reset} ${msg}`
    );
  },

  warn(msg: string): void {
    console.warn(
      `${COLORS.gray}[${timestamp()}]${COLORS.reset} ${COLORS.yellow}warn${COLORS.reset} ${msg}`
    );
  },

  error(msg: string): void {
    console.error(
      `${COLORS.gray}[${timestamp()}]${COLORS.reset} ${COLORS.red}error${COLORS.reset} ${msg}`
    );
  },

  step(msg: string): void {
    console.log(
      `${COLORS.gray}[${timestamp()}]${COLORS.reset} ${COLORS.bold}→${COLORS.reset} ${msg}`
    );
  },
};
