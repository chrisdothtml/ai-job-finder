import process from 'node:process';

export interface SpinnerOptions {
  clearAfter?: boolean;
}

export class Spinner {
  static frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  static ansi = {
    blue: '\x1b[34m',
    green: '\x1b[32m',
    reset: '\x1b[0m',
  };

  private i = 0;
  private timer?: NodeJS.Timeout;

  constructor(
    public text: string,
    private opts: SpinnerOptions = {}
  ) {}

  start() {
    if (this.timer) return this;

    const { ansi, frames } = Spinner;
    this.timer = setInterval(() => {
      const frame = frames[(this.i = (this.i + 1) % frames.length)];
      this.render(`${ansi.blue}${frame} ${this.text}${ansi.reset}`);
    }, 80);

    return this;
  }

  succeed(finalText?: string) {
    const { ansi } = Spinner;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    if (this.opts.clearAfter) {
      this.prevRenderWidth = 0;
      process.stdout.write('\r\x1b[K');
      return;
    }

    this.render(`${ansi.green}✔${ansi.reset} ${finalText ?? this.text}`);
    process.stdout.write('\n');
  }

  private prevRenderWidth = 0;
  private render(text: string) {
    const renderWidth = text.length;
    const paddingAmt = Math.max(this.prevRenderWidth - renderWidth, 0);

    this.prevRenderWidth = renderWidth;
    process.stdout.write(`\r${text}${' '.repeat(paddingAmt)}`);
  }
}
