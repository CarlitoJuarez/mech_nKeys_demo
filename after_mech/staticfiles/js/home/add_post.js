import { rebindPosts } from './post.js';
import { ensureScroller } from './scroller.js';
import { viewport } from './viewport.js';
import { bindChat } from './post.js';
import { handleEsc, deleteEsc, handleEsc_add } from '../esc_module.js';
import { clearServerErrors } from '../server_errors.js';
import { showErrorBanner } from '../server_errors.js';
import { hide_smth, show_smth } from '../show_hide.js';
import { getCookie } from '../get_cookie.js';

// HELPER
function realt() {
  if (!window.AppRealtime) {
    console.warn('AppRealtime not found; load realtime.js first.');
    return null;
  }
  return window.AppRealtime;
}

export function toggleLoader() {
  const el = document.querySelector('.loading_overlay');
  if (el.classList.contains('hide')) {
    el.classList.remove('hide');
    el.classList.add('show');
  } else {
    el.classList.remove('show');
    el.classList.add('hide');
  }
}



export function add_post_field () {
  const add_post_btn = document.querySelector('.add_post_btn');
  const add_post_dev_info = document.getElementById('add_post_dev_info');
  const add_post_btn_img = document.getElementById('add_post_btn_img');

  const add_post_info = document.getElementById('add_post_info');
  const info_wrapper = document.getElementById('info_wrapper');
  const add_post_img = document.getElementById('add_post_img');
  const img_wrapper = document.getElementById('img_wrapper');
  const add_post_descr = document.getElementById('add_post_descr');
  const exit_btn = document.getElementById('exit_btn');

  let create_name = document.querySelector('.create_name');
  let create_brand = document.querySelector('.create_brand');
  let create_color = document.querySelector('.create_color');
  let create_switches = document.querySelector('.create_switches');
  let create_keycaps = document.querySelector('.create_keycaps');
  let create_m_style = document.querySelector('.create_m_style');
  let create_for_sale = document.querySelector('.create_for_sale');
  let create_price = document.querySelector('.create_price');

  // SWITCHES AND KEYCAPS
  let create_switches_lubed = document.querySelector('.create_switches_lubed');
  let create_switch_amount = document.querySelector('.create_switch_amount');

  let create_switch_type = document.querySelector('.create_switch_type');
  let create_cap_material = document.querySelector('.create_cap_material');

  let create_category = document.querySelector('.create_category');
  let create_layout = document.querySelector('.create_layout');
  let create_description = document.querySelector('.create_description');


  let image_input = img_wrapper.querySelector('#files_id');
  const slide_show = img_wrapper.querySelector('#slide_show');
  const bin = img_wrapper.querySelector('#add_post_bin');
  const next_img = img_wrapper.querySelector('#add_post_next_img');
  const prev_img = img_wrapper.querySelector('#add_post_prev_img');
  const img_warning = img_wrapper.querySelector('.img_warning');
  let cur_files = [];


  // LABELS
  let p_layout_label = document.getElementById('p_layout_label');
  let p_switches_label = document.getElementById('p_switches_label');
  let p_keycaps_label = document.getElementById('p_keycaps_label');
  let p_mount_label = document.getElementById('p_mount_label');
  let p_color_label = document.getElementById('p_color_label');
  let p_sale_label = document.querySelector('.for_sale');
  let p_price_label = document.querySelector('.price_label');

  // SWITCHES AND KEYCAPS
  let s_lubed_label = document.getElementById('s_lubed_label');
  let s_type_label = document.getElementById('s_type_label');
  let s_amount_label = document.getElementById('s_amount_label');
  let k_material_label = document.getElementById('k_material_label');

  const line = document.querySelector('.add_post_line');

  // DISABLE POST CHAT BTNS
  let postWrapper = document.querySelectorAll('.post_wrapper');
  const keyboard_div = document.getElementById('keyboard_div');
  let scroller; // 1) declare first so the callback can close over it
  scroller = ensureScroller({
    container: keyboard_div,
    onAfterInsert: (root) => rebindPosts(root, scroller), // 2) callback uses the same binding
  });

  if (exit_btn.classList.contains('show')) {
    return ;
  }


  // RESHIFT_BAR
  let re_shift_bar = function(was_before) {
    hide_smth(p_price_label);
    hide_smth(create_price);
    hide_smth(p_sale_label);
    hide_smth(create_for_sale);
    if (!was_before) {
      return;
    } else if (was_before == 'Keyboard') {
      setTimeout(() => {
        hide_smth(p_mount_label);
        hide_smth(create_m_style);
      }, 50);
      setTimeout(() => {
        hide_smth(p_keycaps_label);
        hide_smth(create_keycaps);
      }, 100);
      setTimeout(() => {
        hide_smth(p_switches_label);
        hide_smth(create_switches);
      }, 150);
      setTimeout(() => {
        hide_smth(p_color_label);
        hide_smth(create_color);
      }, 200);
      setTimeout(() => {
        hide_smth(p_layout_label);
        hide_smth(create_layout);
      }, 250);
    } else if (was_before == 'Keycaps') {
      setTimeout(() => {
        hide_smth(p_color_label);
        hide_smth(create_color);
      }, 50);
      setTimeout(() => {
        hide_smth(k_material_label);
        hide_smth(create_cap_material);
      }, 100);
    } else if (was_before== 'Switches') {
      setTimeout(() => {
        hide_smth(s_lubed_label);
        hide_smth(create_switches_lubed);
      }, 50);
      setTimeout(() => {
        hide_smth(p_color_label);
        hide_smth(create_color);
      }, 100);
      setTimeout(() => {
        hide_smth(s_amount_label);
        hide_smth(create_switch_amount);
      }, 150);
      setTimeout(() => {
        hide_smth(s_type_label);
        hide_smth(create_switch_type);
      }, 200);
    } else if (was_before == 'Other') {
      setTimeout(() => {
        hide_smth(p_color_label);
        hide_smth(create_color);
      }, 50);
    }
  }


  const resize_line = function() {
    setTimeout(() => {
      if (!create_category.value || create_category.value == "None") {
        line.style.height = '5rem';
      } else if (create_category.value == 'Other') {
        line.style.height = '7rem';
      } else if (create_category.value == 'Keyboard') {
        line.style.height = '13rem';
      } else if (create_category.value == 'Switches') {
        line.style.height = '12rem';
      } else if (create_category.value == 'Keycaps') {
        line.style.height = '9rem';
      }
    }, 20);
  }

  const clear_input = function () {
    let mandatories = document.querySelectorAll('.mandatory');
    let mandatory_arr = Array.from(mandatories);
    mandatory_arr.forEach(i => {
      i.style.border = 'none';
    })
    add_post_img.style.border = 'none'
    let create_images = img_wrapper.querySelectorAll('.create_image');
    let images_arr = Array.from(create_images);
    images_arr.forEach(i => {
      i.remove();
    })
    bin.classList.add('hide');
    create_name.value = "";
    create_brand.value = "";
    create_category.selectedIndex = 0;
    create_category.value = "";
    create_layout.selectedIndex = 0;
    create_layout.value = "";
    create_cap_material.selectedIndex = 0;
    create_switch_type.selectedIndex = 0;
    create_color.value = "";
    create_switches.value = "";
    create_keycaps.value = "";
    create_m_style.value = "";
    create_switches_lubed.checked = false;
    create_switch_amount.value = '';
    create_switch_type.value = '';
    create_cap_material.value = '';
    create_price.value = '';
    create_for_sale.checked = false;
    create_description.value = "";
    if (create_color.classList.contains('hide')) {
      //NOTHING BEFORE SELECTED
      re_shift_bar();
    } else if (create_switch_type.classList.contains('show')) {
      re_shift_bar("Switches");
    } else if (create_cap_material.classList.contains('show')) {
      re_shift_bar("Keycaps");
    } else if (create_layout.classList.contains('show')) {
      re_shift_bar("Keyboard");
    } else {
      re_shift_bar("Other");
    }
    resize_line();
  }



  let close_add_post = function () {
    add_post_dev_info.classList.remove('open');
    // add_post_btn_img.style.rotate = ('0deg');
    img_wrapper.classList.remove('move_in');
    info_wrapper.classList.remove('move_in');
    add_post_descr.classList.remove('move_in');
    img_wrapper.classList.add('move_out');
    info_wrapper.classList.add('move_out');
    add_post_descr.classList.add('move_out');
    deleteEsc();
    viewport();

    postWrapper.forEach(elem => {
      let post_chat_btn = elem.querySelector('.post_chat_btn');
      let edit_btn = elem.querySelector('.edit_btn');

      post_chat_btn.addEventListener('click', post_chat_btn._chatHandler);
      show_smth(post_chat_btn);

      if (edit_btn) {
        edit_btn.addEventListener('click', edit_btn._chatHandler);
        show_smth(edit_btn);
      }
    });
  }


  if (add_post_btn.classList.contains('active')) {
    add_post_btn.classList.remove('active');
    close_add_post();
  } else {
    add_post_btn.classList.add('active');
    // FIRST CLOSE ANY OTHER BOARD DIV
    handleEsc(close_add_post);
    handleEsc_add(clear_input);
    postWrapper.forEach(elem => {
      let post_chat_btn = elem.querySelector('.post_chat_btn');
      post_chat_btn.removeEventListener('click', post_chat_btn._chatHandler);
      hide_smth(post_chat_btn);

      let edit_btn = elem.querySelector('.edit_btn');
      if (edit_btn) {
        edit_btn.removeEventListener('click', edit_btn._chatHandler);
        hide_smth(edit_btn);
      }
    });
    add_post_dev_info.classList.add('open');
    // add_post_btn_img.style.rotate = ('45deg');
    img_wrapper.classList.remove('move_out');
    info_wrapper.classList.remove('move_out');
    add_post_descr.classList.remove('move_out');
    img_wrapper.classList.add('move_in');
    info_wrapper.classList.add('move_in');
    add_post_descr.classList.add('move_in');
    viewport();



    // IMAGE HANDLING

    function image_handling_re () {
      add_post_img.style.border = '.5px solid #dcdcde';

      let new_files = Array.from(document.getElementById('files_id').files);
      return (new_files);
    }

    image_input.addEventListener('click', function() {
        this.value = '';
    });

    image_input.onchange = function() {
      let new_files = image_handling_re();

      let cur_images = img_wrapper.querySelectorAll('.create_image');
      let cur_image_count = Array.from(cur_images).length;

      new_files.forEach((file, index) => {
        show_smth(bin);
        if ((index === 0 && cur_image_count) || index > 0) {
          next_img.style.display = 'block';
        }
        // save to file_list
        cur_files.push(file);

        // create new img and display
        const objectUrl = URL.createObjectURL(file);
        const img = document.createElement('img');
        img.src = objectUrl;
        img.alt = file.name;
        img.className = 'img';
        img.classList.add('create_image');
        if (index === 0 && cur_image_count === 0)
          img.style.display = 'block';
        else
          img.style.display = 'none';
        img.setAttribute('id', 'img_' + (cur_image_count + index));
        slide_show.appendChild(img);
      });
    };


    let page = 0
    next_img.onclick = function () {
        let image_count = img_wrapper.querySelectorAll('.create_image').length;
        if (page < 0) {
          page = 0;
        }
        page++;
        if (image_count < page) { // prevent page from getting higher then image_count
            page = page - 1
        }
        var prev_one = img_wrapper.querySelector('#img_'+(page-1))
        var this_one = img_wrapper.querySelector('#img_'+page)
        // for (var i = 0; i < image.files.length; i++) {
        if (prev_one) {
          prev_one.style.display = 'none';
        }
        this_one.style.display = 'block';
        // }
        prev_img.style.display = 'block';
        if (page == image_count - 1) {
            next_img.style.display = 'none';
        }
    }

    prev_img.onclick = function () {
        let image_count = img_wrapper.querySelectorAll('.create_image').length;

        page = page - 1;

        if (page < 0) {
          page = 0;
        }

        if (image_count < 0) { // prevent page from getting lower then 0
            page = page + 1
        }
        var prev_one = img_wrapper.querySelector('#img_' + (page + 1))
        var this_one = img_wrapper.querySelector('#img_' + page )
        prev_one.style.display = 'none';
        this_one.style.display = 'block';
        next_img.style.display = 'block'
        if (page == 0) {
            prev_img.style.display = 'none'
        }
    }

    bin.onclick = function () {

      let create_images = img_wrapper.querySelectorAll('.create_image');
      let image_count = create_images.length;

      if (image_count <= 10) {
        img_warning.classList.remove('show');
        img_warning.classList.add('hide');
      }

      let list_images = []
      if (image_count === 0) {
        return ;
      } else if (image_count === 1) {
        cur_files = [];
        create_images[0].remove();
        hide_smth(bin);
        return ;
      }

      let flag = 0;
      for (let i = 0; i < image_count; i++) {
        if ( !flag && create_images[i].style.display === 'block') {
          create_images[i].remove();
          if (i > 0) {
            create_images[i - 1].style.display = 'block';
            page--;
            flag = 1;
          } else if (i < image_count - 1){
            create_images[i + 1].style.display = 'block';
          }
          flag++;
        } else if (flag) {
          create_images[i].id = 'img_' + (i - 1);
        }
      }
      cur_files.splice(page, 1);
      if (page === 0) {
        prev_img.style.display = 'none';
        next_img.style.display = 'block';
      } else if (page >= image_count - 1) {
        prev_img.style.display = 'block';
        next_img.style.display = 'none';
      }
      if (image_count - 1 <= 1) {
        prev_img.style.display = 'none';
        next_img.style.display = 'none';
      }
    }


    next_img.onmouseover = function () {
        let img_button = next_img.firstElementChild
        img_button.style.right = '-8px';
        img_button.style.transition = 'right 300ms'
    }
    next_img.onmouseleave = function () {
        let img_button = next_img.firstElementChild
        img_button.style.right = '-5px';
        img_button.style.transition = 'right 300ms'
    }
    prev_img.onmouseover = function () {
        let img_button = prev_img.firstElementChild
        img_button.style.left = '-16px';
        img_button.style.transition = 'left 300ms';
    }
    prev_img.onmouseleave = function () {
        let img_button = prev_img.firstElementChild
        img_button.style.left = '-13px';
        img_button.style.transition = 'left 300ms'
    }
  }


  // CATEGORY SELECTED
  create_category.onchange = function () {

    // OTHER SELECTED
    let display_other = function(time_set) {
      create_for_sale.checked = false;
      setTimeout(() => show_smth(p_color_label), time_set);
      setTimeout(() => show_smth(create_color), time_set);
      setTimeout(() => show_smth(p_sale_label), time_set + 50);
      setTimeout(() => show_smth(create_for_sale), time_set + 50);
    }

    // SWITCHES SELECTED
    let display_switches = function (time_set) {
      create_for_sale.checked = false;
      setTimeout(() => show_smth(s_type_label), time_set);
      setTimeout(() => show_smth(create_switch_type), time_set);
      setTimeout(() => show_smth(s_amount_label), time_set + 50);
      setTimeout(() => show_smth(create_switch_amount), time_set + 50);
      setTimeout(() => show_smth(p_color_label), time_set + 100);
      setTimeout(() => show_smth(create_color), time_set + 100);
      setTimeout(() => show_smth(s_lubed_label), time_set + 150);
      setTimeout(() => show_smth(create_switches_lubed), time_set + 150);
      setTimeout(() => show_smth(p_sale_label), time_set + 200);
      setTimeout(() => show_smth(create_for_sale), time_set + 200);
    }

    // KEYCAPS SELECTED
    let display_keycaps = function(time_set) {
      create_for_sale.checked = false;
      setTimeout(() => show_smth(k_material_label), time_set);
      setTimeout(() => show_smth(create_cap_material), time_set);
      setTimeout(() => show_smth(p_color_label), time_set + 50);
      setTimeout(() => show_smth(create_color), time_set + 50);
      setTimeout(() => show_smth(p_sale_label), time_set + 100);
      setTimeout(() => show_smth(create_for_sale), time_set + 100);
    }

    // KEYBOARD SELECTED
    let display_keyboard = function(time_set) {
      create_category.style.border = 'none';
      p_category_label.style.color = '';

      setTimeout(() => show_smth(p_layout_label), time_set);
      setTimeout(() => show_smth(create_layout), time_set);
      setTimeout(() => show_smth(p_color_label), time_set + 50);
      setTimeout(() => show_smth(create_color), time_set + 50);
      setTimeout(() => show_smth(p_switches_label), time_set + 100);
      setTimeout(() => show_smth(create_switches), time_set + 100);
      setTimeout(() => show_smth(p_keycaps_label), time_set + 150);
      setTimeout(() => show_smth(create_keycaps), time_set + 150);
      setTimeout(() => show_smth(p_mount_label), time_set + 200);
      setTimeout(() => show_smth(create_m_style), time_set + 200);
      setTimeout(() => show_smth(p_sale_label), time_set + 250);
      setTimeout(() => show_smth(create_for_sale), time_set + 250);
    }

    create_color.addEventListener('input', () => {
      if (create_color.value && create_color.style.border !== 'none') {
        create_color.style.border = 'none';
      }
    })

    if (create_category.value === "Keyboard") {
      if (create_color.classList.contains('hide')) {
        //NOTHING BEFORE SELECTED
        display_keyboard(50)
      } else if (create_switch_type.classList.contains('show')) {
        re_shift_bar("Switches");
        display_keyboard(500);
      } else if (create_cap_material.classList.contains('show')) {
        re_shift_bar("Keycaps");
        display_keyboard(400);
      } else if (create_layout.classList.contains('show')) {
        re_shift_bar("Keyboard");
        display_keyboard(550);
      } else {
        re_shift_bar("Other");
        display_keyboard(350);
      }
    } else if (create_category.value == "Keycaps") {
      if (create_color.classList.contains('hide')) {
        //NOTHING BEFORE SELECTED
        display_keycaps(50)
      } else if (create_switch_type.classList.contains('show')) {
        re_shift_bar("Switches");
        display_keycaps(500);
      } else if (create_cap_material.classList.contains('show')) {
        re_shift_bar("Keycaps");
        display_keycaps(400);
      } else if (create_layout.classList.contains('show')) {
        re_shift_bar("Keyboard");
        display_keycaps(550);
      } else {
        re_shift_bar("Other");
        display_keycaps(350);
      }
    } else if (create_category.value == "Switches") {
      if (create_color.classList.contains('hide')) {
        //NOTHING BEFORE SELECTED
        display_switches(50)
      } else if (create_switch_type.classList.contains('show')) {
        re_shift_bar("Switches");
        display_switches(500);
      } else if (create_cap_material.classList.contains('show')) {
        re_shift_bar("Keycaps");
        display_switches(400);
      } else if (create_layout.classList.contains('show')) {
        re_shift_bar("Keyboard");
        display_switches(550);
      } else {
        re_shift_bar("Other");
        display_switches(350);
      }
    } else if (create_category.value == "Other") {
      if (create_color.classList.contains('hide')) {
        //NOTHING BEFORE SELECTED
        display_other(50)
      } else if (create_switch_type.classList.contains('show')) {
        re_shift_bar("Switches");
        display_other(500);
      } else if (create_cap_material.classList.contains('show')) {
        re_shift_bar("Keycaps");
        display_other(400);
      } else if (create_layout.classList.contains('show')) {
        re_shift_bar("Keyboard");
        display_other(550);
      } else {
        re_shift_bar("Other");
        display_other(350);
      }
    } else { // NOTHING SELECTED
      if (create_color.classList.contains('hide')) {
        //NOTHING WAS SELECTED
      } else if (create_switch_type.classList.contains('show')) {
        re_shift_bar("Switches");
      } else if (create_cap_material.classList.contains('show')) {
        re_shift_bar("Keycaps");
      } else if (create_layout.classList.contains('show')) {
        re_shift_bar("Keyboard");
      } else {
        re_shift_bar("Other");
      }
    }
    resize_line();
  }

  create_for_sale.onchange = function () {
    if (create_for_sale.checked) {
      show_smth(create_price);
      show_smth(p_price_label);
    } else {
      hide_smth(create_price);
      hide_smth(p_price_label);
    }
  }

  create_switch_amount.onchange = function () {
    if (create_switch_amount.value) {
      create_switch_amount.style.border = 'none';
    }
  }

  create_price?.addEventListener('blur', () => {
    if (!create_for_sale.checked) return;
    const v = Number(create_price.value);
    if (Number.isNaN(v)) return;
    if (v < 10) create_price.value = 10;
    if (v > 10000) create_price.value = 10000;
  });

  create_switch_amount?.addEventListener('blur', () => {
    const v = Number(create_switch_amount.value);
    if (Number.isNaN(v)) return;
    if (v < 10) create_switch_amount.value = 10;
    if (v > 999) create_switch_amount.value = 999;
  });


  // Start Submitting New Post
  const submit_btn = document.getElementById('submit_post');
  const submit_img = document.querySelector('.submit_image');

  const p_name_label = document.getElementById('p_name_label');
  const p_brand_label = document.getElementById('p_brand_label');
  const p_category_label = document.getElementById('p_category_label');


  let error_div = document.querySelector('#error_div');

    submit_btn.onmouseover = function () {
        submit_img.style.left = '.1rem';
        submit_img.style.transition = 'left .2s ease-in-out';
    }
    submit_btn.onmouseleave = function () {
        submit_img.style.left = '-.4rem';
        submit_img.style.transition = 'left .2s linear';
    }


  let renderServerErrors = function(errorArray) {
    clearServerErrors();
    const msgs = Object.values(errorArray).flat();
    msgs.forEach(error => showErrorBanner(String(error)))
  };

  let submit_create = document.querySelector('#submit_post')

  submit_create.onclick = async function(e) {

    e.preventDefault();
    clearServerErrors();

    let create_images = img_wrapper.querySelectorAll('.create_image');

    let images_arr = Array.from(create_images);
    // FIRST CHECK IF INPUT IS COMPLETE AND VALID
    if (!create_name.value || !create_brand.value || images_arr.length == 0 || create_category.value === 'None')
    {
      if (!create_name.value)
      {
        create_name.style.transition = 'border .4s ease';
        create_name.style.border = ".5px solid red";
      }
      if (!create_brand.value)
      {
        create_brand.style.transition = 'border .5s ease';
        create_brand.style.border = ".5px solid red";
      }
      if (create_category.value == "None")
      {
        create_category.style.transition = 'border .5s ease';
        create_category.style.border = ".5px solid red";
        return ;
      }
      if (create_images.length == 0)
      {
        add_post_img.style.transition = 'border .5s ease';
        add_post_img.style.border = '1.5px solid red';
      }
      return ;
    } else {
      if (create_category.value === "Keyboard") {
        if (!create_color.value) {
          create_color.style.transition = 'border .5s ease';
          create_color.style.border = ".5px solid red";
        }
      } else {
        if (!create_color.value) {
          create_color.style.transition = 'border .5s ease';
          create_color.style.border = ".5px solid red";
        } 
      }
      if (create_category.value === "Keyboard") {
        if (create_layout.value === 'None') {
          create_layout.style.transition = 'border .5s ease';
          create_layout.style.border = ".5px solid red";
          return ;
        }
      } else if (create_category.value === "Switches") {
        if (create_switch_type.value == "None") {
          create_switch_type.style.transition = 'border .5s ease';
          create_switch_type.style.border = ".5px solid red";
        }
        if (create_switch_amount.value === "") {
          create_switch_amount.style.transition = 'border .5s ease';
          create_switch_amount.style.border = ".5px solid red";
        }
        if (create_switch_amount.value === "" || create_switch_type.value === "None") {
          return ;
        }
      } else if (create_category.value === "Keycaps") {
        if (create_cap_material.value == "None")
        {
          create_cap_material.style.transition = 'border .5s ease';
          create_cap_material.style.border = ".5px solid red";
          return ;
        }
      } else {
        create_category.style.border = "none";
      }
      if (!create_color.value) return ;
    }
    if (create_images.length >= 10) {
      img_warning.classList.remove('hide');
      img_warning.classList.add('show');
      return ;
    } else {
      img_warning.classList.remove('show');
      img_warning.classList.add('hide');
    }

      let formData = new FormData();
      for (const file of cur_files) formData.append("files", file, file.name);
 
      if (create_for_sale.checked) {
        formData.append('create_price', create_price.value);
      }

      formData.append('create_switches', create_switches.value)
      formData.append('create_keycaps', create_keycaps.value)
      formData.append('create_name', create_name.value)
      formData.append('create_brand', create_brand.value)
      formData.append('create_for_sale', create_for_sale.checked)
      formData.append('create_color', create_color.value)
      formData.append('create_category', create_category.value)
      formData.append('create_m_style', create_m_style.value)
      formData.append('create_layout', create_layout.value)
      formData.append('create_description', create_description.value)

      formData.append('create_switches_lubed', create_switches_lubed.checked);
      formData.append('create_switch_amount', create_switch_amount.value)
      formData.append('create_switch_type', create_switch_type.value)
      formData.append('create_cap_material', create_cap_material.value)

    // FETCH AND RERENDER
    submit_btn.disabled = true;

    try {
      toggleLoader();
      const res = await fetch('/post', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
        headers: { "X-CSRFToken": getCookie("csrftoken"),
                  "X-Requested-With": "XMLHttpRequest" }
      });

      let data = null;
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        data = await res.json();
      }

      toggleLoader();
      if (!res.ok) {
        if (data && data.errors) {
          renderServerErrors(data.errors);
        } else {
          clearServerErrors();
          showErrorBanner('Something went wrong. Please try again.');
        }
        return;
      }

      clearServerErrors();

      const is_market = document.querySelector('meta[name="is_market"]')?.content;
      const user_name = document.querySelector('meta[name="user_name"]')?.content;
      const profile_name = document.querySelector('meta[name="profile_name"]')?.content;
      const is_own = user_name == profile_name ? true : false;

      const html = data?.html || '';
      if (html && !typeof searchMode === 'function' && searchMode() && (!is_market && (!profile_name || profile_name && is_own))) {
        // add new post to DOM

        let all_posts = document.querySelectorAll('.post_wrapper');
        all_posts.forEach((el) => el.style.opacity = '0');

        await setTimeout(() => {

          let last_one = document.querySelector('.first_one');
          if (last_one) last_one.classList.remove('first_one');
          else {
            last_one = document.querySelector('.only_one');
            last_one?.classList.remove('only_one');
          }

          document.querySelector('#keyboard_div').insertAdjacentHTML('afterbegin', html);
          viewport();

          let scroller = document.querySelector('.scroller');
          if (scroller)
            scroller.remove();
          scroller = ensureScroller({
            container: keyboard_div,
            onAfterInsert: (root) => rebindPosts(root, scroller),
          });
          rebindPosts(document, scroller);

          setTimeout(() => {
            all_posts.forEach((el) => el.style.opacity = '1');
          }, 400);


        }, 400);

        if (!profile_name && typeof searchMode === 'function' && searchMode()) {
          if (typeof query_DB_posts === 'function') {
            await query_DB_posts();
          }
        }


      }
      setTimeout(() => {
        add_post_btn.click();
        clear_input();
      }, 20)
    } catch (err) {
      console.error(err);
      renderServerErrors(['Network error. Please try again.']);
    } finally {
      submit_btn.disabled = false; // re-enable button
    }
  }
}

