import { rebindPosts } from './post.js';
import { ensureScroller } from './scroller.js';
import { handleEsc } from '../esc_module.js';
import { deleteEsc } from '../esc_module.js';

document.addEventListener('DOMContentLoaded', () => {
  const keyboard_div = document.getElementById('keyboard_div');

  let scroller;
  scroller = ensureScroller({
    container: keyboard_div,
    onAfterInsert: async (root) => {
      rebindPosts(root, scroller);
    },
  });

  rebindPosts(document, scroller);


  let cur_params = null;

  let searchMode = function () {
    if (cur_params)
      return true;
    return false;
  }

  function debounceFactory(wait = 250) {
    let t;
    return (fn) => {
      clearTimeout(t);
      t = setTimeout(fn, wait);
    };
  }

  const debounce = debounceFactory(250);

  async function replace_results() {
    if (!cur_params) {
      await scroller.resetToFeed();
    } else {
      await scroller.resetToSearch(cur_params);
    }
    requestAnimationFrame(() => {
      rebindPosts(keyboard_div, scroller);
      keyboard_div.style.display = 'grid';
      keyboard_div.style.opacity = '1';
    });
  }

  async function query_DB() {
    const product_query = product_input.value.trim();
    const brand_query   = brand_input.value.trim();
    const category_query = category_select.value || "";
    const layout_query = layout_select.value || "";
    const s_type_query = s_type_select.value || "";
    const cap_material_query = cap_material_select.value || "";
    // ALWAYS FOR SALE ON
    const for_sale_query = "1";

    if (!product_query && !brand_query && category_query == "None") {
      cur_params = null;
      return replace_results();
    }


    cur_params = new URLSearchParams({
      q: product_query,
      brand_query,
      category_query,
      layout_query,
      s_type_query,
      cap_material_query,
      for_sale_query,
    });

    debounce(replace_results);

  }


  const loading = document.getElementById('loading');

  let search_div = document.getElementById('search_div');
  let search_input = document.getElementById('search_input');
  let search_info = document.getElementById('search_info');
  let search_labels = document.querySelectorAll('.search_label');

  let product_div = document.getElementById('product_div');
  let brand_div = document.getElementById('brand_div');


  let category_div = document.getElementById('category_div');
  let category_label = document.getElementById('category_label');
  let category_select = document.getElementById('search_category');

  let layout_div = document.getElementById('layout_div');
  let layout_select = document.getElementById('search_layout');

  let cap_material_div = document.getElementById('cap_material_div');
  let cap_material_select = document.getElementById('search_cap_material');

  let s_type_div = document.getElementById('s_type_div');
  let s_type_select = document.getElementById('search_s_type');

  let filters = document.querySelectorAll('.filter');

  let product_input = document.getElementById('search_product');
  let brand_input = document.getElementById('search_brand');


  const close_search_div = function() {
    search_div.style.left = '-4rem';
    search_div.classList.remove('open');
    search_div.classList.add('closed');
  }

  const open_search_div = function () {
    search_div.style.left = '0';
    search_div.classList.remove('closed');
    search_div.classList.add('open');
  }

  if (search_div) {
    search_div.addEventListener('click', (e) => {
      if (e.target.parentElement === search_div) {
        if (search_div.classList.contains('open')) {
          close_search_div();
        } else {
          open_search_div();
        }
      }
    });
  }

  let quit_search = function() {
    if (search_div.style.left === '0px') {
      // RESET ALL INPUT / VALUE
      product_input.value = "";
      brand_input.value = "";
      category_select.value = "None";
      layout_select.value = "None";
      s_type_select.value = "None";
      cap_material_select.value = "None";
      // RESET LABELS
      product_div.style.background = 'rgba(140, 140, 140, .4)';
      brand_div.style.background = 'rgba(140, 140, 140, .4)';
      category_div.style.background = 'rgba(140, 140, 140, .4)';
      layout_div.style.background = 'rgba(140, 140, 140, .4)';
      s_type_div.style.background = 'rgba(140, 140, 140, .4)';
      cap_material_div.style.background = 'rgba(140, 140, 140, .4)';
      layout_div.classList.remove('show');
      layout_div.classList.add('hide');
      s_type_div.classList.remove('show');
      s_type_div.classList.add('hide');
      cap_material_div.classList.remove('show');
      cap_material_div.classList.add('hide');
      // HIDE LABELS + INPUTS
      product_input.classList.remove('show');
      product_input.classList.add('hide');
      brand_input.classList.remove('show');
      brand_input.classList.add('hide');
      category_select.classList.remove('show');
      category_select.classList.add('hide');
      layout_select.classList.remove('show');
      layout_select.classList.add('hide');
      s_type_select.classList.remove('show');
      s_type_select.classList.add('hide');
      cap_material_select.classList.remove('show');
      cap_material_select.classList.add('hide');

      if (searchMode())
        query_DB();
      close_search_div();
    }
  }


  // HOVER EFFECT
  search_labels.forEach(elem => {
    elem.onmouseover = function() {
      elem.style.background = 'rgba(40, 40, 40, .8)';
    };
    elem.onmouseout = function() {
      if (elem.firstElementChild.classList.contains('hide')) {
        elem.style.background = 'rgba(140, 140, 140, .4)';
      }
    };
  })

  product_div.addEventListener('mouseout', function() {
    if (product_input.value === "") {
      product_div.style.background = 'rgba(140, 140, 140, .4)';
    }
  });

  brand_div.addEventListener('mouseout', function() {
    if (brand_input.value === "") {
      brand_div.style.background = 'rgba(140, 140, 140, .4)';
    }
  });

  category_div.addEventListener('mouseout', function() {
    if (category_select.value === "None" || !category_select.value) {
      category_div.style.background = 'rgba(140, 140, 140, .4)';
    }
  });

  layout_div.addEventListener('mouseout', function() {
    if (layout_select.value === "None" || !layout_select.value) {
      layout_div.style.background = 'rgba(140, 140, 140, .4)';
    }
  });

  cap_material_div.addEventListener('mouseout', function() {
    if (cap_material_select.value === "None" || !cap_material_select.value) {
      cap_material_div.style.background = 'rgba(140, 140, 140, .4)';
    }
  });

  // CLICK EFFECT
  product_div.addEventListener('click', function(event) {
    if (event.target !== product_input) {
      if (product_input.classList.contains('hide') || search_div.classList.contains('closed')) {
        handleEsc(quit_search);
        product_input.classList.remove('hide');
        product_input.classList.add('show');
        product_input.focus();
        open_search_div();
        product_div.style.background = 'rgba(40, 40, 40, .8)';
        setTimeout(() => product_input.style.opacity = '1', 200);
      } else {
        product_input.classList.remove('show');
        product_input.style.opacity = '0';
        product_div.style.background = 'rgba(140, 140, 140, .4)';
        product_input.classList.add('hide');
        if (category_div.firstElementChild.classList.contains('hide') || brand_div.firstElementChild.classList.contains('hide') || brand_input.value === "" || category_select.value === "") {
          if (brand_div.firstElementChild.classList.contains('hide') && category_div.firstElementChild.classList.contains('hide')) {
            search_div.style.left = '-4rem';
            category_select.value = 'None';
            category_div.style.background = 'rgba(140, 140, 140, .4)';
            deleteEsc();
            close_search_div();
          }
          filters.forEach(elem => {
            elem.classList.remove('show');
            elem.style.opacity = '0';
            setTimeout(() => elem.classList.add('hide'), 400);
          })
        }
        if (product_input.value) {
          product_input.value = "";
          if (searchMode())
            query_DB();
        }
        product_input.value = "";
      }
    }
  });


  brand_div.addEventListener('click', function(event) {
    if (event.target !== brand_input) {
      if (brand_input.classList.contains('hide') || search_div.classList.contains('closed')) {
        handleEsc(quit_search);
        open_search_div();
        brand_input.classList.remove('hide');
        brand_input.classList.add('show');
        brand_input.focus();
        brand_div.style.background = 'rgba(40, 40, 40, .8)';
        setTimeout(() => brand_input.style.opacity = '1', 200);
      } else {
        brand_input.classList.remove('show');
        brand_input.style.opacity = '0';
        brand_div.style.background = 'rgba(140, 140, 140, .4)';
        brand_input.classList.add('hide');
        if (category_div.firstElementChild.classList.contains('hide') || product_div.firstElementChild.classList.contains('hide') || product_input.value === "" || category_select.value === "") {
          if (product_div.firstElementChild.classList.contains('hide') && category_div.firstElementChild.classList.contains('hide')) {
            close_search_div();
            category_select.value = 'None';
            category_div.style.background = 'rgba(140, 140, 140, .4)';
            deleteEsc();
          }
          filters.forEach(elem => {
            elem.classList.remove('show');
            elem.style.opacity = '0';
            setTimeout(() => elem.classList.add('hide'), 400);
          })
        }
        if (brand_input.value) {
          brand_input.value = "";
          if (searchMode())
            query_DB();
        }
        brand_input.value = "";
      }
    }
  });

  category_div.addEventListener('click', function(event) {
    let category_img = category_label.firstElementChild;
    if (event.target !== category_label && event.target !== category_img)
      return ;
    if (category_select.classList.contains('hide') || search_div.classList.contains('closed')) {
      handleEsc(quit_search);
      category_select.classList.remove('hide');
      category_select.classList.add('show');
      category_select.focus();
      open_search_div();
      category_div.style.background = 'rgba(40, 40, 40, .8)';
      setTimeout(() => category_select.style.opacity = '1', 200);
    } else {
      category_select.classList.remove('show');
      category_select.style.opacity = '0';
      category_div.style.background = 'rgba(140, 140, 140, .4)';
      category_select.classList.add('hide');
      category_select.value = "";
      if (layout_select.value === "None") {
        layout_select.value = "None";
        layout_select.classList.remove('show');
        layout_select.classList.add('hide');
        layout_div.style.background = "rgba(140, 140, 140, .4)";
      }
      if (brand_div.firstElementChild.classList.contains('hide') || product_div.firstElementChild.classList.contains('hide') || product_input.value === "" || brand_input.value === "") {
        if (product_div.firstElementChild.classList.contains('hide') && brand_div.firstElementChild.classList.contains('hide')) {
          brand_input.value = '';
          brand_div.style.background = 'rgba(140, 140, 140, .4)';
          deleteEsc();
          close_search_div();
        }
        filters.forEach(elem => {
          elem.classList.remove('show');
          elem.style.opacity = '0';
          setTimeout(() => elem.classList.add('hide'), 400);
        })
      }
      query_DB();
    }
  });

  layout_div.addEventListener('click', function() {
    if (search_div.classList.contains('closed')) {
      open_search_div();
      return;
    }
    if (layout_select.classList.contains('show')) {
      layout_select.value = "None";
      layout_select.classList.remove('show');
      layout_select.style.opacity = '0';
      layout_div.style.background = 'rgba(140, 140, 140, .4)';
      setTimeout(() => layout_select.classList.add('hide'), 400);
      query_DB();
    } else {
      layout_select.classList.remove('hide');
      layout_select.classList.add('show');
      layout_select.style.opacity = '1';
    }
  });

  layout_select.addEventListener('click', function(event) {
    event.stopPropagation();
  });

  layout_select.addEventListener('input', function(event) {
    if (layout_select.value === "None") {
      layout_div.style.background = 'rgba(140, 140, 140, .4)';
      layout_select.style.opacity = '0';
      setTimeout(() => {
        layout_select.classList.remove('show');
        layout_select.classList.add('hide');
      });
    };
    query_DB();
  });


  cap_material_div.addEventListener('click', function() {
    if (search_div.classList.contains('closed')) {
      open_search_div();
      return;
    }
    if (cap_material_select.classList.contains('show')) {
      cap_material_select.value = "None";
      cap_material_select.classList.remove('show');
      cap_material_select.style.opacity = '0';
      cap_material_div.style.background = 'rgba(140, 140, 140, .4)';
      setTimeout(() => cap_material_select.classList.add('hide'), 400);
      query_DB();
    } else {
      cap_material_select.classList.remove('hide');
      cap_material_select.classList.add('show');
      cap_material_select.style.opacity = '1';
    }
  });

  cap_material_select.addEventListener('click', function(event) {
    event.stopPropagation();
  });

  cap_material_select.addEventListener('input', function(event) {
    if (cap_material_select.value === "None") {
      cap_material_div.style.background = 'rgba(140, 140, 140, .4)';
      cap_material_select.style.opacity = '0';
      setTimeout(() => {
        cap_material_select.classList.remove('show');
        cap_material_select.classList.add('hide');
      });
    };
    query_DB();
  });

  s_type_div.addEventListener('click', function() {
    if (search_div.classList.contains('closed')) {
      open_search_div();
      return;
    }
    if (s_type_select.classList.contains('show')) {
      s_type_select.value = "None";
      s_type_select.classList.remove('show');
      s_type_select.style.opacity = '0';
      s_type_div.style.background = 'rgba(140, 140, 140, .4)';
      setTimeout(() => s_type_select.classList.add('hide'), 400);
      query_DB();
    } else {
      s_type_select.classList.remove('hide');
      s_type_select.classList.add('show');
      s_type_select.style.opacity = '1';
    }
  });

  s_type_select.addEventListener('click', function(event) {
    event.stopPropagation();
  });

  s_type_select.addEventListener('input', function(event) {
    if (s_type_select.value === "None") {
      s_type_div.style.background = 'rgba(140, 140, 140, .4)';
      s_type_select.style.opacity = '0';
      setTimeout(() => {
        s_type_select.classList.remove('show');
        s_type_select.classList.add('hide');
      });
    };
    query_DB();
  });

  category_select.addEventListener('input', function(event) {
    if (category_select.value === "None") {
      category_div.style.background = "rgba(140, 140, 140, .4)";
      category_select.style.opacity = '0';
      setTimeout(() => {
        category_select.classList.remove('show');
        category_select.classList.add('hide');
      })
      if (product_div.firstElementChild.classList.contains('hide') && brand_div.firstElementChild.classList.contains('hide')) {
        search_div.style.left = '-4rem';
        brand_input.value = '';
        brand_div.style.background = 'rgba(140, 140, 140, .4)';
        deleteEsc();
      }
    } else {
      category_div.style.background = "rgba(40, 40, 40, .8)";
    }
    if (layout_div.classList.contains('hide') && category_select.value === "Keyboard") {
      layout_div.style.opacity = '0';
      layout_div.classList.remove('hide');
      layout_div.classList.add('show');
      setTimeout(() => layout_div.style.opacity = '1', 40);
    } else if (category_select.value !== "Keyboard") {
      layout_div.style.opacity = '0';
      layout_div.classList.remove('show');
      setTimeout(() => layout_div.classList.add('hide'), 400);
      layout_div.style.background = "rgba(140, 140, 140, .4)";
      layout_select.value = "None";
    }
    if (s_type_div.classList.contains('hide') && category_select.value === "Switches") {
      s_type_div.style.opacity = '0';
      s_type_div.classList.remove('hide');
      s_type_div.classList.add('show');
      setTimeout(() => s_type_div.style.opacity = '1', 40);
    } else if (category_select.value !== "Switches") {
      s_type_div.style.opacity = '0';
      s_type_div.classList.remove('show');
      setTimeout(() => s_type_div.classList.add('hide'), 400);
      s_type_div.style.background = "rgba(140, 140, 140, .4)";
      s_type_select.value = "None";
    }
    if (cap_material_div.classList.contains('hide') && category_select.value === "Keycaps") {
      cap_material_div.style.opacity = '0';
      cap_material_div.classList.remove('hide');
      cap_material_div.classList.add('show');
      setTimeout(() => cap_material_div.style.opacity = '1', 40);
    } else if (category_select.value !== "Keycaps") {
      cap_material_div.style.opacity = '0';
      cap_material_div.classList.remove('show');
      setTimeout(() => cap_material_div.classList.add('hide'), 400);
      cap_material_div.style.background = "rgba(140, 140, 140, .4)";
      cap_material_select.value = "None";
    }
    query_DB();
  });

  product_input.addEventListener('input', function(event) {
    if (product_input.value === "") {
      product_div.style.background = "rgba(140, 140, 140, .4)";
      if (searchMode())
        query_DB();
    }
    else {
      product_div.style.background = "rgba(40, 40, 40, .8)";
    }
    if (event.fromEnter)
      query_DB();
  });

  brand_input.addEventListener('input', function(event) {
    if (brand_input.value === "") {
      brand_div.style.background = "rgba(140, 140, 140, .4)";
      if (searchMode())
        query_DB();
    }
    else {
      brand_div.style.background = "rgba(40, 40, 40, .8)";
    }
    if (event.fromEnter)
      query_DB();
  });

  // HANDLE ENTER
  product_input.addEventListener('keydown', (e) => {
    if (e.key === "Enter") {
      const ev = new Event("input", { bubbles: true });
      ev.fromEnter = true;
      product_input.dispatchEvent(ev);
    }
  })

  brand_input.addEventListener('keydown', (e) => {
    if (e.key === "Enter") {
      const ev = new Event("input", { bubbles: true });
      ev.fromEnter = true;
      brand_input.dispatchEvent(ev);
    }
  })

});





