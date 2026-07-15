#!/usr/bin/env node

'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

const repoDir = path.resolve(__dirname, '..');
const mobileDir = fs.realpathSync(path.join(repoDir, 'mobile'));
const androidDir = path.join(mobileDir, 'android');
const devPackage = 'kr.idai.fieldmobile.debug';
const args = process.argv.slice(2);

function valueAfter(flag, fallback) {
    const index = args.indexOf(flag);
    return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function has(flag) {
    return args.includes(flag);
}

function fail(message) {
    console.error(`\n[오류] ${message}`);
    process.exit(1);
}

function firstExisting(candidates) {
    return candidates.find((candidate) => candidate && fs.existsSync(candidate));
}

function resolveDevRoot() {
    if (process.env.IDAI_FIELD_DEV_ROOT) return process.env.IDAI_FIELD_DEV_ROOT;
    if (fs.existsSync('H:\\')) return 'H:\\idai-field-dev';
    if (fs.existsSync('G:\\')) return 'G:\\idai-field-dev';
    fail('G: 또는 H: 드라이브가 필요합니다.');
}

function ensureDir(directory) {
    fs.mkdirSync(directory, { recursive: true });
    return directory;
}

function windowsScriptCommand(file, commandArgs, workingDirectory) {
    if (!/\.(?:bat|cmd)$/i.test(file)) return { file, commandArgs };
    const relative = path.relative(workingDirectory, file);
    const script = relative && !relative.startsWith('..') && !path.isAbsolute(relative)
        ? relative
        : `"${file}"`;
    return {
        file: process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe',
        commandArgs: ['/d', '/s', '/c', script, ...commandArgs]
    };
}

function run(file, commandArgs, options = {}) {
    const workingDirectory = options.cwd || repoDir;
    const command = windowsScriptCommand(file, commandArgs, workingDirectory);
    const result = childProcess.spawnSync(command.file, command.commandArgs, {
        cwd: workingDirectory,
        env,
        encoding: 'utf8',
        stdio: options.capture ? 'pipe' : 'inherit',
        ...options
    });
    if (result.error) fail(`${file} 실행 실패: ${result.error.message}`);
    if (result.status !== 0 && !options.allowFailure) {
        if (options.capture && result.stderr) console.error(result.stderr.trim());
        fail(`${path.basename(file)} 종료 코드: ${result.status}`);
    }
    return result;
}

function adb(commandArgs, options = {}) {
    return run(adbPath, commandArgs, { capture: true, ...options });
}

function connectedDevices() {
    const result = adb(['devices', '-l']);
    return result.stdout
        .split(/\r?\n/)
        .slice(1)
        .map((line) => line.trim())
        .filter((line) => /\sdevice(?:\s|$)/.test(line))
        .map((line) => ({ serial: line.split(/\s+/)[0], description: line }));
}

function selectDevice() {
    const requested = valueAfter('--device', process.env.ANDROID_SERIAL);
    const devices = connectedDevices();
    if (requested) {
        if (!devices.some((device) => device.serial === requested)) {
            fail(`요청한 태블릿 ${requested}이(가) USB로 연결되어 있지 않습니다.`);
        }
        return requested;
    }
    if (devices.length === 0) fail('USB 디버깅이 허용된 Android 태블릿을 연결하세요.');
    if (devices.length > 1) {
        fail(`기기가 여러 대입니다. --device 일련번호를 지정하세요: ${devices.map((d) => d.serial).join(', ')}`);
    }
    return devices[0].serial;
}

function packageInstalled(packageName) {
    const result = adb(['-s', serial, 'shell', 'pm', 'path', packageName], { allowFailure: true });
    return result.status === 0 && result.stdout.includes('package:');
}

function metroReady(port) {
    return new Promise((resolve) => {
        const request = http.get({ host: '127.0.0.1', port, path: '/status', timeout: 1000 }, (response) => {
            let body = '';
            response.on('data', (chunk) => { body += chunk; });
            response.on('end', () => resolve(response.statusCode === 200 && body.includes('packager-status:running')));
        });
        request.on('timeout', () => { request.destroy(); resolve(false); });
        request.on('error', () => resolve(false));
    });
}

async function waitForMetro(port, child) {
    const deadline = Date.now() + 90000;
    while (Date.now() < deadline) {
        if (child && child.exitCode !== null) fail(`Metro가 예기치 않게 종료되었습니다 (${child.exitCode}).`);
        if (await metroReady(port)) return;
        await new Promise((resolve) => setTimeout(resolve, 800));
    }
    fail(`Metro가 90초 안에 ${port} 포트에서 준비되지 않았습니다.`);
}

function warmMetroBundle(port) {
    const bundlePath = '/expo-router-entry.bundle'
        + '?platform=android&dev=true&hot=false&lazy=true'
        + '&transform.engine=hermes&transform.bytecode=true&transform.routerRoot=app';
    console.log('첫 화면 번들을 미리 준비합니다...');
    return new Promise((resolve, reject) => {
        const request = http.get({ host: '127.0.0.1', port, path: bundlePath }, (response) => {
            let errorBody = '';
            response.on('data', (chunk) => {
                if (response.statusCode !== 200 && errorBody.length < 4000) errorBody += chunk;
            });
            response.on('end', () => {
                if (response.statusCode === 200) resolve();
                else reject(new Error(`Metro 번들 준비 실패 (${response.statusCode}): ${errorBody.slice(0, 1000)}`));
            });
        });
        request.setTimeout(600000, () => request.destroy(new Error('Metro 번들 준비 시간 초과')));
        request.on('error', reject);
    });
}

function launchApp(port) {
    const metroUrl = `http://127.0.0.1:${port}`;
    const deepLink = `exp+idai-field-mobile://expo-development-client/?url=${encodeURIComponent(metroUrl)}`;
    adb(['-s', serial, 'shell', 'am', 'force-stop', devPackage], { allowFailure: true });
    const result = adb([
        '-s', serial, 'shell', 'am', 'start',
        '-a', 'android.intent.action.VIEW',
        '-d', deepLink,
        devPackage
    ], { allowFailure: true });
    if (result.status !== 0) fail(`개발 앱 실행 실패: ${(result.stderr || result.stdout).trim()}`);
    console.log(`\n[준비 완료] 태블릿 ${serial}에서 개발 앱을 열었습니다.`);
    console.log('파일을 저장하면 Fast Refresh로 바로 반영됩니다.');
}

function findJavaHome() {
    const candidates = [
        process.env.JAVA_HOME,
        'C:\\Program Files\\Android\\Android Studio\\jbr',
        'C:\\Program Files\\Android\\Android Studio\\jre'
    ];
    for (const parent of [
        'C:\\Program Files\\Eclipse Adoptium',
        'C:\\Program Files\\Microsoft',
        'C:\\Program Files\\Java'
    ]) {
        if (!fs.existsSync(parent)) continue;
        for (const name of fs.readdirSync(parent)) {
            if (/^(?:jdk|jbr)[-_]?17/i.test(name)) candidates.push(path.join(parent, name));
        }
    }
    return firstExisting(candidates.filter((candidate) =>
        candidate && fs.existsSync(path.join(candidate, 'bin', 'java.exe'))
    ));
}

function installDebug() {
    const javaHome = findJavaHome();
    if (!javaHome) fail('Android Studio의 Java 17 런타임을 찾지 못했습니다.');
    env.JAVA_HOME = javaHome;
    env.Path = `${path.join(javaHome, 'bin')};${env.Path}`;

    console.log('\n[1/2] H: 작업 공간에서 개발 APK를 빌드합니다...');
    run(path.join(androidDir, 'gradlew.bat'), [
        '--no-daemon',
        '-PreactNativeArchitectures=arm64-v8a',
        'app:assembleDebug'
    ], { cwd: androidDir });

    const apk = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
    if (!fs.existsSync(apk)) fail(`빌드된 APK를 찾지 못했습니다: ${apk}`);
    console.log('\n[2/2] 기존 현장 앱은 유지하고 개발 앱을 별도로 설치합니다...');
    const result = adb(['-s', serial, 'install', '-r', apk], { allowFailure: true });
    if (result.status !== 0 || !/Success/i.test(result.stdout)) {
        fail(`APK 설치 실패: ${(result.stderr || result.stdout).trim()}`);
    }
}

function showUsage() {
    console.log('빠른 태블릿 실시간 확인');
    console.log('  START_TABLET_LIVE.cmd                 개발 앱 실행 + Metro 시작');
    console.log('  START_TABLET_LIVE.cmd --install-debug 최초/네이티브 변경 시 빌드·설치');
    console.log('  START_TABLET_LIVE.cmd --clear         Metro 캐시를 지우고 시작');
    console.log('  START_TABLET_LIVE.cmd --check         연결 상태만 확인');
}

if (has('--help') || has('-h')) {
    showUsage();
    process.exit(0);
}

const port = Number(valueAfter('--port', '8081'));
if (!Number.isInteger(port) || port < 1 || port > 65535) fail('--port 값이 올바르지 않습니다.');

const devRoot = resolveDevRoot();
const nodeVersion = fs.readFileSync(path.join(mobileDir, '.nvmrc'), 'utf8').trim();
const nodeDir = firstExisting([
    path.join(devRoot, 'runtimes', 'codex', `node-v${nodeVersion}-win-x64`),
    path.join(process.env.USERPROFILE || '', '.codex', 'runtimes', `node-v${nodeVersion}-win-x64`),
    path.dirname(process.execPath)
]);
if (!nodeDir) fail(`Node ${nodeVersion} 런타임을 G:/H:에서 찾지 못했습니다.`);

const androidHome = firstExisting([
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk')
]);
if (!androidHome) fail('Android SDK를 찾지 못했습니다.');
const adbPath = path.join(androidHome, 'platform-tools', 'adb.exe');
if (!fs.existsSync(adbPath)) fail(`adb를 찾지 못했습니다: ${adbPath}`);

const env = { ...process.env };
env.IDAI_FIELD_DEV_ROOT = devRoot;
env.npm_config_cache = ensureDir(path.join(devRoot, 'npm-cache'));
env.GRADLE_USER_HOME = ensureDir(path.join(devRoot, 'gradle'));
env.TEMP = ensureDir(path.join(devRoot, 'temp'));
env.TMP = env.TEMP;
env.ANDROID_HOME = androidHome;
env.ANDROID_SDK_ROOT = androidHome;
env.NODE_ENV = env.NODE_ENV || 'development';
env.Path = `${nodeDir};${path.join(androidHome, 'platform-tools')};${env.Path || ''}`;
env.PATH = env.Path;
env.NODE_BINARY = path.join(nodeDir, 'node.exe');

const expoCommand = path.join(mobileDir, 'node_modules', '.bin', 'expo.cmd');
if (!fs.existsSync(expoCommand)) fail('mobile/node_modules가 없습니다. H: 의존성 연결을 확인하세요.');

const serial = selectDevice();
env.ANDROID_SERIAL = serial;

console.log(`개발 저장소: ${devRoot}`);
console.log(`Node: ${nodeVersion} (${nodeDir})`);
console.log(`태블릿: ${serial}`);
console.log(`개발 앱: ${packageInstalled(devPackage) ? '설치됨' : '미설치'}`);

if (has('--check')) process.exit(0);
if (has('--install-debug')) installDebug();
if (!packageInstalled(devPackage)) {
    fail('개발 앱이 없습니다. START_TABLET_LIVE.cmd --install-debug 를 한 번 실행하세요.');
}

adb(['-s', serial, 'reverse', `tcp:${port}`, `tcp:${port}`]);

(async () => {
    if (await metroReady(port)) {
        console.log(`Metro ${port} 포트를 재사용합니다.`);
        await warmMetroBundle(port);
        launchApp(port);
        return;
    }

    const metroArgs = ['start', '--dev-client', '--host', 'localhost', '--port', String(port)];
    if (has('--clear')) metroArgs.push('--clear');
    console.log(`\nMetro를 시작합니다${has('--clear') ? ' (캐시 초기화)' : ''}...`);
    const metroCommand = windowsScriptCommand(expoCommand, metroArgs, mobileDir);
    const metro = childProcess.spawn(metroCommand.file, metroCommand.commandArgs, {
        cwd: mobileDir,
        env,
        stdio: 'inherit',
        windowsHide: false
    });
    metro.on('error', (error) => fail(`Metro 실행 실패: ${error.message}`));

    await waitForMetro(port, metro);
    await warmMetroBundle(port);
    launchApp(port);

    const stop = () => {
        if (!metro.killed) metro.kill('SIGINT');
    };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
    metro.on('exit', (code) => process.exit(code || 0));
})().catch((error) => fail(error.stack || error.message));
