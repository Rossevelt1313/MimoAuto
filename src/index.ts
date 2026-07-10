#!/usr/bin/env node

import chalk from 'chalk';
import logUpdate from 'log-update';
import prompts from 'prompts';

import { config, validateGmailConfig } from './config';
import { runWorker, WorkerResult } from './worker';
import { loadProxies } from './proxy';
import { initTui, getTui } from './tui';

type EmailMethod = 'tempmail' | 'gmail';

function printBanner(): void {
  console.log('');
  console.log(chalk.cyan('═'.repeat(60)));
  console.log(chalk.cyan('║'));
  console.log(chalk.cyan('║   ') + chalk.bold.yellow('Xiaomi MiMo API Key Generator'));
  console.log(chalk.cyan('║'));
  console.log(chalk.cyan('║   ') + chalk.gray('  Single temp-mail account flow'));
  console.log(chalk.cyan('║'));
  console.log(chalk.cyan('═'.repeat(60)));
  console.log('');
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

async function main(): Promise<void> {
  printBanner();
  const answers = await prompts({
    type: 'select',
    name: 'emailMethod',
    message: 'Email method?',
    choices: [
      { title: 'Temp mail', value: 'tempmail' },
      { title: 'Gmail asli dari .env', value: 'gmail' },
    ],
    initial: 0,
  });
  const emailMethod = (answers.emailMethod || 'tempmail') as EmailMethod;
  if (emailMethod === 'gmail') validateGmailConfig();

  const allProxies = loadProxies();
  const proxyAnswer = allProxies.length
    ? await prompts({
        type: 'confirm',
        name: 'enabled',
        message: `Use first proxy from proxy.txt?`,
        initial: false,
      })
    : { enabled: false };
  const proxy = proxyAnswer.enabled ? allProxies[0] : undefined;
  console.log(`  📧 Method:       ${chalk.cyan(emailMethod === 'gmail' ? `Gmail (${config.gmailUsername})` : 'Temp Mail')}`);
  console.log(`  📢 Accounts:     ${chalk.yellow(1)}`);
  console.log(`  🧵 Concurrency:  ${chalk.yellow(1)}`);
  console.log(`  🧭 Browser:      ${chalk.yellow(config.headless ? 'headless' : 'headed')}`);
  console.log(`  🌐 Proxy:        ${proxy ? chalk.yellow(`${proxy.protocol}://${proxy.ip}:${proxy.port}`) : chalk.gray('disabled')}`);
  console.log(`  📁 Output:       ${chalk.green('output/success_keys.txt')} / ${chalk.red('output/failed_accounts.csv')}`);
  console.log('');

  initTui({ totalAccounts: 1, concurrency: 1, headless: config.headless, emailMethod: emailMethod === 'gmail' ? 'Gmail' : 'Temp Mail' });

  const result: WorkerResult = await runWorker({
    email: emailMethod === 'gmail' ? config.gmailUsername : 'tempmail',
    emailMethod,
    proxy,
  });

  getTui().stopAutoRefresh();
  getTui().markDone();
  logUpdate.done();

  console.log('');
  console.log(chalk.gray('─'.repeat(80)));
  console.log('');
  console.log(chalk.bold('  📊 Summary'));
  console.log('');
  console.log(`     Email:       ${chalk.bold(result.email)}`);
  console.log(`     Status:      ${result.status === 'SUCCESS' ? chalk.green.bold(result.status) : chalk.red.bold(result.status)}`);
  if (result.apiKey) console.log(`     1. ${chalk.bold(result.apiKey)}`);
  console.log(`     Total time:  ${chalk.bold(formatDuration(result.elapsed))}`);
  if (result.error) console.log(`     Error:       ${chalk.red(result.error)}`);
  console.log('');

  process.exit(result.status === 'SUCCESS' ? 0 : 1);
}

main().catch((err) => {
  logUpdate.done();
  console.error(chalk.red(`\n  ❌ Fatal error: ${err.message}\n`));
  process.exit(1);
});
