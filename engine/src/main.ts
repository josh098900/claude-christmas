// Browser entry point. Exposes window.SFS for the render harness.
import { Stage } from './core/stage';
import { Post } from './post/post';
import { drawFrame, drawLab, RANGES, TOTAL_FRAMES, FPS } from './film';
import './shots/index';

let stage: Stage, post: Post, pix: Uint8Array;

function init(scale: number) {
  stage = new Stage(scale);
  post = new Post(stage.pw, stage.ph, scale);
  pix = new Uint8Array(stage.pw * stage.ph * 4);
  document.body.appendChild(post.canvas);
  return { w: stage.pw, h: stage.ph, frames: TOTAL_FRAMES, fps: FPS, ranges: RANGES };
}

function renderFrame(frame: number) {
  const g = drawFrame(stage, frame);
  post.run(stage.base, stage.glowC, g, Math.floor(frame / 2) * 1.618 % 97.0);
}

function renderLab(id: string, t: number) {
  const g = drawLab(stage, id, t);
  post.run(stage.base, stage.glowC, g, Math.floor(t * 12) * 1.618 % 97.0);
}
async function sendLab(id: string, t: number, wsUrl: string) {
  const ws = new WebSocket(wsUrl); ws.binaryType = 'arraybuffer';
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  const t0 = performance.now();
  renderLab(id, t); post.readPixels(pix);
  const ack = new Promise((r) => (ws.onmessage = r));
  ws.send(pix); await ack; ws.close();
  return performance.now() - t0;
}
async function renderRange(a: number, b: number, wsUrl: string) {
  const ws = new WebSocket(wsUrl);
  ws.binaryType = 'arraybuffer';
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let pending: ((v?: unknown) => void) | null = null;
  ws.onmessage = () => { if (pending) { const p = pending; pending = null; p(); } };
  const t0 = performance.now();
  for (let fr = a; fr < b; fr++) {
    renderFrame(fr);
    post.readPixels(pix);
    const ack = new Promise((r) => (pending = r));
    ws.send(pix);
    await ack;
  }
  ws.close();
  return (performance.now() - t0) / Math.max(1, b - a);
}

(window as any).SFS = { init, renderFrame, renderRange, sendLab };
