import { viewport } from './viewport_index.js'
import { show_smth, hide_smth } from '../show_hide.js'

document.addEventListener("DOMContentLoaded", function() {
  const feed_bar = document.getElementById('feed_bar');
  feed_bar.style.display = 'none';

  const logo = document.getElementById('index_logo');
  const index_buttons = document.getElementById('index_buttons');

  const login_btn = document.getElementById('login_btn');
  const register_btn = document.getElementById('register_btn');
  const reset_password = document.getElementById('reset_password');

  const login_form = document.getElementById('index_login_form');
  const register_form = document.getElementById('index_register_form');
  const password_form = document.getElementById('index_password_form');

  const to_register = document.querySelectorAll('.to_register');
  const to_login = document.querySelectorAll('.to_login');
  const forgot_password = document.querySelectorAll('.forgot_password');
  const password_reset_form = document.getElementById('password_reset_form');

  if (password_reset_form) {
    password_reset_form.style.zIndex = '10';
    password_reset_form.style.opacity = '1';
    const indexButtons = document.getElementById('index_buttons');
    if (indexButtons) indexButtons.style.display = 'none';
    return;
  }

  //  DISPLAY FORM
  function activate(mode)
  {
    logo.classList.add('add_form');
    index_buttons.style.opacity = "0";

    setTimeout(() => {
      const active_btn = mode === 'login' ? login_btn : register_btn;
      // active_btn.classList.add('centered');

      // index_buttons.style.display = "none";
      hide_smth(index_buttons);
      const form = mode === 'login' ? login_form : register_form;
      show_smth(form);
      setTimeout(() => form.style.zIndex = '1', 20);

      // AUTOFOCUS
      setTimeout(() => {
        const input = form.querySelector("input[type=text], input[type=email], input[type=password]");
        if (input) input.focus();
      }, 30);
      viewport();
    }, 400);
  }

  login_btn.addEventListener('click', () => activate('login'));
  register_btn.addEventListener('click', () => activate('register'));

  //  SWITCH FORM
  if (forgot_password) {
    forgot_password.forEach((e) => {
      e.addEventListener('click', () => {
        password_form.style.zIndex = '1';
        hide_smth(login_form);
        hide_smth(register_form);
        setTimeout(() => {
          show_smth(password_form);
          setTimeout(() => password_form.querySelector('input[type="email"]').focus(), 20);
        }, 200);
      });
    });
  }

  to_register.forEach((e) => {
    e.addEventListener('click', () => {
      hide_smth(login_form);
      hide_smth(password_form);
      activate('register');
    });
  });

  to_login.forEach((e) => {
    e.addEventListener('click', () => {
      hide_smth(register_form);
      hide_smth(password_form);
      activate('login');
    });
  });



})
