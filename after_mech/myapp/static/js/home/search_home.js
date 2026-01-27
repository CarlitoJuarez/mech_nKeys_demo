import { rebindPosts } from './post.js';
import { ensureScroller } from './scroller.js';
import { viewport } from './viewport.js';
import { handleEsc, handleEsc_add, deleteEsc } from '../esc_module.js';
import { show_smth, hide_smth } from '../show_hide.js';

export let query_DB_posts;
export let searchMode;

document.addEventListener('DOMContentLoaded', () => {
  const keyboard_div = document.getElementById('keyboard_div');
  const profile_search_div = document.getElementById('profile_search_div');

  let post_scroller;
  post_scroller =  ensureScroller({
    key: 'posts',
    container: keyboard_div,
    onAfterInsert: async (root) => {
      rebindPosts(root, post_scroller);
    },
    itemSelector: '.post_wrapper[id]',
    getItemId: (el) => el.id,
    basePath: window.location.pathname,
  });

  rebindPosts(document, post_scroller);

  let profile_scroller;
  profile_scroller = ensureScroller({
    key: 'profiles',
    container: profile_search_div,
    onAfterInsert: async (root) => {
      // viewport();
    },
    itemSelector: '.search_profile_wrapper[id]',
    getItemId: (el) => el.id,
    basePath: '/profile_search',
  })


  let cur_params = null;

  searchMode = function () {
    if (cur_params)
      return true;
    if (profile_search_div.classList.contains('show'))
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
      await post_scroller.resetToFeed();
    } else {
      await post_scroller.resetToSearch(cur_params);
    }
    requestAnimationFrame(() => {
      rebindPosts(keyboard_div, post_scroller);
      show_posts();
    });
  }

  query_DB_posts = async function () {
    if (document.chat_mode)
      return;
    const product_query = product_input.value.trim();
    const brand_query   = brand_input.value.trim();
    const category_query = category_select.value || "";
    const layout_query   = layout_select.value || "";
    const for_sale_query = document.getElementById('for_sale_label').classList.contains('active') ? "1" : "";

    if (!product_query && !brand_query) {
      cur_params = null;
      return replace_results();
    }

    cur_params = new URLSearchParams({
      q: product_query,
      brand_query,
      category_query,
      layout_query,
      for_sale_query,
    });

    debounce(replace_results);
  }

  async function show_profiles() {
    keyboard_div.style.opacity = '0';
    await setTimeout(() => {
      keyboard_div.style.display = 'none';
      show_smth(profile_search_div);
      post_scroller.pause();
      profile_scroller.resume();
    }, 200);
  }

  async function show_posts() {
    hide_smth(profile_search_div, 200);
    keyboard_div.style.display = 'grid';
    keyboard_div.style.opacity = '1';
    profile_scroller.pause();
    post_scroller.resume();
  }

  async function query_DB_profiles() {
    const q = (profile_input.value || '').trim();

    if (!q) {
      // no profile query -> go back to posts list
      show_posts();
      return post_scroller.resetToFeed();
    }

    show_profiles();
    const params = new URLSearchParams({ q });
    return profile_scroller.resetToSearch(params);
  }


  // assuming you render all profile cards inside #profile_search_div

  if (profile_search_div) {
    profile_search_div.addEventListener('click', (e) => {
      const btn = e.target.closest('.profile_btn');
      if (!btn || !profile_search_div.contains(btn)) return;

      // make sure it's not a submit button
      btn.type = 'button';

      btn.style.opacity = '0';
      setTimeout(() => {
        window.location.href = `/profile/${btn.value}`;
      }, 200);
    });
  }



  // wire your inputs to query_DB() as you had before...

  const loading = document.getElementById('loading');

  let search_div = document.getElementById('search_div');
  let search_input = document.getElementById('search_input');
  let search_info = document.getElementById('search_info');
  let search_labels = document.querySelectorAll('.search_label');
  let product_div = document.getElementById('product_div');
  let brand_div = document.getElementById('brand_div');
  let for_sale_label = document.getElementById('for_sale_label');
  let for_sale_div = document.getElementById('for_sale_div');
  let category_div = document.getElementById('category_div');
  let category_select = document.getElementById('search_category');
  let category_label = document.getElementById('category_label');
  let layout_select = document.getElementById('search_layout');
  let filters = document.querySelectorAll('.filter');
  let profile_div = document.getElementById('profile_div_sidebar');
  let profile_input = document.getElementById('search_profile');

  let product_input = document.getElementById('search_product');
  let brand_input = document.getElementById('search_brand');

  if (profile_search_div) profile_search_div.style.display = 'none';




  // HOVER EFFECT
  // search_labels.forEach(elem => {
  //   elem.onmouseover = function() {
  //     elem.style.background = 'rgba(40, 40, 40, .8)';
  //   };
  //   elem.onmouseout = function() {
  //     if (elem.firstElementChild.classList.contains('hide')) {
  //       elem.style.background = 'rgba(140, 140, 140, .4)';
  //     }
  //   };
  // })
  //


  const close_search_div = function () {
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

  profile_div.addEventListener('mouseout', function() {
    if (profile_input.value === "") {
      profile_div.style.background = 'rgba(140, 140, 140, .4)';
    }
  });

  let reset_input = function() {
    // RESET ALL INPUT / VALUE
    product_input.value = "";
    brand_input.value = "";
    category_select.value = "None";
    profile_input.value = "";
    // RESET LABELS
    product_div.style.background = 'rgba(140, 140, 140, .4)';
    brand_div.style.background = 'rgba(140, 140, 140, .4)';
    category_select.classList.remove('show');
    category_select.classList.add('hide');
    category_div.style.background = 'rgba(140, 140, 140, .4)';
    for_sale_div.style.background = 'rgba(140, 140, 140, .4)';
    profile_div.style.background = 'rgba(140, 140, 140, .4)';
    // HIDE LABELS + INPUTS
    product_input.classList.remove('show');
    product_input.classList.add('hide');
    brand_input.classList.remove('show');
    brand_input.classList.add('hide');
    category_select.classList.remove('show');
    category_select.classList.add('hide');
    profile_input.classList.remove('show');
    profile_input.classList.add('hide');
    filters.forEach(elem => {
      elem.classList.remove('show');
      elem.style.opacity = '0';
      setTimeout(() => elem.classList.add('hide'), 400);
    })
    close_search_div();
  }


  // CLICK EFFECT
  product_div.addEventListener('click', function(event) {
    if (event.target === product_input)
      return
    if (document.chat_mode)
      return ;
    if (product_input.classList.contains('hide') || search_div.classList.contains('closed')) {
      product_input.classList.remove('hide');
      product_input.classList.add('show');
      product_input.focus();
      open_search_div();
      product_div.style.background = 'rgba(40, 40, 40, .8)';
      setTimeout(() => product_input.style.opacity = '1', 200);
    // } else if (search_div.classList.contains('open')) {
    } else {
      product_input.classList.remove('show');
      product_input.style.opacity = '0';
      product_div.style.background = 'rgba(140, 140, 140, .4)';
      product_input.classList.add('hide');
      // searchMode = false;
      // if (document.chat_mode)
      //   return ;
      if (brand_div.firstElementChild.classList.contains('hide') || brand_input.value === "") {
        if (brand_div.firstElementChild.classList.contains('hide')) {
          category_select.value = 'None';
          for_sale_div.style.background = 'rgba(140, 140, 140, .4)';
          category_div.style.background = 'rgba(140, 140, 140, .4)';
          category_select.classList.remove('show');
          category_select.classList.add('hide');
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
          query_DB_posts();
      }
      product_input.value = "";
    }
  });

  brand_div.addEventListener('click', function(event) {
    if (event.target === brand_input)
      return ;
    if (document.chat_mode)
      return ;
    if (brand_input.classList.contains('hide') || search_div.classList.contains('closed')) {
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
      if (product_div.firstElementChild.classList.contains('hide') || product_input.value === "") {
        if (product_div.firstElementChild.classList.contains('hide')) {
          close_search_div();
          category_select.value = 'None';
          for_sale_div.style.background = 'rgba(140, 140, 140, .4)';
          category_div.style.background = 'rgba(140, 140, 140, .4)';
          category_select.classList.remove('show');
          category_select.classList.add('hide');
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
          query_DB_posts();
      }
      brand_input.value = "";
    }
  });

  category_label.addEventListener('click', function() {
    if (document.chat_mode)
      return ;
    if (category_select.classList.contains('show')) {
      category_select.classList.remove('show');
      category_select.classList.add('hide');
      if (category_select.value !== 'None') {
        category_select.value = 'None';
        query_DB_posts();
      }
    } else {
      category_select.classList.remove('hide');
      category_select.classList.add('show');
    };
  });

  category_select.addEventListener('input', function() {
    if (document.chat_mode)
      return ;
    if (category_select.value === "None")
    {
      category_select.classList.remove('show');
      category_select.classList.add('hide');
      category_div.style.background = 'rgba(140, 140, 140, .4)';
    }
    else
      category_div.style.background = 'rgba(40, 40, 40, .8)';
    query_DB_posts();
  })

  for_sale_div.addEventListener('click', function() {
    if (document.chat_mode)
      return ;
    if (for_sale_label.classList.contains('active')) {
      for_sale_label.classList.remove('active');
      for_sale_div.style.background = 'rgba(140, 140, 140, .4)';
      for_sale_label.classList.add('inactive');
    } else {
      for_sale_label.classList.remove('inactive');
      for_sale_div.style.background = 'rgba(40, 40, 40, .8)';
      for_sale_label.classList.add('active');
    }
    query_DB_posts();
  });


  // HANDLE ENTER
  product_input.addEventListener('keydown', (e) => {
    if (document.chat_mode)
      return ;
    if (e.key === "Enter") {
      const ev = new Event("input", { bubbles: true });
      ev.fromEnter = true;
      product_input.dispatchEvent(ev);
    }
  })

  product_input.addEventListener('input', function(event) {

    if (document.chat_mode)
      return ;
    profile_input.classList.remove('show');
    profile_div.style.background = 'rgba(140, 140, 140, .4)';
    profile_input.classList.add('hide');
    profile_input.value = "";

    if (product_input.value === "") {
      product_div.style.background = "rgba(140, 140, 140, .4)";
      if (searchMode())
        query_DB_posts();
    } else {
      product_div.style.background = "rgba(40, 40, 40, .8)";
    }
    if (event.fromEnter)
      query_DB_posts();
    if (product_input.value !== "" || brand_input.value !== "") {
      if (category_div.classList.contains('hide')) {
        category_div.style.opacity = '0';
        category_div.classList.remove('hide');
        category_div.classList.add('show');
        setTimeout(() => category_div.style.opacity = '1', 40);
      }
      if (for_sale_div.classList.contains('hide')) {
        for_sale_div.style.opacity = '0';
        for_sale_div.classList.remove('hide');
        for_sale_div.classList.add('show');
        setTimeout(() => for_sale_div.style.opacity = '1', 40);
      }
    } else {
      if (category_div.classList.contains('show')) {
        category_div.style.opacity = '0';
        category_div.classList.remove('show');
        setTimeout(() => category_div.classList.add('hide'), 400);
      }
      if (for_sale_div.classList.contains('show')) {
        for_sale_div.style.opacity = '0';
        for_sale_div.classList.remove('show');
        setTimeout(() => for_sale_div.classList.add('hide'), 400);
      }
    }
  });

  // HANDLE ENTER
  brand_input.addEventListener('keydown', (e) => {
    if (document.chat_mode)
      return ;
    if (e.key === "Enter") {
      const ev = new Event("input", { bubbles: true });
      ev.fromEnter = true;
      brand_input.dispatchEvent(ev);
    }
  })

  brand_input.addEventListener('input', function(event) {
    if (document.chat_mode)
      return ;

    profile_input.classList.remove('show');
    profile_div.style.background = 'rgba(140, 140, 140, .4)';
    profile_input.classList.add('hide');
    profile_input.value = "";

    if (brand_input.value === "") {
      brand_div.style.background = "rgba(140, 140, 140, .4)";
      if (searchMode())
        query_DB_posts();
    } else {
      brand_div.style.background = "rgba(40, 40, 40, .8)";
    }
    if (event.fromEnter)
      query_DB_posts();
    if (product_input.value !== "" || brand_input.value !== "") {
      if (category_div.classList.contains('hide')) {
        category_div.style.opacity = '0';
        category_div.classList.remove('hide');
        category_div.classList.add('show');
        setTimeout(() => category_div.style.opacity = '1', 40);
      }
      if (for_sale_div.classList.contains('hide')) {
        for_sale_div.style.opacity = '0';
        for_sale_div.classList.remove('hide');
        for_sale_div.classList.add('show');
        setTimeout(() => for_sale_div.style.opacity = '1', 40);
      }
    } else {
      if (category_div.classList.contains('show')) {
        category_div.style.opacity = '0';
        category_div.classList.remove('show');
        setTimeout(() => category_div.classList.add('hide'), 400);
      }
      if (for_sale_div.classList.contains('show')) {
        for_sale_div.style.opacity = '0';
        for_sale_div.classList.remove('show');
        setTimeout(() => for_sale_div.classList.add('hide'), 400);
      }
    }
  });


  profile_div.addEventListener('click', function() {
    if (event.target === profile_input)
      return ;
    if (document.chat_mode)
      return;
    if (profile_input.classList.contains('show')) {
      profile_input.classList.remove('show');
      profile_div.style.background = 'rgba(140, 140, 140, .4)';
      profile_input.classList.add('hide');

      // if (document.chat_mode)
      //   return;
      category_select.value = "None";
      category_select.classList.remove('show');
      category_select.classList.add('hide');
      category_div.style.background = 'rgba(140, 140, 140, .4)';

      for_sale_div.style.background = 'rgba(140, 140, 140, .4)';
      for_sale_label.classList.remove('active');
      for_sale_label.classList.add('inactive');

      if (category_div.classList.contains('show')) {
        category_div.style.opacity = '0';
        category_div.classList.remove('show');
        setTimeout(() => category_div.classList.add('hide'), 400);
      }
      if (for_sale_div.classList.contains('show')) {
        for_sale_div.style.opacity = '0';
        for_sale_div.classList.remove('show');
        setTimeout(() => for_sale_div.classList.add('hide'), 400);
      }

      brand_input.classList.remove('show');
      brand_input.style.opacity = '0';
      brand_div.style.background = 'rgba(140, 140, 140, .4)';
      brand_input.classList.add('hide');
      brand_input.value = "";

      product_input.classList.remove('show');
      product_input.style.opacity = '0';
      product_div.style.background = 'rgba(140, 140, 140, .4)';
      product_input.classList.add('hide');
      product_input.value = "";

      if (profile_input.value) {
        profile_input.value = "";
        profile_div.style.background = 'rgba(140, 140, 140, .4)';
        post_scroller.resetToFeed();
        setTimeout(() => show_posts(), 400);
      }
      profile_input.value = "";

      close_search_div();
      deleteEsc();

    } else {
      profile_input.classList.remove('hide');
      profile_div.style.background = 'rgba(40, 40, 40, .8)';
      profile_input.classList.add('show');
      profile_input.focus();
      open_search_div();
    }
  });

  profile_input.addEventListener('keydown', (e) => {
    if (e.key === "Enter") {
      const ev = new Event("input", { bubbles: true });
      ev.fromEnter = true;
      profile_input.dispatchEvent(ev);
    }
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === "Escape") {
      let exit_btn = document.getElementById('exit_btn');
      if (exit_btn.classList.contains('hide') && search_div.classList.contains('open')) {
        if (profile_input.classList.contains('show')) {
          profile_input.value = '';
          profile_div.style.background = 'rgba(140, 140, 140, .4)';
        }
        reset_input();
        if (searchMode()) {
          post_scroller.resetToFeed();
          setTimeout(() => show_posts(), 400);
        }
      }
    }
  })

  profile_input.addEventListener('input', async function() {
    if (document.chat_mode)
      return;
    category_select.value = "None";
    category_select.classList.remove('show');
    category_select.classList.add('hide');
    category_div.style.background = 'rgba(140, 140, 140, .4)';

    for_sale_div.style.background = 'rgba(140, 140, 140, .4)';
    for_sale_label.classList.remove('active');
    for_sale_label.classList.add('inactive');

    if (category_div.classList.contains('show')) {
      category_div.style.opacity = '0';
      category_div.classList.remove('show');
      setTimeout(() => category_div.classList.add('hide'), 400);
    }
    if (for_sale_div.classList.contains('show')) {
      for_sale_div.style.opacity = '0';
      for_sale_div.classList.remove('show');
      setTimeout(() => for_sale_div.classList.add('hide'), 400);
    }

    brand_input.classList.remove('show');
    brand_input.style.opacity = '0';
    brand_div.style.background = 'rgba(140, 140, 140, .4)';
    brand_input.classList.add('hide');
    brand_input.value = "";

    product_input.classList.remove('show');
    product_input.style.opacity = '0';
    product_div.style.background = 'rgba(140, 140, 140, .4)';
    product_input.classList.add('hide');
    product_input.value = "";

    if (!profile_input.value) {
      profile_div.style.background = 'rgba(140, 140, 140, .4)';
      post_scroller.resetToFeed();
      setTimeout(() => show_posts(), 400);
      return;
    } else
      profile_div.style.background = 'rgba(40, 40, 40, .8)';

    if (event.fromEnter) {
      profile_div.style.background = 'rgba(40, 40, 40, .8)';
      await query_DB_profiles();
      let profile_btns = document.querySelectorAll('.post_btn');
      profile_btns.forEach(elem => {
        elem.addEventListener('click', function () {
          this.style.opacity = '0';
          setTimeout(() => { window.location.href = `/profile/${this.value}`; }, 200);
        });
      });
    }
  })
});
