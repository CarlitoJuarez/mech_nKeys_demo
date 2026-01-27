import { show_smth, hide_smth } from '../show_hide.js'

export function viewport() {

  //  LOGIN / REGISTER
  let login_button = document.getElementById('login_btn');
  let register_button = document.getElementById('register_btn');
  let logo = document.getElementById('index_logo');
  let form = document.querySelector('.index_form');

  if (window.matchMedia('(max-width: 600px)').matches) {

    // Mobile

    // console.log("MOBILE");
    login_btn.style.width = '7rem';
    register_btn.style.width = '7rem';
    show_smth(logo);
    form.classList.remove('center');


  } else if (window.matchMedia('(min-width: 601px) and (max-width: 840px)').matches) {

    // Breakpoint TABLET

    // console.log("Breakpoint TABLET");
    login_btn.style.width = '7rem';
    register_btn.style.width = '7rem';
    show_smth(logo);
    form.classList.remove('center');

  } else if (window.matchMedia('(min-width: 841px) and (max-width: 1024px)').matches) {

    // Tablet

    // console.log("TABLET");
    login_btn.style.width = '7rem';
    register_btn.style.width = '7rem';
    show_smth(logo);
    form.classList.remove('center');


  } else if (window.matchMedia('(min-width: 1025px) and (max-width: 1180px)').matches) {

    if (window.matchMedia('(max-height: 800px').matches) {
      // Breakpoint DESKTOP LANDSCAPE
      // console.log("Breakpoint DESKTOP LANDSCAPE");
      login_btn.style.width = '9rem';
      register_btn.style.width = '9rem';
      if (logo.classList.contains('move_top_login') || logo.classList.contains('move_top_register')) {
        // hide_smth(logo);
        form.classList.add('center');
      } else {
        show_smth(logo);
      }
    } else {
      // Breakpoint DESKTOP NORMAL
      // console.log("Breakpoint DESKTOP NORMAL");
      login_btn.style.width = '9rem';
      register_btn.style.width = '9rem';
      show_smth(logo);
      form.classList.remove('center');
    }
  } else {

    // Desktop

    // console.log("DESKTOP");
    login_btn.style.width = '9rem';
    register_btn.style.width = '9rem';
    show_smth(logo);
    form.classList.remove('center');
  }
}

document.addEventListener('DOMContentLoaded', function() {


  // Initial check
  viewport();

  // Listen to window resizing
  window.addEventListener('resize', viewport);

});
