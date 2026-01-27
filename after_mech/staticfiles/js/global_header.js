import { hide_smth } from './show_hide.js'

document.addEventListener("DOMContentLoaded", async function() {
  const feed_bar = document.getElementById('feed_bar');
  const logo_div = document.querySelector('.home_btn');

  feed_bar.style.opacity = '1';
  if (logo_div) {
    logo_div.addEventListener('click', () => {

      hide_smth(logo_div.firstElementChild, 400);
      setTimeout(() => window.location.href = logo_div.dataset.url, 400);
    })
  }

});
