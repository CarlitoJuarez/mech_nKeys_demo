document.addEventListener("DOMContentLoaded", function() {

  const market_btn = document.getElementById("market_header");
  const keyboard_btn = document.getElementById("keyboard_header");

  const market_img = document.getElementById('market_img');
  const keyboard_img = document.getElementById('keyboard_img');
  const feed_bar = document.getElementById('feed_bar');


  // keyboard_btn.style.background = 'rgba(200, 200, 200, .8)';
  keyboard_btn.style.boxShadow = 'inset 2px 2px 2px 0px rgba(255, 255, 255, 0), 7px 7px 20px 0px rgba(0, 0, 0, 0.2), 4px 4px 5px 0px rgba(0, 0, 0, 0.2)';
  // market_btn.style.background = 'rgba(140, 140, 140, .2)';
  market_btn.style.boxShadow = 'none';
  market_img.src = '/static/imgs/market_b.png';
  keyboard_img.src = '/static/imgs/home_w.png';

})
