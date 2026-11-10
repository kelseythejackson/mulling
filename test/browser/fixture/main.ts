import * as TL from '../../../src';

// Expose the library to Playwright tests.
(window as unknown as { TL: typeof TL }).TL = TL;
TL.defineElement();

const params = new URLSearchParams(location.search);
if (params.has('grid')) {
  // Every loader at 20px and 64px, frozen at one moment so screenshots are identical every run.
  const time = Number(params.get('time') ?? 1.2);
  const grid = document.getElementById('grid')!;
  for (const size of [20, 64]) {
    for (const { type } of TL.allLoaders) {
      const cell = document.createElement('span');
      grid.appendChild(cell);
      TL.mount(cell, { type, size, time, label: null });
    }
  }
}
if (params.has('states')) {
  // Every state at 20px and 64px, frozen after the endings have finished drawing.
  const time = Number(params.get('time') ?? 1.2);
  const grid = document.getElementById('grid')!;
  grid.style.gridTemplateColumns = 'repeat(5, 80px)';
  for (const size of [20, 64]) {
    for (const state of TL.loaderStates) {
      const cell = document.createElement('span');
      grid.appendChild(cell);
      TL.mount(cell, { state, size, time, label: null });
    }
  }
}
document.body.dataset.ready = 'true';
