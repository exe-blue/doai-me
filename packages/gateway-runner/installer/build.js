/**
 * DoAi Gateway Installer Builder
 *
 * Node.js 런타임 + Gateway 코드를 하나의 설치 패키지로 번들링
 * Inno Setup을 사용하여 Windows 설치 프로그램 생성
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync, spawn } = require('child_process');
const https = require('https');
const http = require('http');

// 설정
const CONFIG = {
    nodeVersion: '20.11.0',  // LTS 버전
    appName: 'DoAi Gateway',
    appVersion: '1.0.0',
    publisher: 'DoAi.Me Team',

    // 경로
    distDir: path.join(__dirname, 'dist'),
    buildDir: path.join(__dirname, 'dist', 'build'),
    outputDir: path.join(__dirname, 'dist', 'output'),

    // 소스 경로
    gatewayRunnerDir: path.join(__dirname, '..'),
    gatewayDir: path.join(__dirname, '..', '..', '..', 'local', 'gateway'),
    dashboardDir: path.join(__dirname, '..', '..', '..', 'apps', 'dashboard'),
};

async function main() {
    console.log('='.repeat(60));
    console.log('DoAi Gateway Installer Builder');
    console.log('='.repeat(60));
    console.log('');

    const args = process.argv.slice(2);

    if (args.includes('--clean')) {
        await cleanBuild();
        return;
    }

    if (args.includes('--download-node-only')) {
        await downloadNodeJs();
        return;
    }

    try {
        // 1. 빌드 디렉토리 준비
        await prepareBuildDir();

        // 2. Node.js 다운로드
        await downloadNodeJs();

        // 3. Dashboard 빌드
        await buildDashboard();

        // 4. Gateway 코드 복사
        await copyGatewayCode();

        // 5. 의존성 설치
        await installDependencies();

        // 6. 시작 스크립트 생성
        await createStartupScripts();

        // 7. Inno Setup 컴파일 (설치되어 있으면)
        await compileInstaller();

        console.log('');
        console.log('='.repeat(60));
        console.log('Build completed successfully!');
        console.log('='.repeat(60));
        console.log(`Output directory: ${CONFIG.buildDir}`);

    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

async function cleanBuild() {
    console.log('[Clean] Removing build directory...');
    await fs.remove(CONFIG.distDir);
    console.log('[Clean] Done');
}

async function prepareBuildDir() {
    console.log('[Prepare] Creating build directories...');

    await fs.remove(CONFIG.buildDir);
    await fs.ensureDir(CONFIG.buildDir);
    await fs.ensureDir(CONFIG.outputDir);
    await fs.ensureDir(path.join(CONFIG.buildDir, 'node'));
    await fs.ensureDir(path.join(CONFIG.buildDir, 'app'));
    await fs.ensureDir(path.join(CONFIG.buildDir, 'app', 'gateway'));
    await fs.ensureDir(path.join(CONFIG.buildDir, 'app', 'runner'));
    await fs.ensureDir(path.join(CONFIG.buildDir, 'configs'));
    await fs.ensureDir(path.join(CONFIG.buildDir, 'logs'));

    console.log('[Prepare] Done');
}

async function buildDashboard() {
    console.log('[Dashboard] Building React dashboard...');

    const dashboardSrc = CONFIG.dashboardDir;
    const dashboardDest = path.join(CONFIG.buildDir, 'app', 'gateway', 'client', 'dist');

    // Dashboard 소스 존재 확인
    if (!await fs.pathExists(dashboardSrc)) {
        console.log('[Dashboard] Dashboard source not found, skipping...');
        return;
    }

    // package.json 확인
    const packageJsonPath = path.join(dashboardSrc, 'package.json');
    if (!await fs.pathExists(packageJsonPath)) {
        console.log('[Dashboard] No package.json found, skipping...');
        return;
    }

    try {
        // 1. 의존성 설치
        console.log('[Dashboard] Installing dependencies...');
        execSync('npm install', {
            cwd: dashboardSrc,
            stdio: 'inherit',
            timeout: 300000 // 5분 타임아웃
        });

        // 2. Dashboard 빌드 (localhost 모드 활성화)
        console.log('[Dashboard] Building with VITE_LOCALHOST_MODE=true...');
        execSync('npm run build', {
            cwd: dashboardSrc,
            stdio: 'inherit',
            env: {
                ...process.env,
                VITE_LOCALHOST_MODE: 'true',
                VITE_API_URL: ''  // 상대 경로 사용
            },
            timeout: 300000
        });

        // 3. 빌드 결과 복사
        const builtDir = path.join(dashboardSrc, 'dist');
        if (await fs.pathExists(builtDir)) {
            console.log('[Dashboard] Copying built files...');
            await fs.ensureDir(dashboardDest);
            await fs.copy(builtDir, dashboardDest);
            console.log(`[Dashboard] Copied to: ${dashboardDest}`);
        } else {
            console.log('[Dashboard] Build output not found at:', builtDir);
        }

    } catch (error) {
        console.error('[Dashboard] Build failed:', error.message);
        console.log('[Dashboard] Continuing without dashboard...');
    }

    console.log('[Dashboard] Done');
}

async function downloadNodeJs() {
    const nodeDir = path.join(CONFIG.buildDir, 'node');
    const nodeExe = path.join(nodeDir, 'node.exe');

    // 이미 존재하면 스킵
    if (await fs.pathExists(nodeExe)) {
        console.log('[Node.js] Already downloaded, skipping...');
        return;
    }

    console.log(`[Node.js] Downloading Node.js v${CONFIG.nodeVersion}...`);

    const arch = process.arch === 'x64' ? 'x64' : 'x86';
    const downloadUrl = `https://nodejs.org/dist/v${CONFIG.nodeVersion}/node-v${CONFIG.nodeVersion}-win-${arch}.zip`;
    const zipPath = path.join(CONFIG.distDir, `node-${CONFIG.nodeVersion}.zip`);

    // 다운로드
    await downloadFile(downloadUrl, zipPath);

    // 압축 해제
    console.log('[Node.js] Extracting...');
    execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${CONFIG.distDir}' -Force"`, {
        stdio: 'inherit'
    });

    // node.exe와 필요한 파일만 복사
    const extractedDir = path.join(CONFIG.distDir, `node-v${CONFIG.nodeVersion}-win-${arch}`);

    await fs.copy(path.join(extractedDir, 'node.exe'), nodeExe);

    // npm도 복사 (의존성 설치에 필요)
    const npmDir = path.join(extractedDir, 'node_modules', 'npm');
    if (await fs.pathExists(npmDir)) {
        await fs.copy(npmDir, path.join(nodeDir, 'node_modules', 'npm'));
        await fs.copy(path.join(extractedDir, 'npm.cmd'), path.join(nodeDir, 'npm.cmd'));
        await fs.copy(path.join(extractedDir, 'npx.cmd'), path.join(nodeDir, 'npx.cmd'));
    }

    // 정리
    await fs.remove(extractedDir);
    await fs.remove(zipPath);

    console.log('[Node.js] Done');
}

async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const protocol = url.startsWith('https') ? https : http;

        console.log(`[Download] ${url}`);

        protocol.get(url, (response) => {
            // Handle redirect
            if (response.statusCode === 301 || response.statusCode === 302) {
                file.close();
                fs.unlinkSync(dest);
                downloadFile(response.headers.location, dest).then(resolve).catch(reject);
                return;
            }

            const totalBytes = parseInt(response.headers['content-length'], 10);
            let downloadedBytes = 0;
            let lastProgress = 0;

            response.on('data', (chunk) => {
                downloadedBytes += chunk.length;
                const progress = Math.round((downloadedBytes / totalBytes) * 100);
                if (progress !== lastProgress && progress % 10 === 0) {
                    process.stdout.write(`\r[Download] Progress: ${progress}%`);
                    lastProgress = progress;
                }
            });

            response.pipe(file);

            file.on('finish', () => {
                file.close();
                console.log('');
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

async function copyGatewayCode() {
    console.log('[Copy] Copying gateway code...');

    const appDir = path.join(CONFIG.buildDir, 'app');

    // 1. local/gateway 복사 (node_modules 제외)
    const gatewayDest = path.join(appDir, 'gateway');
    await fs.copy(CONFIG.gatewayDir, gatewayDest, {
        filter: (src) => {
            const basename = path.basename(src);
            // node_modules, .git, 테스트 파일 제외
            return !['node_modules', '.git', 'coverage', '__tests__'].includes(basename);
        }
    });

    // 2. gateway-runner 복사 (installer, logs, node_modules 제외)
    const runnerDest = path.join(appDir, 'runner');

    // installer 디렉토리 내부이므로 개별 파일/폴더 복사
    const runnerItems = await fs.readdir(CONFIG.gatewayRunnerDir);
    const excludeItems = ['installer', 'logs', 'node_modules', '.git'];

    for (const item of runnerItems) {
        if (excludeItems.includes(item)) continue;
        if (item.startsWith('tmpclaude-')) continue;

        const srcPath = path.join(CONFIG.gatewayRunnerDir, item);
        const destPath = path.join(runnerDest, item);

        await fs.copy(srcPath, destPath, {
            filter: (src) => {
                const basename = path.basename(src);
                if (basename.startsWith('tmpclaude-')) return false;
                return true;
            }
        });
    }

    // 3. 설정 파일 복사
    const configsSource = path.join(CONFIG.gatewayRunnerDir, 'configs');
    const configsDest = path.join(CONFIG.buildDir, 'configs');
    await fs.copy(configsSource, configsDest);

    console.log('[Copy] Done');
}

async function installDependencies() {
    console.log('[Dependencies] Installing npm packages...');

    const nodeExe = path.join(CONFIG.buildDir, 'node', 'node.exe');
    const npmCmd = path.join(CONFIG.buildDir, 'node', 'npm.cmd');
    const gatewayDir = path.join(CONFIG.buildDir, 'app', 'gateway');

    // gateway 의존성 설치
    if (await fs.pathExists(npmCmd)) {
        console.log('[Dependencies] Installing gateway dependencies...');
        execSync(`"${npmCmd}" install --production`, {
            cwd: gatewayDir,
            stdio: 'inherit',
            env: {
                ...process.env,
                PATH: path.join(CONFIG.buildDir, 'node') + ';' + process.env.PATH
            }
        });
    } else {
        // 시스템 npm 사용
        console.log('[Dependencies] Using system npm...');
        execSync('npm install --production', {
            cwd: gatewayDir,
            stdio: 'inherit'
        });
    }

    console.log('[Dependencies] Done');
}

async function createStartupScripts() {
    console.log('[Scripts] Creating startup scripts...');

    // Windows 실행 스크립트 (DoAiGateway.bat)
    const batScript = `@echo off
setlocal

REM DoAi Gateway Startup Script
REM Generated by installer builder

set "SCRIPT_DIR=%~dp0"
set "NODE_EXE=%SCRIPT_DIR%node\\node.exe"
set "APP_DIR=%SCRIPT_DIR%app"
set "CONFIG_DIR=%SCRIPT_DIR%configs"
set "LOG_DIR=%SCRIPT_DIR%logs"

REM Localhost 전용 모드 설정
set "LOCALHOST_ONLY=true"
set "AUTO_OPEN_DASHBOARD=true"

REM 로그 디렉토리 생성
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

REM 설정 파일 확인
if "%~1"=="" (
    set "CONFIG_FILE=%CONFIG_DIR%\\default.env"
) else (
    set "CONFIG_FILE=%CONFIG_DIR%\\%~1"
)

if exist "%CONFIG_FILE%" (
    echo Loading config: %CONFIG_FILE%
)

REM Gateway Runner 경로 수정 (설치된 구조에 맞게)
set "GATEWAY_PATH=%APP_DIR%\\gateway"

REM Laixi 경로
set "LAIXI_EXE=%SCRIPT_DIR%laixi\\Laixi.exe"

echo.
echo ============================================================
echo DoAi Gateway v${CONFIG.appVersion}
echo ============================================================
echo.
echo Node.js: %NODE_EXE%
echo Gateway: %GATEWAY_PATH%
echo Laixi: %LAIXI_EXE%
echo Config: %CONFIG_FILE%
echo Localhost Only: %LOCALHOST_ONLY%
echo Auto Open Dashboard: %AUTO_OPEN_DASHBOARD%
echo.

REM Laixi 자동 시작 (백그라운드)
if exist "%LAIXI_EXE%" (
    echo Starting Laixi...
    start "" "%LAIXI_EXE%"
    timeout /t 2 /nobreak >nul
)

REM Gateway 실행
cd /d "%APP_DIR%\\runner"
"%NODE_EXE%" index.js

pause
`;

    await fs.writeFile(path.join(CONFIG.buildDir, 'DoAiGateway.bat'), batScript);

    // PowerShell 스크립트
    const ps1Script = `# DoAi Gateway Startup Script
# Generated by installer builder

param(
    [string]$Config = "default.env"
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$NodeExe = Join-Path $ScriptDir "node\\node.exe"
$AppDir = Join-Path $ScriptDir "app"
$ConfigDir = Join-Path $ScriptDir "configs"
$LogDir = Join-Path $ScriptDir "logs"

# Localhost 전용 모드 설정
$env:LOCALHOST_ONLY = "true"
$env:AUTO_OPEN_DASHBOARD = "true"

# 로그 디렉토리 생성
if (!(Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir | Out-Null
}

# 설정 파일 로드
$ConfigFile = Join-Path $ConfigDir $Config
if (Test-Path $ConfigFile) {
    Write-Host "Loading config: $ConfigFile"
    Get-Content $ConfigFile | ForEach-Object {
        if ($_ -match "^([^#][^=]+)=(.*)$") {
            [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
        }
    }
}

# Gateway 경로 설정
$env:GATEWAY_PATH = Join-Path $AppDir "gateway"

# Laixi 경로
$LaixiExe = Join-Path $ScriptDir "laixi\\Laixi.exe"

Write-Host ""
Write-Host "============================================================"
Write-Host "DoAi Gateway v${CONFIG.appVersion}"
Write-Host "============================================================"
Write-Host ""
Write-Host "Node.js: $NodeExe"
Write-Host "Gateway: $env:GATEWAY_PATH"
Write-Host "Laixi: $LaixiExe"
Write-Host "Config: $ConfigFile"
Write-Host "Localhost Only: $env:LOCALHOST_ONLY"
Write-Host "Auto Open Dashboard: $env:AUTO_OPEN_DASHBOARD"

# Laixi 자동 시작 (백그라운드)
if (Test-Path $LaixiExe) {
    Write-Host "Starting Laixi..."
    Start-Process -FilePath $LaixiExe -WindowStyle Minimized
    Start-Sleep -Seconds 2
}
Write-Host ""

# Gateway 실행
Set-Location (Join-Path $AppDir "runner")
& $NodeExe index.js
`;

    await fs.writeFile(path.join(CONFIG.buildDir, 'DoAiGateway.ps1'), ps1Script);

    // Runner의 index.js 수정 (경로 수정 버전 생성)
    const runnerIndexPath = path.join(CONFIG.buildDir, 'app', 'runner', 'index.js');
    let runnerCode = await fs.readFile(runnerIndexPath, 'utf-8');

    // 경로 수정: ../../local/gateway -> ../gateway
    runnerCode = runnerCode.replace(
        "const GATEWAY_PATH = path.join(__dirname, '..', '..', 'local', 'gateway');",
        "const GATEWAY_PATH = process.env.GATEWAY_PATH || path.join(__dirname, '..', 'gateway');"
    );

    await fs.writeFile(runnerIndexPath, runnerCode);

    console.log('[Scripts] Done');
}

async function compileInstaller() {
    // Inno Setup 컴파일러 경로 확인
    const userAppData = process.env.LOCALAPPDATA || '';
    const isccPaths = [
        path.join(userAppData, 'Programs', 'Inno Setup 6', 'ISCC.exe'),
        'C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe',
        'C:\\Program Files\\Inno Setup 6\\ISCC.exe',
        'C:\\Program Files (x86)\\Inno Setup 5\\ISCC.exe',
    ];

    let isccPath = null;
    for (const p of isccPaths) {
        if (await fs.pathExists(p)) {
            isccPath = p;
            break;
        }
    }

    if (!isccPath) {
        console.log('[Installer] Inno Setup not found. Skipping installer compilation.');
        console.log('[Installer] Install Inno Setup from: https://jrsoftware.org/isdl.php');
        console.log('[Installer] Then run: iscc.exe setup.iss');
        return;
    }

    console.log('[Installer] Compiling installer with Inno Setup...');

    const issPath = path.join(__dirname, 'setup.iss');
    if (!await fs.pathExists(issPath)) {
        console.log('[Installer] setup.iss not found. Skipping.');
        return;
    }

    try {
        execSync(`"${isccPath}" "${issPath}"`, {
            stdio: 'inherit',
            cwd: __dirname
        });
        console.log('[Installer] Done');
    } catch (error) {
        console.error('[Installer] Compilation failed:', error.message);
    }
}

main();
