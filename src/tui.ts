import chalk from 'chalk';
import logUpdate from 'log-update';

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export interface WorkerState {
  workerId: number;
  email: string;
  status: string;
  startTime: number;
  proxy?: string;
}

interface TuiState {
  totalAccounts: number;
  concurrency: number;
  headless: boolean;
  emailMethod: string;
  workers: WorkerState[];
  completed: number;
  successCount: number;
  failedCount: number;
  startTime: number;
  finishedWorkers: string[];
  isDone: boolean;
}

class TuiManager {
  private state: TuiState;
  private spinnerIndex = 0;
  private renderInterval: ReturnType<typeof setInterval> | null = null;

  constructor(opts: {
    totalAccounts: number;
    concurrency: number;
    headless: boolean;
    emailMethod: string;
  }) {
    this.state = {
      ...opts,
      workers: Array.from({ length: opts.concurrency }, (_, index) => ({
        workerId: index + 1,
        email: '',
        status: 'idle',
        startTime: Date.now(),
      })),
      completed: 0,
      successCount: 0,
      failedCount: 0,
      startTime: Date.now(),
      finishedWorkers: [],
      isDone: false,
    };
  }

  claimWorker(email: string, proxy?: string): number {
    const worker = this.state.workers.find(({ status }) => status === 'idle');
    if (!worker) throw new Error('No idle worker slot available');

    Object.assign(worker, {
      email,
      proxy,
      status: 'starting browser...',
      startTime: Date.now(),
    });
    return worker.workerId;
  }

  freeWorker(workerId: number, result: 'SUCCESS' | 'FAILED'): void {
    const worker = this.state.workers.find((item) => item.workerId === workerId);
    if (!worker) return;

    const elapsed = Math.floor((Date.now() - worker.startTime) / 1000);
    const summary = `W${workerId} · ${maskEmail(worker.email)} · ${elapsed}s`;
    this.state.finishedWorkers.push(
      result === 'SUCCESS'
        ? chalk.green(`✓ ${summary}`)
        : chalk.red(`✗ ${summary}`)
    );

    worker.email = '';
    worker.proxy = undefined;
    worker.status = 'idle';
    this.state.completed++;
    if (result === 'SUCCESS') this.state.successCount++;
    else this.state.failedCount++;
  }

  updateWorker(workerId: number, status: string): void {
    const worker = this.state.workers.find((item) => item.workerId === workerId);
    if (worker) worker.status = status;
  }

  markDone(): void {
    this.state.isDone = true;
  }

  private buildOutput(): string {
    const now = Date.now();
    const mode = this.state.headless ? 'headless' : 'headed';
    const lines = [
      chalk.bold('MiMo Key Generator'),
      chalk.gray(`${this.state.emailMethod} · ${mode} · ${this.state.concurrency} worker`),
      '',
    ];

    for (const worker of this.state.workers) {
      if (worker.status === 'idle') continue;
      const spinner = chalk.cyan(SPINNER_FRAMES[this.spinnerIndex % SPINNER_FRAMES.length]);
      const elapsed = Math.floor((now - worker.startTime) / 1000);
      const proxy = worker.proxy ? chalk.gray(` · ${worker.proxy}`) : '';
      lines.push(`${spinner} ${maskEmail(worker.email)} · ${worker.status} · ${elapsed}s${proxy}`);
    }

    if (this.state.finishedWorkers.length) lines.push(...this.state.finishedWorkers, '');
    lines.push(
      `${this.state.completed}/${this.state.totalAccounts} · ` +
      `${chalk.green(`${this.state.successCount} success`)} · ` +
      `${chalk.red(`${this.state.failedCount} failed`)} · ` +
      chalk.gray(formatDuration((now - this.state.startTime) / 1000))
    );

    return lines.join('\n');
  }

  render(): void {
    if (!this.state.isDone) logUpdate(this.buildOutput());
  }

  startAutoRefresh(): void {
    if (this.renderInterval) return;
    this.renderInterval = setInterval(() => {
      this.spinnerIndex++;
      this.render();
    }, 200);
  }

  stopAutoRefresh(): void {
    if (!this.renderInterval) return;
    clearInterval(this.renderInterval);
    this.renderInterval = null;
  }
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const suffix = domain.includes('.') ? domain.slice(domain.lastIndexOf('.')) : '';
  return `${local.slice(0, 2)}***@***${suffix}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 0 || !Number.isFinite(seconds)) return '--';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

let instance: TuiManager | null = null;

export function initTui(opts: {
  totalAccounts: number;
  concurrency: number;
  headless: boolean;
  emailMethod: string;
}): TuiManager {
  instance = new TuiManager(opts);
  instance.startAutoRefresh();
  return instance;
}

export function getTui(): TuiManager {
  if (!instance) throw new Error('TUI not initialized. Call initTui() first.');
  return instance;
}
