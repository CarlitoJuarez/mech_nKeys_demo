  export function viewport() {

    // ADD POST
    let img_wrapper = document.querySelector('#img_wrapper');
    let info_wrapper = document.querySelector('#info_wrapper');

    // POST
    let keyboard_div = document.querySelector('#keyboard_div');
    let post_info = document.querySelectorAll('.post_info');
    let post_div = document.querySelectorAll('.post_div');
    let img_div = document.querySelectorAll('.post_img');
    let post_chat_btns = document.querySelectorAll('.post_chat_btn');
    let post_img_bin = document.querySelectorAll('.post_bin');


    let banner = document.getElementById('banner');

    // COMMENT SECTION
    let comment_sections = document.querySelectorAll('.comment_section');
    let comment_date_desktop = document.querySelectorAll('.comment_date_desktop');
    let comment_date_tablet = document.querySelectorAll('.comment_date_tablet');
    let comment_edit = document.querySelectorAll('.comment_edit');
    let comment_edit_div = document.querySelectorAll('.comment_edit_div');
    let comment_edit_submit = document.querySelectorAll('.comment_edit_submit');
    let comment_delete_submit = document.querySelectorAll('.comment_delete_submit');

    // messenger
    let last_one_div = document.querySelectorAll('.last_one_div');


    // LOGO
    let logo = document.getElementById('logo_div');

    if (window.matchMedia('(max-width: 600px)').matches) {

      // Mobile

      // console.log("MOBILE");


      // LOGO

      logo.style.width = 'fit-content';

      // ADD POST

      img_wrapper.style.top = '11vh';
      if (img_wrapper.classList.contains('move_in')) {
        img_wrapper.style.left = '10vw';
      } else {
        img_wrapper.style.left = '-80vw';
      }
      img_wrapper.style.width = '80vw';
      img_wrapper.style.height = '36vh';

      info_wrapper.style.top = '49vh';
      if (info_wrapper.classList.contains('move_in')) {
        info_wrapper.style.right = '10vw';
      }
      else {
        info_wrapper.style.right = '-80vw';
      }
      info_wrapper.style.width = '80vw';
      info_wrapper.firstElementChild.style.maxWidth = '80vw';
      info_wrapper.style.height = '22.5vh';


      // MESSENGER
      last_one_div.forEach(elem => elem.style.display = 'none');


      // BANNER
      banner.style.display = 'none';


      // POST CHAT BTN
      post_chat_btns.forEach(elem => elem.style.display = '');
      post_chat_btns.forEach(elem => elem.style.marginLeft = '');
      post_chat_btns.forEach(elem => elem.style.bottom = '');
      post_chat_btns.forEach(elem => elem.classList.add('mobile_post_chat_btn'));


      // IMG DIV
      img_div.forEach(elem => elem.style.width = '100%');


      // POST INFO
      post_info.forEach(elem => elem.classList.add('tablet_post_info'));
      post_info.forEach(elem => {
        if (!elem.parentElement?.parentElement.classList.contains('chat_mode')) {
          elem.classList.add('hide');
          elem.style.opacity = '0';
        }
        elem.style.height = '11.2rem';
        let info_post_item = elem.querySelectorAll('.info_post_item');
        info_post_item.forEach(el => {
          // el.style.marginBottom = '1.12em';
        });
      });
      post_img_bin.forEach(elem => elem.style.right = '');
      post_img_bin.forEach(elem => elem.style.left = '.4rem');


      // POST DIV
      post_div.forEach(elem => elem.style.width = '80vw');
      post_div.forEach(elem => elem.parentElement.style.height = '12rem');
      post_div.forEach(elem => elem.style.height = '12rem');
      post_div.forEach(elem => elem.classList.remove('has_fade'));


      // COMMENT SECTION

      comment_sections.forEach(elem => elem.style.width = '80vw');

      comment_date_desktop.forEach(elem => elem.classList.remove('show'));
      comment_date_desktop.forEach(elem => elem.classList.add('hide'));

      comment_date_tablet.forEach(elem => elem.classList.remove('hide'));
      comment_date_tablet.forEach(elem => elem.classList.add('show'));

      comment_edit.forEach(elem => elem.style.right = '-18%');
      comment_edit_div.forEach(elem => elem.style.right = '-10%');
      comment_edit_submit.forEach(elem => elem.style.right = '-10%');
      comment_delete_submit.forEach(elem => elem.style.right = '-10%');

    } else if (window.matchMedia('(min-width: 601px) and (max-width: 840px)').matches) {


                                      // Breakpoint TABLET

      // console.log("Breakpoint TABLET");


      // LOGO

      logo.style.width = '4rem';


      // ADD POST

      img_wrapper.style.top = '11vh';
      if (img_wrapper.classList.contains('move_in')) {
        img_wrapper.style.left = '10vw';
      } else {
        img_wrapper.style.left = '-80vw';
      }
      img_wrapper.style.width = '80vw';
      img_wrapper.style.height = '36vh';

      info_wrapper.style.top = '49vh';
      if (info_wrapper.classList.contains('move_in')) {
        info_wrapper.style.right = '10vw';
      }
      else {
        info_wrapper.style.right = '-80vw';
      }
      info_wrapper.style.width = '80vw';
      info_wrapper.firstElementChild.style.maxWidth = '80vw';
      info_wrapper.style.height = '22.5vh';


      // MESSENGER
      last_one_div.forEach(elem => elem.style.display = 'flex');


      // BANNER
      banner.style.display = 'flex';
      banner.style.top = 'unset';
      banner.style.bottom = '1.8rem';
      banner.style.width = '8rem';

      // POST CHAT BTN
      post_chat_btns.forEach(elem => elem.classList.remove('mobile_post_chat_btn'));
      post_chat_btns.forEach(elem => elem.style.display = 'flex');
      post_chat_btns.forEach(elem => elem.style.marginLeft = '90vw');
      post_chat_btns.forEach(elem => elem.style.bottom = '.4rem');


      // IMG DIV
      img_div.forEach(elem => elem.style.width = '100%');


      // POST INFO
      post_info.forEach(elem => elem.classList.add('tablet_post_info'));
      post_info.forEach(elem => {
        if (!elem.parentElement?.parentElement.classList.contains('chat_mode')) {
          elem.classList.add('hide');
          elem.style.opacity = '0';
        }
        elem.style.height = '13.25rem';
      });
      post_img_bin.forEach(elem => elem.style.right = '');
      post_img_bin.forEach(elem => elem.style.left = '.4rem');


      // POST DIV
      post_div.forEach(elem => elem.style.width = '80vw');
      post_div.forEach(elem => elem.parentElement.style.height = '14rem');
      post_div.forEach(elem => elem.style.height = '14rem');
      post_div.forEach(elem => elem.classList.remove('has_fade'));


      // COMMENT SECTION
      comment_sections.forEach(elem => elem.style.width = '80vw');
      comment_date_desktop.forEach(elem => elem.classList.remove('show'));
      comment_date_desktop.forEach(elem => elem.classList.add('hide'));
      comment_date_tablet.forEach(elem => elem.classList.remove('hide'));
      comment_date_tablet.forEach(elem => elem.classList.add('show'));
      comment_edit.forEach(elem => elem.style.right = '-18%');
      comment_edit_div.forEach(elem => elem.style.right = '-10%');
      comment_edit_submit.forEach(elem => elem.style.right = '-10%');
      comment_delete_submit.forEach(elem => elem.style.right = '-10%');

    } else if (window.matchMedia('(min-width: 601px) and (max-width: 1024px)').matches) {

                                      // Tablet

      // console.log("TABLET");


      // LOGO

      logo.style.width = '4rem';

      // MESSENGER
      last_one_div.forEach(elem => elem.style.display = 'flex');

      // BANNER
      banner.style.display = 'flex';
      banner.style.top = '.2vh';
      banner.style.left = '.4rem';
      banner.style.minWidth = '6rem';


      // ADD POST

      img_wrapper.style.top = '11vh';
      if (img_wrapper.classList.contains('move_in')) {
        img_wrapper.style.left = '10vw';
      } else {
        img_wrapper.style.left = '-80vw';
      }
      img_wrapper.style.width = '80vw';
      img_wrapper.style.height = '36vh';

      info_wrapper.style.top = '49vh';
      if (info_wrapper.classList.contains('move_in')) {
        info_wrapper.style.right = '10vw';
      }
      else {
        info_wrapper.style.right = '-80vw';
      }
      info_wrapper.style.width = '80vw';
      info_wrapper.firstElementChild.style.maxWidth = '80vw';
      info_wrapper.style.height = '22.5vh';




      // POST CHAT BTN
      post_chat_btns.forEach(elem => elem.style.display = 'flex');
      post_chat_btns.forEach(elem => elem.style.marginLeft = '88.5vw');
      post_chat_btns.forEach(elem => elem.style.bottom = '');
      post_chat_btns.forEach(elem => elem.classList.remove('mobile_post_chat_btn'));

      // IMG DIV
      img_div.forEach(elem => elem.style.width = '100%');


      // POST INFO
      post_info.forEach(elem => elem.classList.add('tablet_post_info'));
      post_info.forEach(elem => {
        if (!elem.parentElement?.parentElement.classList.contains('chat_mode')) {
          elem.classList.add('hide');
          elem.style.opacity = '0';
        }
        elem.style.height = '16.2rem';
      });
      post_img_bin.forEach(elem => elem.style.right = '');
      post_img_bin.forEach(elem => elem.style.left = '.4rem');


      // POST DIV
      post_div.forEach(elem => elem.style.width = '80vw');
      post_div.forEach(elem => elem.parentElement.style.height = '17rem');
      post_div.forEach(elem => elem.style.height = '17rem');
      post_div.forEach(elem => elem.classList.remove('has_fade'));


      // COMMENT SECTION
      comment_sections.forEach(elem => elem.style.width = '80vw');
      comment_date_desktop.forEach(elem => elem.classList.remove('hide'));
      comment_date_desktop.forEach(elem => elem.classList.add('show'));
      comment_date_tablet.forEach(elem => elem.classList.remove('show'));
      comment_date_tablet.forEach(elem => elem.classList.add('hide'));

      comment_edit.forEach(elem => elem.style.right = '0');
      comment_edit_div.forEach(elem => elem.style.right = '1.6rem');
      comment_edit_submit.forEach(elem => elem.style.right = '1.6rem');
      comment_delete_submit.forEach(elem => elem.style.right = '1.6rem');

    } else if (window.matchMedia('(min-width: 601px) and (max-width: 1180px)').matches) {

                                    // Breakpoint DESKTOP

      // console.log("Breakpoint DESKTOP");


      // LOGO

      logo.style.width = '4rem';


      // ADD POST

      img_wrapper.style.top = '15vh';
      if (img_wrapper.classList.contains('move_in')) {
        img_wrapper.style.left = '10vw';
      } else {
        img_wrapper.style.left = '-80vw';
      }
      img_wrapper.style.width = '60vw';
      img_wrapper.style.height = '55vh';

      info_wrapper.style.top = '15vh';
      if (info_wrapper.classList.contains('move_in')) {
        info_wrapper.style.right = '9vw';
      }
      else {
        info_wrapper.style.right = '-19vw';
      }
      info_wrapper.style.width = '19vw';
      info_wrapper.firstElementChild.style.maxWidth = '60vw';
      info_wrapper.style.height = '55vh';


      // MESSENGER
      last_one_div.forEach(elem => elem.style.display = 'flex');

      // BANNER
      banner.style.display = 'flex';
      banner.style.top = '.4vh';
      banner.style.left = '.4rem';
      banner.style.width = '12vw';

      // POST_CHAT_BTN
      post_chat_btns.forEach(elem => elem.style.display = 'flex');
      post_chat_btns.forEach(elem => elem.style.marginLeft = '45.5rem');
      post_chat_btns.forEach(elem => elem.style.bottom = '');
      post_chat_btns.forEach(elem => elem.classList.remove('mobile_post_chat_btn'));


      // IMG DIV
      img_div.forEach(elem => elem.style.width = '75%');


      // POST DIV
      post_div.forEach(elem => elem.style.width = '42rem');
      post_div.forEach(elem => elem.parentElement.style.height = '17rem');
      post_div.forEach(elem => elem.style.height = '17rem');
      post_div.forEach(elem => elem.classList.add('has_fade'));



      // POST INFO
      // post_info.forEach(elem => elem.style.display = 'initial');
      post_info.forEach(elem => elem.classList.remove('tablet_post_info'));
      post_info.forEach(elem => {
        if (!elem.parentElement?.parentElement.classList.contains('chat_mode')) {
          elem.classList.remove('hide');
          elem.style.opacity = '1';
        }
        elem.style.height = '100%';
      });
      post_img_bin.forEach(elem => elem.style.right = '.4');
      post_img_bin.forEach(elem => elem.style.left = '');


      // COMMENT SECTION
      comment_sections.forEach(elem => elem.style.width = '85vw');
      comment_date_desktop.forEach(elem => elem.classList.remove('hide'));
      comment_date_desktop.forEach(elem => elem.classList.add('show'));
      comment_date_tablet.forEach(elem => elem.classList.remove('show'));
      comment_date_tablet.forEach(elem => elem.classList.add('hide'));

      comment_edit.forEach(elem => elem.style.right = '0');
      comment_edit_div.forEach(elem => elem.style.right = '1.6rem');
      comment_edit_submit.forEach(elem => elem.style.right = '1.6rem');
      comment_delete_submit.forEach(elem => elem.style.right = '1.6rem');

    } else {
                                        // Desktop

      // console.log("DESKTOP");


      // LOGO

      logo.style.width = '4rem';


      // ADD POST

      img_wrapper.style.top = '15vh';
      if (img_wrapper.classList.contains('move_in')) {
        img_wrapper.style.left = '10vw';
      } else {
        img_wrapper.style.left = '-80vw';
      }
      img_wrapper.style.width = '60vw';
      img_wrapper.style.height = '55vh';

      info_wrapper.style.top = '15vh';
      if (info_wrapper.classList.contains('move_in')) {
        info_wrapper.style.right = '9vw';
      }
      else {
        info_wrapper.style.right = '-19vw';
      }
      info_wrapper.style.width = '19vw';
      info_wrapper.firstElementChild.style.maxWidth = '60vw';
      info_wrapper.style.height = '55vh';
 

      // MESSENGER
      last_one_div.forEach(elem => elem.style.display = 'flex');


      // BANNER
      banner.style.display = 'flex';
      banner.style.top = '.4vh';
      banner.style.left = '.4rem';
      banner.style.width = '12vw';


      // POST_CHAT_BTN
      post_chat_btns.forEach(elem => elem.style.display = 'flex');
      post_chat_btns.forEach(elem => elem.style.marginLeft = '45.5rem');
      post_chat_btns.forEach(elem => elem.style.bottom = '');
      post_info.forEach(elem => elem.style.display = 'initial');
      post_chat_btns.forEach(elem => elem.classList.remove('mobile_post_chat_btn'));

      // IMG_DIV
      img_div.forEach(elem => elem.style.width = '75%');

      // POST_DIV
      post_div.forEach(elem => elem.style.width = '42rem');
      post_div.forEach(elem => elem.parentElement.style.height = '17rem');
      post_div.forEach(elem => elem.style.height = '17rem');
      post_div.forEach(elem => elem.classList.add('has_fade'));

      // POST INFO
      post_info.forEach(elem => elem.classList.remove('tablet_post_info'));
      post_info.forEach(elem => {
        if (!elem.parentElement?.parentElement.classList.contains('chat_mode')) {
          elem.classList.remove('hide');
          elem.style.opacity = '1';
        }
        elem.style.height = '100%';
      });
      post_img_bin.forEach(elem => elem.style.right = '.4');
      post_img_bin.forEach(elem => elem.style.left = '');

      // COMMENT SECTION
      comment_sections.forEach(elem => elem.style.width = '42rem');
      comment_date_desktop.forEach(elem => elem.classList.remove('hide'));
      comment_date_desktop.forEach(elem => elem.classList.add('show'));
      comment_date_tablet.forEach(elem => elem.classList.remove('show'));
      comment_date_tablet.forEach(elem => elem.classList.add('hide'));
      comment_edit.forEach(elem => elem.style.right = '0');
      comment_edit_div.forEach(elem => elem.style.right = '1.6rem');
      comment_edit_submit.forEach(elem => elem.style.right = '1.6rem');
      comment_delete_submit.forEach(elem => elem.style.right = '1.6rem');

    }
  }

document.addEventListener('DOMContentLoaded', function() {


  // Initial check
  viewport();

  // Listen to window resizing
  window.addEventListener('resize', viewport);
  keyboard_div.addEventListener('scroll', viewport);

});
