import { lab } from '../film';
import { W, H } from '../core/stage';
import { drawPerson } from '../chars/rig';
import * as C from '../chars/cast';
import { vgrad } from '../draw/brush';
lab('armtest', (f) => {
  vgrad(f.ctx, 0, 0, W, H, [[0, '#e9dfcc'], [1, '#d8cbb3']]);
  const poses = [{ flip: -1, turn: 0.3 }, { flip: 1, turn: 0.3 }, { flip: -1, turn: 0.6 }, { flip: 1, turn: 0 }];
  poses.forEach((p, i) => drawPerson(f, C.NELL, { x: 300 + i * 420, y: 900, s: 1.6, ...p, armF: { a: 2.6, b: -0.08 }, armFLen: 1.6, armB: { a: 0.2, b: 0.2 } }, null));
});
