import { expect, test, type Page } from '@playwright/test';

/* Helpers that run inside the page, where the library is exposed as window.TL. */

async function open(page: Page) {
  await page.goto('/');
  await page.waitForSelector('body[data-ready]');
}

/** Counts how many animation frames drew anything during `ms`. */
async function framesDrawn(page: Page, ms: number): Promise<number> {
  return page.evaluate(
    (ms) =>
      new Promise<number>((resolve) => {
        const TL = (window as any).TL;
        let count = 0;
        const end = performance.now() + ms;
        const tick = () => {
          if (TL.getStats().drawing > 0) count++;
          if (performance.now() < end) requestAnimationFrame(tick);
          else resolve(count);
        };
        requestAnimationFrame(tick);
      }),
    ms,
  );
}

const nextFrames = (page: Page, n = 3) =>
  page.evaluate(
    (n) =>
      new Promise((r) => {
        let i = 0;
        const f = () => (++i >= n ? r(null) : requestAnimationFrame(f));
        requestAnimationFrame(f);
      }),
    n,
  );

test.describe('canvas loaders', () => {
  test('every painter actually draws pixels', async ({ page }) => {
    await open(page);
    const inked = await page.evaluate(() => {
      const TL = (window as any).TL;
      const out: Record<string, number> = {};
      for (const type of ['coil', 'murmur', 'scribble', 'pond']) {
        const el = document.createElement('div');
        document.getElementById('scratch')!.appendChild(el);
        TL.mount(el, { type, size: 64, time: 1, color: '#000' });
        const c = el.querySelector('canvas') as HTMLCanvasElement;
        const data = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
        let n = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i] > 0) n++;
        out[type] = n;
      }
      return out;
    });
    for (const [type, n] of Object.entries(inked)) expect(n, `${type} drew nothing`).toBeGreaterThan(50);
  });

  test('the same time gives the same picture; a different time does not', async ({ page }) => {
    await open(page);
    const [a, b, c] = await page.evaluate(() => {
      const TL = (window as any).TL;
      const snap = (time: number) => {
        const el = document.createElement('div');
        document.getElementById('scratch')!.appendChild(el);
        TL.mount(el, { type: 'scribble', size: 64, time, color: '#000' });
        return (el.querySelector('canvas') as HTMLCanvasElement).toDataURL();
      };
      return [snap(1.5), snap(1.5), snap(2.5)];
    });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  test('small loaders are capped at about 30 frames a second; large ones are not', async ({ page }) => {
    await open(page);
    await page.evaluate(() => (window as any).TL.mount(document.getElementById('scratch'), { type: 'coil', size: 20 }));
    const small = await framesDrawn(page, 1000);
    expect(small).toBeGreaterThan(22);
    expect(small).toBeLessThan(38);

    await page.evaluate(() => {
      document.getElementById('scratch')!.innerHTML = '';
      (window as any).TL.mount(document.getElementById('scratch'), { type: 'coil', size: 64 });
    });
    await nextFrames(page);
    expect(await framesDrawn(page, 1000)).toBeGreaterThan(45);
  });

  test('loaders scrolled off-screen stop drawing', async ({ page }) => {
    await open(page);
    await page.evaluate(() => {
      const far = document.createElement('div');
      far.style.cssText = 'position:absolute;top:5000px';
      document.body.appendChild(far);
      (window as any).TL.mount(far, { type: 'murmur', size: 64 });
    });
    await nextFrames(page, 10);
    const stats = await page.evaluate(() => (window as any).TL.getStats());
    expect(stats.canvasLoaders).toBe(1);
    expect(await framesDrawn(page, 500)).toBe(0);
  });

  test('with reduced motion, a canvas loader draws once and leaves the animation loop', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    const result = await page.evaluate(() => {
      const TL = (window as any).TL;
      const el = document.getElementById('scratch')!;
      TL.mount(el, { type: 'pond', size: 64, color: '#000' });
      const c = el.querySelector('canvas') as HTMLCanvasElement;
      const data = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
      return {
        inLoop: TL.getStats().canvasLoaders,
        calm: c.classList.contains('mulling-calm'),
        inked: data.some((v, i) => i % 4 === 3 && v > 0),
      };
    });
    expect(result).toEqual({ inLoop: 0, calm: true, inked: true });
  });

  test('turning on reduced motion while running stops canvas animation', async ({ page }) => {
    await open(page);
    await page.evaluate(() => (window as any).TL.mount(document.getElementById('scratch'), { type: 'coil', size: 64 }));
    await nextFrames(page);
    expect((await page.evaluate(() => (window as any).TL.getStats())).canvasLoaders).toBe(1);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await nextFrames(page);
    expect((await page.evaluate(() => (window as any).TL.getStats())).canvasLoaders).toBe(0);
  });

  test('a theme change on <body> recolors canvas loaders without polling', async ({ page }) => {
    await open(page);
    const before = await page.evaluate(() => {
      (window as any).TL.mount(document.getElementById('scratch'), { type: 'pond', size: 64, time: 1 });
      const c = document.querySelector('#scratch canvas') as HTMLCanvasElement;
      return Array.from(c.getContext('2d')!.getImageData(c.width / 2, c.height / 2, 1, 1).data);
    });
    expect(before.slice(0, 3)).toEqual([0x3b, 0x5b, 0xdb]);
    const after = await page.evaluate(async () => {
      document.body.classList.add('alt');
      await new Promise((r) => setTimeout(r, 50));
      const c = document.querySelector('#scratch canvas') as HTMLCanvasElement;
      return Array.from(c.getContext('2d')!.getImageData(c.width / 2, c.height / 2, 1, 1).data);
    });
    expect(after.slice(0, 3)).toEqual([0, 0, 255]);
  });

  test('performance budget: 100 animating loaders draw a frame in under 8ms', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 1000 });
    await open(page);
    const avg = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          const TL = (window as any).TL;
          const grid = document.getElementById('grid')!;
          grid.style.gridTemplateColumns = 'repeat(20, 64px)';
          const types = ['coil', 'murmur', 'scribble', 'pond'];
          for (let i = 0; i < 100; i++) {
            const cell = document.createElement('span');
            grid.appendChild(cell);
            TL.mount(cell, { type: types[i % 4], size: 64, label: null });
          }
          const samples: number[] = [];
          const tick = () => {
            const s = TL.getStats();
            if (s.drawing > 0) samples.push(s.frameMs);
            if (samples.length < 60) requestAnimationFrame(tick);
            else resolve(samples.slice(10).reduce((a, b) => a + b, 0) / 50);
          };
          requestAnimationFrame(tick);
        }),
    );
    console.log(`100 canvas loaders: ${avg.toFixed(2)}ms per frame`);
    expect(avg).toBeLessThan(8);
  });
});

