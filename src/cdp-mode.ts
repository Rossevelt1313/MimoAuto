#!/usr/bin/env node

import chalk from 'chalk';
import logUpdate from 'log-update';
import prompts from 'prompts';

import { config, validateGmailConfig } from './config';
import { runWorker } from './worker';
import { getProxyByIndex, loadProxies, proxyToString } from './proxy';
import { initTui, getTui } from './tui';

type EmailMethod = 'tempmail' | 'gmail';

async function waitForCdp(): Promise<void> {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(process.env.CDP_ENDPOINT || 'http://127.0.0.1:9222/json/version');
      if (res.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('CDP not reachable at http://127.0.0.1:9222. Run start-chrome-debug.bat first, wait Chrome open.');
}

async function main(): Promise<void> {
  console.log('');
  console.log(chalk.cyan('═'.repeat(70)));
  console.log(chalk.bold.yellow('  Xiaomi MiMo CDP Mode'));
  console.log(chalk.cyan('═'.repeat(70)));
  console.log('');

  process.env.HEADLESS = 'false';

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
        message: `Use ${allProxies.length} proxy from proxy.txt?`,
        initial: false,
      })
    : { enabled: false };
  const hasProxy = proxyAnswer.enabled === true;
  if (hasProxy) delete process.env.USE_CDP;

  if (!hasProxy) {
    process.env.USE_CDP = '1';
    console.log(chalk.blue('📡 No proxy → CDP mode, connecting to Chrome...'));
    console.log(chalk.gray(`   Endpoint: ${process.env.CDP_ENDPOINT || 'http://127.0.0.1:9222'}`));
    console.log('');
    await waitForCdp();
  } else {
    console.log(chalk.blue('📡 Proxy detected → launching fresh Chrome per run'));
    console.log('');
  }

  let run = 0;

  if (hasProxy) console.log(chalk.green(`  ✓ ${allProxies.length} proxy enabled, rotating per run`));
  else if (allProxies.length) console.log(chalk.gray('  Proxy disabled — using CDP without proxy'));
  else console.log(chalk.yellow('  ⚠ No proxy.txt found — all runs use same IP'));
  console.log('');

  while (true) {
    run++;
    const proxy = hasProxy ? getProxyByIndex(allProxies, run - 1) : undefined;
    const delay = 30 + Math.floor(Math.random() * 31); // 30-60s

    if (!hasProxy) {
      await waitForCdp();
    }
    console.log(chalk.gray(`  Run #${run} | Proxy: ${proxyToString(proxy)}`));
    initTui({ totalAccounts: 1, concurrency: 1, headless: false, emailMethod: `${emailMethod === 'gmail' ? 'Gmail' : 'Temp Mail'} (loop #${run})` });

    const result = await runWorker({
      email: emailMethod === 'gmail' ? config.gmailUsername : 'tempmail',
      emailMethod,
      proxy,
    });

    getTui().stopAutoRefresh();
    getTui().markDone();
    logUpdate.done();

    if (result.error) console.log(`     Error:      ${chalk.red(result.error)}`);
    console.log(chalk.gray(`     Cooling down ${delay}s before next run... Ctrl+C to stop.`));
    await new Promise(resolve => setTimeout(resolve, delay * 1000));
  }
}

main().catch((err) => {
  logUpdate.done();
  console.error(chalk.red('\n❌ CDP Error:'), err.message);
  console.log('');
  console.log('Start Chrome first:');
  console.log('  start-chrome-debug.bat');
  console.log('Or open Chrome with:');
  console.log('  chrome.exe --remote-debugging-port=9222');
  console.log('');
  process.exit(1);
});