let query_DB_posts = null;
let searchMode = null;

  // DOM LOADING

async function init_search_mode(profile_name) {
  if (!profile_name) {
    const mod = await import('./search_home.js');
    if (mod.initSearch) mod.initSearch();
    query_DB_posts = mod.query_DB_posts;
    searchMode = mod.searchMode;
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const add_post_btn = document.querySelector('.add_post_btn');
  const add_post_dev_info = document.getElementById('add_post_dev_info');
  const add_post_btn_img = document.getElementById('add_post_btn_img');

  const add_post_info = document.getElementById('add_post_info');
  const info_wrapper = document.getElementById('info_wrapper');
  const add_post_img = document.getElementById('add_post_img');
  const img_wrapper = document.getElementById('img_wrapper');
  const add_post_descr = document.getElementById('add_post_descr');

  let mandatories = document.querySelectorAll('.mandatory');
  let mandatory_arr = Array.from(mandatories);


  // META / INFO
  // if profile_name == null -> !is_profile_page
  const is_market = document.querySelector('meta[name="is_market"]')?.content;
  const user_name = document.querySelector('meta[name="user_name"]')?.content;
  const profile_name = document.querySelector('meta[name="profile_name"]')?.content;

  init_search_mode(profile_name);

  mandatory_arr.forEach(i => {
    i.onchange = function () {
      if (i.value) {
        i.style.border = 'none';
      }
      else if (!i.value){
        i.style.border = '.5px solid red';
      }
    }
  });

  // --- FEED via single realtime hub ---
  ;(async function setupFeedRealtime() {

    const bus = await window.AppRealtimeReady;
    if (!bus) return;

    // Join the server-side group that broadcasts new posts
    bus.subscribe('feed');

    const off = bus.on('new_post', 'feed', async (e) => {
      // e: { type:'new_post', post_id }
      const is_market = document.querySelector('meta[name="is_market"]')?.content;
      if (is_market) return;

      try {
        const postId = String(e.post_id);
        if (document.getElementById(postId)) return; // already present

        const res = await fetch(`/post/${postId}/partial`, {
          credentials: 'same-origin',
          headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        if (!res.ok) return;

        const { html } = await res.json();
        if (!html) return;

        const container = document.getElementById('keyboard_div');

        let lastOne = document.querySelector('.first_one') || document.querySelector('.only_one');
        lastOne?.classList.remove('first_one', 'only_one');

        container.insertAdjacentHTML('afterbegin', html);

        // rebind newly inserted post(s)
        const scroller = ensureScroller({
          container,
          onAfterInsert: (root) => rebindPosts(root, scroller),
        });
        viewport();
        rebindPosts(document, scroller);
      } catch (err) {
        console.error('feed/realtime error', err);
      }
    });

    // tidy up (optional)
    window.addEventListener('beforeunload', () => {
      try { off(); } catch {}
      try { bus.unsubscribe('feed'); } catch {}
    });
  })();


  if (!add_post_btn) return;
  add_post_btn.addEventListener('click', add_post_field);
});