test.describe('CSS loaders', () => {
  test('the time option pauses every animation at that moment', async ({ page }) => {
    await open(page);
    const anims = await page.evaluate(() => {
      const el = document.getElementById('scratch')!;
      (window as any).TL.mount(el, { type: 'orbit', size: 64, time: 1.5 });
      return el
        .querySelector('.mulling-host')!
        .getAnimations({ subtree: true })
        .map((a) => ({ state: a.playState, t: Math.round(Number(a.currentTime)) }));
    });
    expect(anims.length).toBeGreaterThan(0);
    for (const a of anims) expect(a).toEqual({ state: 'paused', t: 1500 });
  });

  test('clearing time resumes the animation', async ({ page }) => {
    await open(page);
    const states = await page.evaluate(() => {
      const el = document.getElementById('scratch')!;
      const h = (window as any).TL.mount(el, { type: 'tide', time: 1 });
      h.update({ time: undefined });
      return el
        .querySelector('.mulling-host')!
        .getAnimations({ subtree: true })
        .map((a) => a.playState);
    });
    expect(states.every((s) => s === 'running')).toBe(true);
  });

  test('blink picks eyes that contrast with its body color', async ({ page }) => {
    await open(page);
    const eyes = await page.evaluate(() => {
      const TL = (window as any).TL;
      const pick = (color: string) => {
        const el = document.createElement('div');
        document.getElementById('scratch')!.appendChild(el);
        TL.mount(el, { type: 'blink', size: 64, color });
        return getComputedStyle(el.querySelector('.mulling-blink i')!).backgroundColor;
      };
      return { onYellow: pick('#ffeb3b'), onNavy: pick('#1a237e') };
    });
    expect(eyes).toEqual({ onYellow: 'rgb(27, 31, 46)', onNavy: 'rgb(255, 255, 255)' });
  });

  test('in forced-colors mode, shapes use system colors instead of the chosen color', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await open(page);
    const [shape, text] = await page.evaluate(() => {
      const el = document.getElementById('scratch')!;
      (window as any).TL.mount(el, { type: 'breath', size: 64, color: 'red' });
      const probe = document.createElement('span');
      probe.style.color = 'CanvasText';
      document.body.appendChild(probe);
      return [getComputedStyle(el.querySelector('.mulling-breath')!).backgroundColor, getComputedStyle(probe).color];
    });
    expect(shape).toBe(text);
    expect(shape).not.toBe('rgb(255, 0, 0)');
  });
});

test.describe('web component', () => {
  test('many instances share one stylesheet instead of copying it', async ({ page }) => {
    await open(page);
    const result = await page.evaluate(() => {
      const scratch = document.getElementById('scratch')!;
      for (let i = 0; i < 20; i++) scratch.appendChild(document.createElement('mulling-status'));
      const roots = [...scratch.querySelectorAll('mulling-status')].map((e) => e.shadowRoot!);
      const first = roots[0].adoptedStyleSheets[0];
      return {
        styleTags: roots.reduce((n, r) => n + r.querySelectorAll('style').length, 0),
        allShared: roots.every((r) => r.adoptedStyleSheets.length === 1 && r.adoptedStyleSheets[0] === first),
      };
    });
    expect(result).toEqual({ styleTags: 0, allShared: true });
  });

  test('styles for a loader used later reach web components created earlier', async ({ page }) => {
    await open(page);
    const backgrounds = await page.evaluate(() => {
      const scratch = document.getElementById('scratch')!;
      const first = document.createElement('mulling-status');
      first.setAttribute('type', 'orbit');
      scratch.appendChild(first);
      // tide's styles are added to the shared sheet only now; the first element must still be styled.
      const second = document.createElement('mulling-status');
      second.setAttribute('type', 'tide');
      scratch.appendChild(second);
      first.setAttribute('type', 'tide');
      const bg = (el: Element) =>
        getComputedStyle(el.shadowRoot!.querySelector('.mulling-layer:last-child .mulling-tide i')!).backgroundColor;
      return [bg(first), bg(second), first.shadowRoot!.adoptedStyleSheets[0] === second.shadowRoot!.adoptedStyleSheets[0]];
    });
    expect(backgrounds[0]).not.toBe('rgba(0, 0, 0, 0)');
    expect(backgrounds[1]).toBe(backgrounds[0]);
    expect(backgrounds[2]).toBe(true);
  });
});
