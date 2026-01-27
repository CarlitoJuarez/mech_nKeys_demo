(() => {
  const banner = document.querySelector('.spin-banner .viewport');
  if (!banner) return;
  const wheel  = banner.querySelector('.wheel');
  const items  = [...wheel.querySelectorAll('.item')];

  const getVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parseTime = (str) => str.endsWith('ms') ? parseFloat(str) : str.endsWith('s') ? parseFloat(str)*1000 : parseFloat(str)||0;

  const spinMs  = parseTime(getVar('--spin-duration')) || 800;
  const pauseMs = parseTime(getVar('--pause')) || 1400;

  const step = 360 / items.length;
  items.forEach((el, i) => el.style.setProperty('--i', i * step));

  let index = 0, timer = null, playing = true;

  const setActive = (i) => {
    items.forEach((el, k) => el.classList.toggle('is-active', k === i));
    wheel.setAttribute('aria-label', `Highlight: ${items[i].textContent}`);
  };
  const rotateTo = (i) => {
    wheel.style.setProperty('--rot', `${-i * step}deg`);
    setActive(i);
  };
  const tick = () => {
    if (!playing) return;
    index = (index + 1) % items.length;
    rotateTo(index);
    timer = setTimeout(tick, spinMs + pauseMs);
  };

  banner.addEventListener('mouseenter', () => { playing = false; clearTimeout(timer); });
  banner.addEventListener('mouseleave', () => { if (!playing){ playing = true; timer = setTimeout(tick, pauseMs);} });

  const btnPrev = document.getElementById('prev');
  const btnNext = document.getElementById('next');
  const btnToggle = document.getElementById('toggle');
  if (btnPrev) btnPrev.addEventListener('click', () => { playing = false; clearTimeout(timer); index = (index - 1 + items.length) % items.length; rotateTo(index); });
  if (btnNext) btnNext.addEventListener('click', () => { playing = false; clearTimeout(timer); index = (index + 1) % items.length; rotateTo(index); });
  if (btnToggle) btnToggle.addEventListener('click', () => {
    playing = !playing;
    btnToggle.textContent = playing ? 'Pause' : 'Play';
    if (playing){ clearTimeout(timer); timer = setTimeout(tick, pauseMs); }
  });

  items.forEach(el => el.addEventListener('click', () => {
    const label = el.textContent.trim().toLowerCase();
    if (label.includes('pricing')) location.href = '/pricing';
    else if (label.includes('demo')) location.href = '/demo';
    else if (label.includes('case')) location.href = '/case-studies';
    else location.href = '/';
  }));

  rotateTo(index);
  timer = setTimeout(tick, pauseMs);
})();
