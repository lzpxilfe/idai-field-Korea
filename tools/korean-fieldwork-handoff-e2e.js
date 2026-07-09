const http = require('http');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const desktopRoot = path.resolve(__dirname, '..', 'desktop');
const nodeExecutable = process.execPath;
const readinessUrl = 'http://localhost:4200/dist/';
const readinessTimeoutMs = 240000;

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

function runProcess(command, args) {
  return new Promise(resolve => {
    const child = spawn(command, args, {
      cwd: desktopRoot,
      env: process.env,
      stdio: 'inherit'
    });

    child.on('exit', (code, signal) => {
      resolve(signal ? 1 : code || 0);
    });
  });
}

function stopServer() {
  if (!serverProcess || serverProcess.killed) return;

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(serverProcess.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    serverProcess.kill('SIGTERM');
  }
}

async function main() {
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
    stdio: 'inherit'
  });

  serverProcess.on('exit', (code, signal) => {
    serverExited = true;
    serverExitDescription = signal ? `signal ${signal}` : `exit code ${code}`;
  });

  try {
    await waitForServer(readinessUrl, readinessTimeoutMs);
    console.log('Angular dev server is ready. Running handoff E2E spec...');

    const exitCode = await runProcess(nodeExecutable, [
      'node_modules/@playwright/test/cli.js',
      'test',
      'test/e2e/korean-fieldwork/report-handoff.spec.ts',
      '--config=test/e2e/playwright.config.ts',
      '--reporter=list',
      '--timeout=180000',
      '--retries=0'
    ]);

    process.exitCode = exitCode;
  } finally {
    stopServer();
  }
}

main().catch(error => {
  console.error(error);
  stopServer();
  process.exitCode = 1;
});
