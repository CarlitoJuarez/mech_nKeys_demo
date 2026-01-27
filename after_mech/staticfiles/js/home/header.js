import Badges, { registerGlobalBadge } from '../badges.js';

document.addEventListener("DOMContentLoaded", async function() {
  const postWrapper = document.querySelectorAll('.post_wrapper');
  const feed_bar = document.getElementById('feed_bar');

  const messengerBadgeEl = document.getElementById('messenger_badge');            // badge on messenger icon
  const profileBtnBadgeEl = document.querySelector('.user_profile_btn .badge');   // optional second mirror
  if (messengerBadgeEl) registerGlobalBadge(messengerBadgeEl);
  if (profileBtnBadgeEl) registerGlobalBadge(profileBtnBadgeEl);

  // Initial snapshot (HTTP)
  await Badges.bootBadges({
    shouldCount: (e) => {
      // e.muted can be "1"/"0" (string) or boolean depending on your sender
      const v = e?.muted;
      return !(v === '1' || v === 1 || v === true);
    }
  });

  postWrapper.forEach(el => el.style.opacity = '1');
  feed_bar.style.boxShadow = 'inset 2px 2px 2px 0px rgba(255, 255, 255, 0), 7px 7px 20px 0px rgba(0, 0, 0, 0.2), 4px 4px 5px 0px rgba(0, 0, 0, 0.2)';

  // NAV SWITCH
  const market_btn = document.getElementById("market_header");
  const keyboard_btn = document.getElementById("keyboard_header");

  const market_div = document.getElementById("market_div");
  const keyboard_div = document.getElementById("keyboard_div");

  const keyboard_swap = keyboard_btn.querySelector('#keyboard_swap');
  const market_swap = market_btn.querySelector('#market_swap');

  const market_img = document.getElementById('market_img');
  const keyboard_img = document.getElementById('keyboard_img');


  if (!keyboard_swap) return;

  market_btn.onclick = function() {

    postWrapper.forEach(el => el.style.opacity = '0');
    setTimeout(() => feed_bar.style.boxShadow = 'none', 100);

    market_img.src = '/static/imgs/market_w.png';
    setTimeout(() => keyboard_img.src = '/static/imgs/home.png', 200);

    setTimeout(() => keyboard_swap.classList.remove('keyboard_swap'), 80);
    market_swap.classList.remove('market_swap');

    setTimeout(() => keyboard_swap.classList.add('keyboard_swap_hasnot'), 80);
    market_swap.classList.add('market_swap_has');

    // if (add_post_btn_wrapper) {
    //   add_post_btn_wrapper.style.transition = 'opacity .4s ease';
    //   add_post_btn_wrapper.style.opacity = '0';
    // }

    setTimeout(() => market_btn.style.boxShadow =
      'inset 2px 2px 2px 0px rgba(255, 255, 255, 0), 7px 7px 20px 0px rgba(0, 0, 0, 0.2), 4px 4px 5px 0px rgba(0, 0, 0, 0.2)', 200);
    setTimeout(() => keyboard_btn.style.boxShadow = 'none', 200);
    setTimeout(() => market_btn.style.border = 'dashed #AFE963 1px', 200);
    setTimeout(() => window.location.href = market_btn.dataset.url, 400);
  }

  keyboard_btn.onclick = function() {

    postWrapper.forEach(el => {
      el.style.opacity = '0';
    });
    setTimeout(() => feed_bar.style.boxShadow = 'none', 100);

    keyboard_img.src = '/static/imgs/home_w.png';
    setTimeout(() => market_img.src = '/static/imgs/market_b.png', 200);

    keyboard_swap.classList.remove('keyboard_swap');
    setTimeout(() => market_swap.classList.remove('market_swap'), 80);

    keyboard_swap.classList.add('keyboard_swap_has');
    setTimeout(() => market_swap.classList.add('market_swap_hasnot'), 80);

    // if (add_post_btn_wrapper) {
    //   add_post_btn_wrapper.style.transition = 'opacity .4s ease';
    //   add_post_btn_wrapper.style.opacity = '0';
    // }

    setTimeout(() => keyboard_btn.style.boxShadow =
        'inset 2px 2px 2px 0px rgba(255, 255, 255, 0), 7px 7px 20px 0px rgba(0, 0, 0, 0.2), 4px 4px 5px 0px rgba(0, 0, 0, 0.2)', 200);
    setTimeout(() => keyboard_btn.style.border = 'dashed #AFE963 1px', 200);
    setTimeout(() => market_btn.style.boxShadow = 'none', 200);
    setTimeout(() => window.location.href = keyboard_btn.dataset.url, 400);
  }





})










