const http = require('http');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const desktopRoot = path.resolve(__dirname, '..', 'desktop');
const nodeExecutable = process.execPath;
const readinessUrl = 'http://localhost:4200/dist/';
const readinessTimeoutMs = 240000;
const handoffRunTimeoutMs = 8 * 60 * 1000;

let serverProcess;
let serverExited = false;
let serverExitDescription = '';

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function requestUrl(url) {
  return new Promise(resolve => {
    const request = http.get(url, response => {
      response.resume();
      resolve(response.statusCode && response.statusCode < 500);
    });

    request.on('error', () => resolve(false));
    request.setTimeout(5000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(url, timeoutMs) {
  const startedAt = Date.now();

  while ((Date.now() - startedAt) < timeoutMs) {
    if (serverExited) {
      throw new Error(`Angular dev server exited before it became ready: ${serverExitDescription}`);
    }

    if (await requestUrl(url)) return;
    await wait(1000);
  }

  throw new Error(`Timed out waiting for Angular dev server at ${url}`);
}

function stopProcessTree(child) {
  if (!child || child.killed) return;

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }

  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch (_) {
    child.kill('SIGTERM');
  }
}

function runProcess(command, args, timeoutMs) {
  return new Promise(resolve => {
    let settled = false;
    const child = spawn(command, args, {
      cwd: desktopRoot,
      env: process.env,
      stdio: 'inherit',
      detached: process.platform !== 'win32'
    });

    const timeout = timeoutMs
      ? setTimeout(() => {
        if (settled) return;
        settled = true;
        console.error(`Timed out after ${timeoutMs}ms: ${command} ${args.join(' ')}`);
        stopProcessTree(child);
        resolve(1);
      }, timeoutMs)
      : undefined;

    child.on('exit', (code, signal) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      resolve(signal ? 1 : code || 0);
    });
  });
}

function stopServer() {
  stopProcessTree(serverProcess);
}

async function main() {
  let exitCode = 1;

  console.log('Starting Angular dev server for Korean fieldwork handoff E2E...');

  serverProcess = spawn(nodeExecutable, [
    'node_modules/@angular/cli/bin/ng.js',
    'serve',
    '--serve-path=dist',
    '--watch=false',
    '--live-reload=false'
  ], {
    cwd: desktopRoot,
    env: process.env,
    stdio: 'inherit',
    detached: process.platform !== 'win32'
  });

  serverProcess.on('exit', (code, signal) => {
    serverExited = true;
    serverExitDescription = signal ? `signal ${signal}` : `exit code ${code}`;
  });

  try {
    await waitForServer(readinessUrl, readinessTimeoutMs);
    console.log('Angular dev server is ready. Running handoff E2E spec...');

    exitCode = await runProcess(nodeExecutable, [
      'node_modules/@playwright/test/cli.js',
      'test',
      'test/e2e/korean-fieldwork/report-handoff.spec.ts',
      '--config=test/e2e/playwright.config.ts',
      '--reporter=list',
      '--timeout=180000',
      '--global-timeout=420000',
      '--retries=0'
    ], handoffRunTimeoutMs);

  } finally {
    stopServer();
  }

  return exitCode;
}

main().then(exitCode => {
  process.exit(exitCode);
}).catch(error => {
  console.error(error);
  stopServer();
  process.exit(1);
});
