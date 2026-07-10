#!/usr/bin/env node

const { spawnSync } = require('child_process');

const args = process.argv.slice(2);

if (args.length === 0) {
    console.error('Usage: node tools/ci-retry-command.js <command> [args...]');
    process.exit(2);
}

const attempts = Number.parseInt(process.env.CI_RETRY_ATTEMPTS ?? '3', 10);
const delayMs = Number.parseInt(process.env.CI_RETRY_DELAY_MS ?? '15000', 10);
const maxAttempts = Number.isFinite(attempts) && attempts > 0 ? attempts : 3;
const retryDelayMs = Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : 15000;

function sleep(milliseconds) {
    if (milliseconds <= 0) return;

    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

let exitCode = 1;

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`ci-retry: attempt ${attempt}/${maxAttempts}: ${args.join(' ')}`);

    const result = spawnSync(args[0], args.slice(1), {
        stdio: 'inherit',
        shell: process.platform === 'win32'
    });

    if (result.error) {
        console.error(`ci-retry: ${result.error.message}`);
        exitCode = 1;
    } else if (result.status === 0) {
        process.exit(0);
    } else {
        exitCode = result.status ?? 1;
    }

    if (attempt < maxAttempts) {
        console.log(`ci-retry: command failed; retrying in ${Math.round(retryDelayMs / 1000)}s.`);
        sleep(retryDelayMs);
    }
}

process.exit(exitCode);
