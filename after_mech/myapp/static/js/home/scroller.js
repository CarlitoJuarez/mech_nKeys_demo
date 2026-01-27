import { viewport } from './viewport.js';

// Wait for images/fonts to load then apply viewport()
function viewport_after_loading(root, fn) {
  root.querySelectorAll('img').forEach(img => {
    if (!img.complete) {
      img.addEventListener('load', fn, { once: true, passive: true });
      img.addEventListener('error', fn, { once: true, passive: true });
    }
  });
  try { document.fonts?.ready?.then(fn); } catch {}
}

const afterPaint = () =>
  new Promise(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  );

const isAbort = (e) =>
  e && e === 'superseded' || e?.reason === 'superseded' || (typeof e === 'object' && (e.name === 'AbortError' || e.code === 20));

export function ensureScroller({
  key = 'posts',
  container,
  onAfterInsert,
  itemSelector = '.post_wrapper[id]',
  getItemId = (el) => el.id,
  basePath = window.location.pathname,
}) {
  window.__feeds__ = window.__feeds__ || {};
  if (window.__feeds__[key]) return window.__feeds__[key];
  if (!container) throw new Error(`[scroller:${key}] Missing container`);

  const state = {
    page: 1,
    hasNext: true,
    loading: false,
    mode: "feed",
    params: null,
    paused: false,
  };

  // Per-instance sequencing + in-flight controller
  let resetSeq = 0;
  let inflight = null;

  const requestedPages = new Set();

  function getSpinner() {
    // Always return a spinner element that exists inside container.
    let spinner = container.querySelector('.scroller-spinner');
    if (spinner) return spinner;

    spinner = document.createElement('div');
    spinner.className = 'spinner loading_page scroller-spinner';
    spinner.style.display = 'none';
    spinner.innerHTML = `
      <span class="dot dot1"></span>
      <span class="dot dot2"></span>
      <span class="dot dot3"></span>
    `;
    container.appendChild(spinner);
    return spinner;
  }

  function setSpinnerVisible(visible) {
    const sp = getSpinner();
    if (sp) sp.style.display = visible ? 'flex' : 'none';
  }

  function set_last() {
    const prev = container.querySelector('.last_one');
    if (prev) prev.classList.remove('last_one');

    const spinner = container.querySelector('.scroller-spinner') || getSpinner();
    let p = spinner ? spinner.previousElementSibling : container.lastElementChild;
    while (p && !p.matches(itemSelector)) p = p.previousElementSibling;
    if (p && !p.classList.contains('only_one')) p.classList.add('last_one');
  }

  async function fetchPage(page, params, seq) {
    const sp = new URLSearchParams(params || '');
    sp.set('page', String(page));

    // Abort previous request for THIS scroller only
    if (inflight) inflight.abort('superseded');
    inflight = new AbortController();

    try {
      const res = await fetch(`${basePath}?${sp.toString()}`, {
        headers: { Accept: 'application/json' },
        signal: inflight.signal,
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error('Fetch failed');
      const json = await res.json();

      // If a newer reset started while we awaited, drop result.
      if (seq !== resetSeq) return null;
      return json; // { html, has_next }
    } catch (e) {
      if (isAbort(e)) return null;
      throw e;
    }
  }

  async function reset(params) {
    state.mode = params ? 'search' : 'feed';
    state.params = params || null;
    state.page = 1;
    state.loading = false;
    state.hasNext = true;
    requestedPages.clear();

    const mySeq = ++resetSeq;
    setSpinnerVisible(true);

    try {
      const data = await fetchPage(1, state.params, mySeq);
      if (!data || mySeq !== resetSeq) return;

      const { html, has_next } = data;
      state.hasNext = !!has_next;

      // If stale, stop BEFORE touching DOM
      if (mySeq !== resetSeq) return;

      // Reset container baseline
      container.innerHTML = `
        <div class="scroller-staging" style="visibility:hidden;pointer-events:none;"></div>
      `;
      // Re-add spinner after wipe
      // make sure there is only one spinner
      setSpinnerVisible(true);

      if (mySeq !== resetSeq) return;

      const staging = container.querySelector('.scroller-staging');
      staging.insertAdjacentHTML('afterbegin', (html || '').trim());

      set_last();

      await afterPaint();
      if (mySeq !== resetSeq) return;

      if (onAfterInsert) {
        await onAfterInsert(staging);
        if (mySeq !== resetSeq) return;
      }

      viewport_after_loading(staging, () => {
        if (mySeq === resetSeq) viewport();
      });

      // Reveal: move staging nodes before spinner
      const spinner = getSpinner();
      let node = staging.firstChild;
      while (node) {
        const next = node.nextSibling;
        spinner.parentNode.insertBefore(node, spinner);
        node = next;
      }
      staging.remove();

      set_last();
    } catch (e) {
      if (!isAbort(e)) {
        console.error(`[scroller:${key}] Failed to reset`, e);
      }
    } finally {
      if (mySeq === resetSeq) setSpinnerVisible(false);
    }
  }

  async function loadNext() {
    if (state.paused) return;
    if (!state.hasNext || state.loading) return;

    const nextPage = state.page + 1;
    if (requestedPages.has(nextPage)) return;
    requestedPages.add(nextPage);
    state.loading = true;

    const mySeq = resetSeq; // snapshot; if reset changes, this load is stale
    setSpinnerVisible(true);

    try {
      const data = await fetchPage(nextPage, state.params, mySeq);
      if (!data || mySeq !== resetSeq) return;

      const { html, has_next } = data;
      state.page = nextPage;
      state.hasNext = !!has_next;

      let spinner = document.querySelector('.spinner');
      if (spinner) {
        spinner.remove();
      }

      const temp = document.createElement('div');
      temp.innerHTML = html || '';

      const existing = new Set(
        Array.from(container.querySelectorAll(itemSelector))
          .map(getItemId)
          .filter(Boolean)
      );

      Array.from(temp.querySelectorAll(itemSelector)).forEach(n => {
        if (existing.has(getItemId(n))) n.remove();
      });

      if (mySeq !== resetSeq) return;

      spinner = getSpinner();
      const staging = document.createElement('div');
      staging.className = 'scroller-staging';
      staging.style.visibility = 'hidden';
      staging.style.pointerEvents = 'none';
      staging.innerHTML = temp.innerHTML;
      spinner.parentNode.insertBefore(staging, spinner);

      set_last();

      if (onAfterInsert) {
        await afterPaint();
        if (mySeq !== resetSeq) {
          staging.remove();
          return;
        }
        await onAfterInsert(staging);
        if (mySeq !== resetSeq) {
          staging.remove();
          return;
        }
      }

      let node = staging.firstChild;
      while (node) {
        const next = node.nextSibling;
        if (
          node.nodeType === Node.ELEMENT_NODE &&
          node.classList.contains('post_wrapper') &&
          !node.classList.contains('first_one') &&
          !node.classList.contains('only_one')) {
          node.style.marginTop = '4rem';
        }
        if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('post_wrapper')) {
          node.style.opacity = '1';
        }
        spinner.parentNode.insertBefore(node, spinner);
        node = next;
      }
      staging.remove();

      set_last();
    } catch (e) {
      if (!isAbort(e)) {
        console.error(`[scroller:${key}] Failed to load next page`, e);
      }
      requestedPages.delete(nextPage);
    } finally {
      if (mySeq === resetSeq) setSpinnerVisible(false);
      state.loading = false;
    }
  }

  function attachOnce(el) {
    if (!el) return;
    if (el.dataset[`scrollerBound_${key}`] === '1') return;
    el.dataset[`scrollerBound_${key}`] = '1';

    el.addEventListener('scroll', () => {
      if (state.paused) return;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
        loadNext();
      }
    });
  }
  attachOnce(container);

  const api = {
    resetToFeed:   () => reset(null),
    resetToSearch: (params) => reset(params),
    pause:  () => { state.paused = true; },
    resume: () => { state.paused = false; },
    get state() { return state; },
  };

  window.__feeds__[key] = api;
  return api;
}
