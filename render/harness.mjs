// Shared harness: launches headless Chromium with the engine and receives frames over a WebSocket.
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { WebSocketServer } = require('ws');

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let wss = null, wsPort = 0;
const handlers = new Map(); // worker id -> fn(buffer) => Promise
export async function startServer() {
  if (wss) return wsPort;
  wss = new WebSocketServer({ port: 0, maxPayload: 256 * 1024 * 1024 });
  await new Promise((r) => wss.on('listening', r));
  wsPort = wss.address().port;
  wss.on('connection', (sock, req) => {
    const id = new URL(req.url, 'http://x').searchParams.get('w');
    sock.on('message', async (msg) => {
      const h = handlers.get(id);
      if (h) await h(msg);
      sock.send('k');
    });
  });
  return wsPort;
}
export function setHandler(id, fn) { handlers.set(String(id), fn); }
export function stopServer() { if (wss) wss.close(); wss = null; }

export async function launchWorker(scale) {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-web-security', '--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto('file://' + path.join(ROOT, 'render/page.html') + '?b=' + (process.env.SFS_BUNDLE || 'engine.js'));
  await page.evaluate(() => document.fonts.load('36px Inter'));
  const info = await page.evaluate((s) => window.SFS.init(s), scale);
  return { browser, page, info };
}
