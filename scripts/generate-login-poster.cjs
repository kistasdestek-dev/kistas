const { spawn } = require('node:child_process');
const { createReadStream, existsSync, mkdtempSync, rmSync, statSync } = require('node:fs');
const { createServer } = require('node:http');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const projectRoot = resolve(__dirname, '..');
const videoPath = resolve(projectRoot, 'videos/login.mp4');
const posterPath = resolve(projectRoot, 'videos/login-poster.png');
const browserCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];
const browserPath = browserCandidates.find(existsSync);

if (!browserPath) throw new Error('Poster üretmek için Chrome veya Edge bulunamadı.');
if (!existsSync(videoPath)) throw new Error(`Video bulunamadı: ${videoPath}`);

const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body { margin: 0; width: 256px; height: 256px; overflow: hidden; background: #f4f8fd; }
      video { width: 256px; height: 256px; display: block; object-fit: cover; }
    </style>
  </head>
  <body>
    <video src="/login.mp4" autoplay muted playsinline></video>
  </body>
</html>`;

const server = createServer((request, response) => {
  if (request.url === '/login.mp4') {
    const size = statSync(videoPath).size;
    const range = request.headers.range;

    if (range) {
      const [startText, endText] = range.replace('bytes=', '').split('-');
      const start = Number(startText);
      const end = endText ? Number(endText) : size - 1;
      response.writeHead(206, {
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Content-Type': 'video/mp4',
      });
      createReadStream(videoPath, { start, end }).pipe(response);
      return;
    }

    response.writeHead(200, { 'Content-Length': size, 'Content-Type': 'video/mp4' });
    createReadStream(videoPath).pipe(response);
    return;
  }

  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(html);
});

const run = async () => {
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Geçici poster sunucusu başlatılamadı.');

  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'kistas-login-poster-'));
  const browserProfilePath = join(temporaryDirectory, 'browser-profile');
  const browser = spawn(browserPath, [
    '--headless=new',
    `--user-data-dir=${browserProfilePath}`,
    '--hide-scrollbars',
    '--autoplay-policy=no-user-gesture-required',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=2500',
    '--window-size=256,256',
    `--screenshot=${posterPath}`,
    `http://127.0.0.1:${address.port}`,
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  let stderr = '';
  browser.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

  const exitCode = await new Promise((resolveExit, rejectExit) => {
    const timeout = setTimeout(() => {
      browser.kill();
      rejectExit(new Error('Poster üretimi zaman aşımına uğradı.'));
    }, 15000);
    browser.once('error', rejectExit);
    browser.once('exit', (code) => {
      clearTimeout(timeout);
      resolveExit(code);
    });
  });

  rmSync(temporaryDirectory, { recursive: true, force: true });

  if (exitCode !== 0 || !existsSync(posterPath)) {
    throw new Error(stderr || 'Login avatar posteri üretilemedi.');
  }

  console.log(`Login avatar posteri üretildi: ${statSync(posterPath).size} bayt`);
};

run()
  .finally(() => server.close())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
