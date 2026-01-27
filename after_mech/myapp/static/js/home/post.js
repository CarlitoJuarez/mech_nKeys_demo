import { add_post_field, toggleLoader } from './add_post.js';
import { ensureScroller } from './scroller.js';
import { clearServerErrors } from '../server_errors.js';
import { showErrorBanner } from '../server_errors.js';
import { viewport } from './viewport.js';
import { handleEsc } from '../esc_module.js';
import { handleEsc_add } from '../esc_module.js';
import { deleteEsc } from '../esc_module.js';
import { click_show_smth, hide_smth, show_smth } from '../show_hide.js';
import { POST_JSON } from '../post_json.js';
import { getCookie } from '../get_cookie.js';

// ======= META =======
const user_name = document.querySelector('meta[name="user_name"]').content;
let edit_url_edit = document.querySelector('meta[name="edit_url_edit"]').content;
let edit_url_done = document.querySelector('meta[name="edit_url_done"]').content;
let delete_submit_img = document.querySelector('meta[name="delete_submit_img"]').content;
const profile_name = document.querySelector('meta[name="profile_name"]')?.content;

const is_own_profile = document.querySelector('.add_post');

let normal_mode = true;
const add_post_btn = document.querySelector('.add_post_btn');
const exit_btn = document.getElementById('exit_btn');
const keyboard_div = document.getElementById('keyboard_div');


let count_in_edit = 0;
let back_to_normal_callback = null;
let close_editor_callback = null;

// ======= HELPERS =======

function rt() {
  if (!window.AppRealtime) {
    console.warn('AppRealtime not found; load realtime.js first.');
    return null;
  }
  return window.AppRealtime;
}

function setLoading(on) {
  document.getElementById('loading').style.display = on ? 'flex' : 'none';
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }


let comment_delete_click = async function(e) {
  e.preventDefault();
  // deleteEsc();
  let comment_delete = e.currentTarget;
  let comment_elem = comment_delete.parentElement.parentElement;
  let comment_id = comment_elem.id;
  let comment_edit = comment_elem.querySelector('.comment_edit');

  comment_edit.removeEventListener('click', comment_edit_click);
  // after deleting comment
  comment_edit.addEventListener('click', comment_edit_click);
  const res = await POST_JSON(`/comment/${comment_id}/delete`);
  if (!res.ok) {
    res.errors.forEach(showErrorBanner);
    return ;
  }

  // nice collapse animation then remove from DOM
  const h = comment_elem.scrollHeight;
  comment_elem.style.boxSizing = 'border-box';
  comment_elem.style.height = h + 'px';
  comment_elem.style.transition = 'height 300ms ease, opacity 250ms ease, margin 300ms ease, padding 300ms ease';
  requestAnimationFrame(() => {
    comment_elem.style.opacity = '0';
    comment_elem.style.height = '0px';
    comment_elem.style.marginTop = '0';
    comment_elem.style.marginBottom = '0';
    comment_elem.style.paddingTop = '0';
    comment_elem.style.paddingBottom = '0';
  });
  setTimeout(() => comment_elem.remove(), 320);

};

let comment_delete_btn_click = function(e) {
  e.preventDefault();
  let comment_edit_btn = e.currentTarget;
  let comment_elem = comment_edit_btn.parentElement?.parentElement;
  let comment_edit = comment_elem.querySelector('.comment_edit');
  let comment_edit_div = comment_elem.querySelector('.comment_edit_div');
  let comment_delete_submit = comment_elem.querySelector('.comment_delete_submit');
  let close_delete_submit = function () {
    if (comment_delete_submit.classList.contains('show')) {
      comment_delete_submit.classList.remove('show');
      comment_delete_submit.style.opacity = '0';
      setTimeout(() => comment_delete_submit.classList.add('hide'), 400);
    }
    handleEsc(back_to_normal_callback);
  }

  handleEsc(close_delete_submit);
  comment_edit.removeEventListener('click', comment_edit_click);
  close_comment_edit_div(comment_edit_div);
  setTimeout(() => {
    comment_delete_submit.classList.remove('hide');
    comment_delete_submit.classList.add('show');
    comment_delete_submit.style.opacity = '1';
  }, 400);

  comment_delete_submit.removeEventListener('click', comment_delete_click);
  comment_delete_submit.addEventListener('click', comment_delete_click);
}

let comment_edit_btn_click = function(e) {
  if (count_in_edit === 0) {
    handleEsc(close_editor_callback);
  } else handleEsc_add(close_editor_callback);
  e.preventDefault();
  let comment_edit_btn = e.currentTarget;
  let comment_elem = comment_edit_btn.parentElement?.parentElement;
  let comment_edit = comment_elem.querySelector('.comment_edit');
  let comment_edit_div = comment_elem.querySelector('.comment_edit_div');
  let comment_content = comment_elem.querySelector('.comment_content')
  let comment_input = comment_elem.querySelector('.edit_comment_input');
  let comment_edit_submit = comment_elem.querySelector('.comment_edit_submit');
  let comment_delete_submit = comment_elem.querySelector('.comment_delete_submit');
  let comment_section_2 = comment_elem.parentElement;

  count_in_edit++;
  comment_edit.removeEventListener('click', comment_edit_click);
  close_comment_edit_div(comment_edit_div);
  let cur_pos = comment_section_2.scrollTop;
  comment_content.style.opacity = '0';
  comment_content.classList.remove('show');
  setTimeout(() => {
    comment_content.classList.add('hide');
    comment_input.classList.remove('hide');
    comment_input.classList.add('show');
    comment_input.style.opacity = '1';
    comment_input.focus();
    comment_input.value = "";
    comment_input.value = comment_content.innerHTML;
    comment_edit_submit.classList.remove('hide');
    comment_edit_submit.classList.add('show');
    comment_edit_submit.style.opacity = '1';
  }, 200);

  setTimeout(() => {
    comment_section_2.scrollTop = cur_pos;
  }, 210);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  function setFontFrom(comment_input) {
    const cs = getComputedStyle(comment_input);
    ctx.font = `${cs.fontStyle} ${cs.fontVariant} ${cs.fontWeight} ${cs.fontSize} / ${cs.lineHeight} ${cs.fontFamily}`;
    return cs;
  }

  // submiting edited comment
  // restore back to normal

  comment_edit_submit.onclick = async (e) => {
    e.preventDefault();

    let comment_id = e.currentTarget.parentElement.parentElement.id;
    clearServerErrors();
    // after submitting edited comment
    comment_edit.removeEventListener('click', comment_edit_click);
    comment_edit.addEventListener('click', comment_edit_click);
    if (!comment_input.value || comment_input.value === comment_content.innerHTML) return close_editor_callback();
    if (comment_input.value.length > 600) return showErrorBanner('Comment is too long (max. 600 chars).');

    const res = await POST_JSON(`/comment/${comment_id}/edit`, { content: comment_input.value });
    if (!res.ok) {
      res.errors.forEach(showErrorBanner);
      return ;
    }
    comment_content.innerHTML = comment_input.value;
    close_editor_callback();
    comment_edit_submit.disabled = false;
  };


  // --- create hidden mirror ---
  const mirror_div = document.createElement('div');
  mirror_div.style.position = 'absolute';
  mirror_div.style.top = '-99999px';
  mirror_div.style.left = '0';
  mirror_div.style.visibility = 'hidden';
  mirror_div.style.whiteSpace = 'pre-wrap';   // preserve \n, allow wrapping
  mirror_div.style.wordWrap = 'break-word';   // wrap long tokens
  document.body.appendChild(mirror_div);

  function copy_textarea_styles(src, dst) {
    const props = [
      // sizing / box model
      'boxSizing','width','paddingTop','paddingRight','paddingBottom','paddingLeft',
      'borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth',
      // text rendering
      'fontFamily','fontSize','fontWeight','fontStyle','lineHeight',
      'letterSpacing','wordSpacing','textTransform','textIndent','textDecoration',
      // others that can affect wrapping
      'tabSize'
    ];
    const cs = getComputedStyle(src);
    for (const p of props) dst.style[p] = cs[p];
  }

  function update_mirror_width() {
    // clientWidth includes padding, excludes borders ? matches wrapping width
    mirror_div.style.width = comment_input.clientWidth + 'px';
  }

  function resize_textarea_from_mirror() {
    const cs = setFontFrom(comment_input);
    const lines = comment_input.value.split('\n');

    // keep styles & width in sync
    copy_textarea_styles(comment_input, mirror_div);
    update_mirror_width();

    // mirror the content; add a trailing line to measure caret-at-EOL correctly
    // use textContent (safe), then ensure there's at least one visible char
    mirror_div.textContent = comment_input.value + '\n';

    // measure
    const needed_h = mirror_div.scrollHeight;

    // apply height (border-box so it just fits)
    comment_input.style.height = needed_h + 'px';

    // --- Width (measure longest line precisely) ---
    const paddingX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const borderX  = parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
    const maxLinePx = lines.reduce((m, line) => Math.max(m, ctx.measureText(line || ' ').width), 0);
    const w = Math.max(1, Math.ceil(maxLinePx + paddingX + borderX));
    comment_input.style.width = w + 'px';

  }

  // --- events ---
  comment_input.addEventListener('input', resize_textarea_from_mirror);
  comment_input.addEventListener('focus', resize_textarea_from_mirror);

  // react if the textarea (or its parent) width changes (affects wrapping)
  const resize_observer = new ResizeObserver(() => {
    update_mirror_width();
    resize_textarea_from_mirror();
  });
  resize_observer.observe(comment_input);
  if (comment_input.parentElement) resize_observer.observe(comment_input.parentElement);

  // initial sizing after layout
  requestAnimationFrame(resize_textarea_from_mirror);
}


let close_comment_edit_div = function (comment_edit_div) {
  comment_edit_div.classList.remove('show');
  comment_edit_div.style.opacity = '0';
  setTimeout(() => comment_edit_div.classList.add('hide'), 400);
}


let comment_edit_click = function(e) {
  e.preventDefault();
  if (count_in_edit) return ;
  let comment_edit = e.currentTarget;
  let comment_elem = comment_edit.parentElement.parentElement;
  let comment_edit_div = comment_elem.querySelector('.comment_edit_div');
  let comment_content = comment_elem.querySelector('.comment_content')
  let comment_input = comment_elem.querySelector('.edit_comment_input');
  let comment_edit_submit = comment_elem.querySelector('.comment_edit_submit');
  let comment_delete_submit = comment_elem.querySelector('.comment_delete_submit');
  let comment_section_2 = comment_elem.parentElement;

  comment_edit.removeEventListener('click', comment_edit_click);

  let close_delete_submit = function () {
    if (comment_delete_submit.classList.contains('show')) {
      comment_delete_submit.classList.remove('show');
      comment_delete_submit.style.opacity = '0';
      setTimeout(() => comment_delete_submit.classList.add('hide'), 400);
      deleteEsc();
      handleEsc(back_to_normal_callback)
    }
  }

  let close_editor = function () {
    while (count_in_edit > 0) {
      deleteEsc(); 
      count_in_edit--;
    }
    if (count_in_edit < 0) count_in_edit = 0;
    handleEsc(back_to_normal_callback);
    clearServerErrors();
    comment_input.value = comment_content.innerHTML;
    setTimeout(() => {
      comment_edit_btn = comment_elem.querySelector('.edit_comment');
      comment_edit_btn.removeEventListener('click', comment_edit_btn_click);
      comment_edit_btn.addEventListener('click', comment_edit_btn_click);
      comment_input.classList.add('hide');
      comment_input.classList.remove('show');
      comment_edit_submit.classList.add('hide');
      comment_edit_submit.classList.remove('show');
      comment_content.classList.remove('hide');
      requestAnimationFrame(() => { comment_content.style.opacity = '1'; });
    }, 210);
  }
  close_editor_callback = close_editor;


  if (comment_edit_div.classList.contains('hide')) {
    comment_edit_div.classList.remove('hide');
    comment_edit_div.classList.add('show');
    comment_edit_div.style.opacity = '1';
  } else close_comment_edit_div(comment_edit_div);
  comment_elem.addEventListener('mouseleave', () => {
    close_comment_edit_div(comment_edit_div);
    close_delete_submit();
    comment_edit.removeEventListener('click', comment_edit_click);
    comment_edit.addEventListener('click', comment_edit_click);
  })
  let comment_edit_btn = comment_elem.querySelector('.edit_comment');
  let comment_delete_btn = comment_elem.querySelector('.delete_comment');

  comment_delete_btn.addEventListener('click', comment_delete_btn_click);

  comment_edit_btn.removeEventListener('click', comment_edit_btn_click);
  comment_edit_btn.addEventListener('click', comment_edit_btn_click);
};


let top = 0;
let scrollY = 0;

//
// ======= PER-FEATURE BINDINGS =======
//
export let get_back_to_normal = function() {
    let divs = document.querySelectorAll('.post_wrapper');
    let postWrapper = document.querySelector('.chat_mode');
    let comment_section = postWrapper.nextElementSibling;
    let scroller;
    scroller = ensureScroller({
      container: keyboard_div,
      onAfterInsert: (root) => rebindPosts(root, scroller), // 2) callback uses the same binding
    });
    let elem = document.querySelector('.active_chat_btn');
    // --- VIEWPORT TABLET 
    if (window.matchMedia('(max-width: 1024px)').matches) {
      let post_info = postWrapper.querySelector('.post_info');
      post_info.style.opacity = '0';
      setTimeout(() => post_info.classList.add('hide'), 400);
    }
    // --- VIEWPORT TABLET --- END
    postWrapper.classList.remove('chat_mode');
    deleteEsc();
    if (count_in_edit) close_editor_callback();
    scroller?.resume();
    setTimeout(() => comment_section.style.opacity = '0', 200);
    setTimeout(() => comment_section.style.display = 'none', 600);

    click_show_smth(add_post_btn);
    hide_smth(exit_btn);
    setTimeout(() => {
      postWrapper.style.top = `${top}px`;
      setTimeout(() => {
        elem.style.opacity = '1'
        divs.forEach(elem => {
          if (elem.id != postWrapper.id) {
            elem.style.display = 'flex';
            elem.style.transition = 'opacity .4s ease';
            setTimeout(() => elem.style.opacity = '1', 10);
          } 
          else {
            postWrapper.style.position = 'relative';
            postWrapper.style.transition = 'top 0s ease';
            postWrapper.style.top = 'auto';
            if (postWrapper.classList.contains('first_one')) {
            postWrapper.style.marginTop = '6.5rem';
            } else if (!postWrapper.classList.contains('only_one')) {
            postWrapper.style.marginTop = '4rem';
          }
          };
          postWrapper.parentElement.scrollTo({ top: scrollY });
        })
      }, 500);
    }, 600);
    exit_btn.removeEventListener('click', get_back_to_normal);
    if (postWrapper._rt) {
      try { postWrapper._rt.close(); } catch {}
      postWrapper._rt = null;
    }
    elem.classList.remove('active_chat_btn');
    normal_mode = true;
    document.chat_mode = false;
    back_to_normal_callback = null;
  }


function chat_btn_click(event, postWrapper, scroller) {
  let divs = document.querySelectorAll('.post_wrapper');
  // const scrollY = postWrapper.parentElement.scrollTop;
  // const top = rect.top + window.scrollY;

  if (document.chat_mode) {
    get_back_to_normal();
    return ;
  }

  let comment_section = postWrapper.nextElementSibling;
  let comment_section_2 = postWrapper.nextElementSibling.querySelector('.comment_section_2');

  const parent_rect = postWrapper.offsetParent.getBoundingClientRect();
  const rect = postWrapper.getBoundingClientRect();
  scrollY = postWrapper.parentElement.scrollTop;
  top = rect.top + window.scrollY;
 
  document.chat_mode = true;
  postWrapper.classList.add('chat_mode');
  if (window.matchMedia('(max-width: 1024px)').matches) {
    let post_info = postWrapper.querySelector('.post_info');
    post_info.classList.remove('hide');
    post_info.style.opacity = '1';
  }
  scroller?.pause();
  normal_mode = false;
  let elem = event.currentTarget;
  elem.classList.add('active_chat_btn');
  divs.forEach(elem => {
    if (elem.id != postWrapper.id) {
      elem.style.opacity = '0';
      setTimeout(() => elem.style.display = 'none', 200);
    }
  });

  back_to_normal_callback = get_back_to_normal;
  exit_btn.addEventListener('click', get_back_to_normal);
  handleEsc(back_to_normal_callback);

  click_show_smth(exit_btn);
  // hide_smth(add_post_btn);
  // 1) Hide others

  // 2) Move into place
  setTimeout(() => {
    postWrapper.style.position = 'absolute';
    postWrapper.style.marginTop = '0';
    postWrapper.style.top = `${top}px`;
    postWrapper.style.transition = 'top 0.5s ease-in-out';
  }, 200);

  setTimeout(() => postWrapper.style.top = '6.5rem', 400);
  setTimeout(() => comment_section.style.display = 'flex', 400);
  setTimeout(() => elem.style.opacity = '0', 800);
  setTimeout(() => comment_section.style.opacity = '1', 800);

  comment_section_2 = postWrapper.nextElementSibling.querySelector('.comment_section_2');
  comment_section_2.scrollTop = comment_section_2.scrollHeight;

  function format_date(date) {
    const messageDate = new Date(date);
    const now = new Date();

    function is_today(d1, d2) {
      return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
      );
    }
    if (is_today(messageDate, now)) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return messageDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      });
    }
  }

  // WEBSOCKET

  if (postWrapper._rt) {
    try { postWrapper._rt.close(); } catch {}
    postWrapper._rt = null;
  }

  const bus = rt();
  if (bus) {
    const topicId = String(postWrapper.id);

    // Join the server group for this post's comments
    bus.subscribe(`post_${topicId}`);

    // Listen only to this post's comment events
    const off = bus.on('comment_created', topicId, (e) => {
      // e: { type:'new_comment', comment_id, username, content, date }
      const node = make_comment_node(
        {
          username: e.username,
          content:  e.content,
          date:     e.ts,
          comment_id: e.comment_id,
        },
        user_name
      );
      comment_section_2.prepend(node);
      viewport();
      comment_section_2.scrollTop = comment_section_2.scrollHeight;
    });

    // Keep a handle so we can clean up later
    postWrapper._rt = {
      close() {
        try { bus.unsubscribe(`post_${topicId}`); } catch {}
        try { off(); } catch {}
      }
    };
  }



  function build_profile_url(username) {
    // matches: {% url 'profile' comment.user.username %}
    return `/profile/${encodeURIComponent(username)}/`;
  }

  function same_day(a, b) {
    return a.getFullYear() === b.getFullYear() &&
          a.getMonth() === b.getMonth() &&
          a.getDate() === b.getDate();
  }
  function pad_2(n) { return n < 10 ? '0' + n : '' + n; }
  function format_time_hhmm(d) { return `${pad_2(d.getHours())}:${pad_2(d.getMinutes())}`; }
  function format_date_mon_dd_yyyy(d) {
    const mon = d.toLocaleString(undefined, { month: 'short' }); // e.g., "Sep"
    return `${mon} ${pad_2(d.getDate())}, ${d.getFullYear()}`;
  }

  /**
  * Create a comment DOM node matching your newer HTML.
  * data: { username: string, content: string, date?: string|number|Date }
  */

  function make_comment_node(data, user_name, correct_img_url = '/static/imgs/correct.png') {
    const is_own = data.username === user_name;
    const created_at = data.date ? new Date(data.date) : new Date();
    const is_today = same_day(created_at, new Date());
    const date_text = is_today ? `Today, ${format_time_hhmm(created_at)}`
                              : format_date_mon_dd_yyyy(created_at);
    const comment_id = data.comment_id;

    const wrapper = document.createElement('div');
    wrapper.className = 'comment_elem' + (is_own ? ' own_comment' : '');
    if (comment_id) wrapper.id = String(comment_id);

    // Build inner structure
    wrapper.innerHTML = `
      ${is_today
        ? `<p class="comment_date comment_date_desktop show">${date_text}</p>`
        : `<p class="comment_date comment_date_desktop show">${date_text}</p>`
      }
      <div class="comment_info">
        <p class="comment_content"></p>
        <textarea class="edit_comment_input hide" type="text" maxlength="600"></textarea>
        <a class="comment_user"></a>
        ${is_today
          ? `<p class="comment_date comment_date_tablet hide">${date_text}</p>`
          : `<p class="comment_date comment_date_tablet hide">${date_text}</p>`
        }
        ${is_own ? `
          <label class="comment_edit">...</label>
          <div class="comment_edit_div hide">
            <label class="edit_comment">Edit</label>
            <label class="delete_comment">Delete</label>
          </div>
          <button class="post_btn comment_edit_submit hide">
            <img src="${edit_url_done}">
          </button>
          <button class="post_btn comment_delete_submit hide">
            <img src="${delete_submit_img}">
          </button>
        ` : ``}
      </div>
    `;

    // Safe text assignments
    const date_el = wrapper.querySelector('.comment_date');
    const content_el = wrapper.querySelector('.comment_content');
    const textarea_el = wrapper.querySelector('.edit_comment_input');
    const user_el = wrapper.querySelector('.comment_user');
    const comment_edit = wrapper.querySelector('.comment_edit');

    date_el.textContent = date_text;
    content_el.textContent = data.content ?? '';
    textarea_el.value = data.content ?? '';
    user_el.textContent = data.username;
    user_el.href = build_profile_url(data.username);
    // after creating new comment
    comment_edit.removeEventListener('click', comment_edit_click);
    comment_edit.addEventListener('click', comment_edit_click);

    return wrapper;
  }


  // RESIZE DRAG
  let startY, startHeight;
  let resizer = comment_section.lastElementChild;
  resizer.addEventListener('mousedown', initDrag);
  let isDragging = false;

  function initDrag(e) {
    setTimeout(() => comment_section.classList.remove('max_height'), 400);
    if (isDragging) return;

    isDragging = true;
    startY = e.clientY;
    startHeight = parseInt(document.defaultView.getComputedStyle(comment_section).height, 10);
    
    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
    e.preventDefault();
  }

  function doDrag(e) {
    setTimeout(() => comment_section.classList.remove('max_height'), 400);
    const newHeight = startHeight + (startY - e.clientY);
    comment_section.style.height = Math.min(
      Math.max(newHeight, parseInt(comment_section.style.minHeight || 50)),
      parseInt(comment_section.style.maxHeight || window.innerHeight * 0.85)
    ) + 'px';
  }

  function stopDrag() {
    document.removeEventListener('mousemove', doDrag);
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('mouseleave', stopDrag);
    isDragging = false;
  }

  //TODO: MAKE THE QUEY SELECTORS WITHOUT ID USING postWrapper instead of document
  // textarea autoresize
  let textarea = postWrapper.nextElementSibling.querySelector('.comment_input');
  textarea.addEventListener('input', function() {
    clearServerErrors();
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
  });
  textarea.addEventListener('focus', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
  });

  // EDIT COMMENT

  let comment_edit_arr = comment_section.querySelectorAll('.comment_edit');

  comment_edit_arr.forEach(elem => {
    // initial for all posts
    elem.removeEventListener('click', comment_edit_click);
    elem.addEventListener('click', comment_edit_click);
  });


  // SUBMIT COMMENT
  let comment_submit = postWrapper?.nextElementSibling.querySelector('.submit_comment');

  comment_submit.onclick = async function () {
    let comment_input = textarea.value.trim();
    let no_comment = postWrapper?.nextElementSibling.querySelector('.no_comment');
    setTimeout(() => {
      textarea.style.height = 'auto';
    }, 100);
    if (!comment_input) return;
    clearServerErrors();
    try {
      const res = await POST_JSON('/comment', {
        post_id: Number(postWrapper.id),
        comment_input: comment_input,
      });

      if (!res.ok) {
        res.errrors.forEach(showErrorBanner);
        return;
      }

      textarea.value = '';
      if (no_comment) no_comment.style.display = 'none';
      viewport();

    } catch (err) {
      console.error(err);
      showErrorBanner('Network error.');
    }
  };
};



// --- Chat Section ---
function makeChatHandler(postWrapper, scroller) {
  return function chatHandler(event) {
    chat_btn_click(event, postWrapper, scroller);
  };
}

// --- Chat Section ---
export function bindChat(postWrapper, scroller) {
  const chatBtn = postWrapper.querySelector('.post_chat_btn');
  const commentSection = postWrapper.nextElementSibling;
  if (!chatBtn || !commentSection) return;

  if (chatBtn._chatHandler) {
    chatBtn.removeEventListener('click', chatBtn._chatHandler);
  }

  let add_post_active = document.getElementById('add_post_dev_info');
  if (add_post_active.classList.contains('open')) {
    hide_smth(chatBtn);
  }

  let handler = makeChatHandler(postWrapper, scroller);
  chatBtn._chatHandler = handler;

  chatBtn.addEventListener('click', handler);
}

// --- Slideshow ---
function bindSlideshow(postWrapper) {
  const slideShow = postWrapper.querySelector('.post_slide_show');

  if (!slideShow) return;


  // ... slideshow binding logic here, scoped only to this postWrapper ...
      // let id = postWrapper.id;
      let descr_btn = postWrapper.querySelector('.descr_button');
      let descr_div = postWrapper.querySelector('.post_descr_div');
      let post_prev_btn = postWrapper.querySelector('.prev_button');
      let post_next_btn = postWrapper.querySelector('.next_button');

      if (descr_btn)
      {
        descr_btn.addEventListener('mouseover', () => descr_btn.style.paddingTop = '1rem');
        descr_btn.addEventListener('mouseleave', () => descr_btn.style.paddingTop = '0');
        slideShow.parentElement.onmouseover = function () {
          descr_btn.style.display = "flex";
        }
        slideShow.parentElement.onmouseleave = function () {
          descr_btn.style.display = 'none';
        }
        descr_btn.onclick = function() {
          if (descr_div.style.top == '0px') {
            descr_div.style.top = '-100%';
            post_next_btn.style.opacity = '1';
            post_prev_btn.style.opacity = '1';
          } else {
            descr_div.style.top = '0';
            post_next_btn.style.opacity = '0';
            post_prev_btn.style.opacity = '0';
          }
        };
      }

      let i = 1;
      let next_one = slideShow.firstElementChild?.nextElementSibling;

      while (i < slideShow.firstElementChild?.classList[1]) {
        if (next_one) {
          next_one.style.display = 'none';
        }
        next_one = next_one.nextElementSibling;
        i++;
      }

      if (slideShow.firstElementChild?.classList[1] > 1) {
        post_next_btn.style.display = 'flex';
      }

      post_next_btn.onmouseover = function () {
          let img_button = post_next_btn.firstElementChild
          img_button.style.transition = 'right 300ms'
          img_button.style.right = '-8px';
      }
      post_next_btn.onmouseleave = function () {
          let img_button = post_next_btn.firstElementChild
          img_button.style.transition = 'right 300ms'
          img_button.style.right = '-5px';
      }
      post_prev_btn.onmouseover = function () {
          let img_button = post_prev_btn.firstElementChild
          img_button.style.transition = 'left 300ms';
          img_button.style.left = '-16px';
      }
      post_prev_btn.onmouseleave = function () {
          let img_button = post_prev_btn.firstElementChild
          img_button.style.transition = 'left 300ms'
          img_button.style.left = '-13px';
      }

      let cur_img = slideShow.firstElementChild;

      post_next_btn.onclick = function () {
        post_prev_btn.style.display = 'block';
        if (!cur_img.nextElementSibling) return;
        cur_img.style.display = 'none';
        cur_img = cur_img.nextElementSibling;
        cur_img.style.display = 'block';
        if (!cur_img.nextElementSibling) {
          post_next_btn.style.display = 'none';
        }
      }

      post_prev_btn.onclick = function () {
        post_next_btn.style.display = 'block';
        if (!cur_img.previousElementSibling) return;
        cur_img.style.display = 'none';
        cur_img = cur_img.previousElementSibling;
        cur_img.style.display = 'block';
        if (!cur_img.previousElementSibling) {
          post_prev_btn.style.display = 'none';
        }
      }

}

//  rebind PROFILE / EDIT / LIKE BTN
function bindStamp(postWrapper) {

  const profileBtn = postWrapper.querySelector('.profile_btn');
  const editBtn    = postWrapper.querySelector('.edit_btn');
  const likeBtn    = postWrapper.querySelector('.like_btn');
  const likeCount  = postWrapper.querySelector('.like_count');

  async function save_and_fetch(formData, post_id) {
    const res = await fetch(`/post/${post_id}/update`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json',
        'X-CSRFToken': getCookie('csrftoken'),
      },
      body: formData,
    });

    if (!res.ok) {
      let data = await res.json();
      showErrorBanner(data.error || 'Request failed.');
      return;
    }
  }

  if (!profileBtn) return;

  profileBtn.addEventListener('click', function () {
    this.style.opacity = '0';
    setTimeout(() => { window.location.href = `/profile/${this.value}`; }, 200);
  });


  let edit_mode_off = function(formData) {
    // HANDLE UI

    const bin = postWrapper.querySelector('.post_bin');
    let edit_imgs = postWrapper.querySelector('.edit_imgs_btn');
    let category = postWrapper.querySelector('#category');
    let profile_btn = postWrapper.querySelector('.profile_btn');
    let delete_btn = postWrapper.querySelector('.delete_btn');


    editBtn.firstElementChild.src = edit_url_edit;

    hide_smth(delete_btn, 200);
    show_smth(profile_btn, 220);

    hide_smth(edit_imgs, 400);
    hide_smth(bin, 400);



    // KEYBOARD
    if (category.innerHTML === "Keyboard") {
      let switches = postWrapper.querySelector('#switches');
      let keycaps = postWrapper.querySelector('#keycaps');
      let edit_switches = postWrapper.querySelector('.edit_switches');
      let edit_keycaps = postWrapper.querySelector('.edit_keycaps');

      let switches_label = postWrapper.querySelector('.post_switches_label');
      let keycaps_label = postWrapper.querySelector('.post_keycaps_label');

      if (!edit_switches.value) {
        switches_label.classList.remove('show');
        switches_label.style.opacity = '0';
        setTimeout(() => switches_label.classList.add('hide'), 200);
      }
      if (!edit_keycaps.value) {
        keycaps_label.classList.remove('show');
        keycaps_label.style.opacity = '0';
        setTimeout(() => keycaps_label.classList.add('hide'), 200);
      }

      edit_switches.classList.remove('show');
      edit_keycaps.classList.remove('show');

      edit_switches.style.opacity = '0';
      edit_keycaps.style.opacity = '0';

      setTimeout(() => {
        edit_switches.classList.add('hide');
        edit_keycaps.classList.add('hide');

        if (switches.innerHTML) {
          switches.classList.remove('hide');
          switches.classList.add('show');
          setTimeout(() => switches.style.opacity = '1', 20);
        }
        if (keycaps.innerHTML) {
          keycaps.classList.remove('hide');
          keycaps.classList.add('show');
          setTimeout(() => keycaps.style.opacity = '1', 20);
        }
      }, 200);


      if (edit_switches.value !== switches.innerHTML) {
        switches.innerHTML = edit_switches.value;
        if (formData) formData.append('edit_switches', edit_switches.value)
      }
      if (edit_keycaps.value !== keycaps.innerHTML) {
        keycaps.innerHTML = edit_keycaps.value;
        if (formData) formData.append('edit_keycaps', edit_keycaps.value)
      }


      // SWITCHES
    } else if (category.innerHTML === "Switches") {
      let s_amount =  postWrapper.querySelector('#s_amount');
      let edit_s_amount = postWrapper.querySelector('.edit_s_amount');

      let s_lubed =  postWrapper.querySelector('.s_lubed');
      let edit_s_lubed = postWrapper.querySelector('.edit_s_lubed');

      edit_s_amount.classList.remove('show');
      edit_s_amount.style.opacity = '0';
      setTimeout(() => edit_s_amount.classList.add('hide'), 200);

      edit_s_lubed.classList.remove('show');
      edit_s_lubed.style.opacity = '0';
      setTimeout(() => edit_s_lubed.classList.add('hide'), 200);

      if (edit_s_amount.value && Number(s_amount.innerHTML) != Number(edit_s_amount.value)) {
        s_amount.innerHTML = edit_s_amount.value;
        if (formData) formData.append('edit_s_amount', edit_s_amount.value)
      }

    if ((edit_s_lubed.checked && s_lubed.innerHTML !== "Yes") || (s_lubed.innerHTML === "Yes" && !edit_s_lubed.checked)) {
        if (edit_s_lubed.checked) s_lubed.innerHTML = "Yes";
        else s_lubed.innerHTML = "No";
        if (formData) formData.append('edit_s_lubed', edit_s_lubed.checked);
      }

      setTimeout(() => {
        s_amount.classList.remove('hide');
        s_amount.classList.add('show');
        setTimeout(() => s_amount.style.opacity = '1', 20);

        s_lubed.classList.remove('hide');
        s_lubed.classList.add('show');
        setTimeout(() => s_lubed.style.opacity = '1', 20);
      }, 200);

    }

    let for_sale = postWrapper.querySelector('.sale_label');
    let price = postWrapper.querySelector('.post_price');
    let price_label = postWrapper.querySelector('.post_price_label');
    let edit_for_sale = postWrapper.querySelector('.edit_for_sale');
    let edit_price = postWrapper.querySelector('.edit_price');

    if (for_sale.innerHTML === "Yes") {
      for_sale.value = true;
    } else {
      for_sale.value = false;
    }

    if (edit_for_sale.checked) edit_for_sale.value = true;
    else edit_for_sale.value = false;

    if ((edit_for_sale.checked && for_sale.innerHTML !== "Yes") || (for_sale.innerHTML === "Yes" && !edit_for_sale.checked)) {
      if (formData) formData.append('edit_for_sale', edit_for_sale.checked ? 'true' : 'false');
      if (edit_for_sale.checked) {
        if (edit_price.value) {
          price.value = edit_price.value;
          price.innerHTML = edit_price.value;
          if (formData) formData.append('edit_price', edit_price.value);
        } else {
          if (formData) formData.append('edit_price', price.value);
        }
      }
    } else if (edit_for_sale.checked) {
        if (edit_price.value) {
          price.value = edit_price.value;
          price.innerHTML = edit_price.value;
          if (formData) formData.append('edit_price', edit_price.value);
        }
    }
    edit_for_sale.classList.remove('show');
    edit_for_sale.style.opacity = '0';
    setTimeout(() => edit_for_sale.classList.add('hide'), 200);
    edit_price.classList.remove('show');
    edit_price.style.opacity = '0';
    setTimeout(() => edit_price.classList.add('hide'), 200);

    setTimeout(() => {
      if (edit_for_sale.checked) {
        for_sale.innerHTML = "Yes";
        price.classList.remove('hide');
        price.classList.add('show');
        setTimeout(() => price.style.opacity = '1', 20);
        price_label.classList.remove('hide');
        price_label.classList.add('show');
        setTimeout(() => price_label.style.opacity = '1', 20);
      } else {
        for_sale.innerHTML = "No";
        price.classList.remove('show');
        price.style.opacity = '0';
        setTimeout(() => price.classList.add('hide'), 200);
        price_label.classList.remove('show');
        price_label.style.opacity = '0';
        setTimeout(() => price_label.classList.add('hide'), 200);
      }

      for_sale.classList.remove('hide');
      for_sale.classList.add('show');
      setTimeout(() => for_sale.style.opacity = '1', 20);

    }, 200)

    let textarea = postWrapper.querySelector('.edit_descr');
    let edit_descr = postWrapper.querySelector('.edit_descr_wrapper');
    let descr = postWrapper.querySelector('.post_descr_content');

    if (textarea.value != descr.innerHTML) {
      if (formData) formData.append('edit_descr', textarea.value);
      descr.innerHTML = textarea.value;
    }

    hide_smth(edit_descr);
    show_smth(descr);


  // SAVE DATA & SWITCH NO NORMAL

    editBtn.classList.remove('mode_on');
    editBtn.classList.add('mode_off');

  }


  if (editBtn) {
    let cur_files = [];
    let init_imgs = [];
    editBtn.onclick = async function() {
      let category = postWrapper.querySelector('#category');


      if (editBtn.classList.contains('mode_off')) {

        editBtn.classList.remove('mode_off');
        editBtn.classList.add('mode_on');

        handleEsc(() => edit_mode_off(null));
        editBtn.firstElementChild.src = edit_url_done;

        let profile_btn = postWrapper.querySelector('.profile_btn');
        let delete_btn = postWrapper.querySelector('.delete_btn');

        hide_smth(profile_btn);
        setTimeout(() => show_smth(delete_btn), 200);

        let flip_front = postWrapper.querySelector('.front');
        let flip_back = postWrapper.querySelector('.back');
        let flip_to_normal = function() {
          deleteEsc();
          handleEsc(() => edit_mode_off(null));
          flip_back.style.opacity = '0';
          flip_front.style.transform = 'rotateY(0deg)';
          flip_back.style.transform = 'rotateY(180deg)';
          flip_front.style.transform = 'rotateX(0deg)';
          flip_back.style.transform = 'rotateX(180deg)';
          setTimeout(() => {
            flip_back.classList.remove('show');
            flip_back.classList.add('hide');
          }, 200);
        }

        delete_btn.addEventListener('click', () => {
          flip_back.classList.remove('hide');
          flip_back.classList.add('show');
          setTimeout(() => {
          flip_back.style.opacity = '1';
          flip_front.style.transform = 'rotateY(180deg)';
          flip_back.style.transform = 'rotateY(0deg)';
          flip_front.style.transform = 'rotateX(180deg)';
          flip_back.style.transform = 'rotateX(0deg)';
          }, 200);

          let delete_no = postWrapper.querySelector('.delete_no');
          let delete_yes = postWrapper.querySelector('.delete_yes');

          handleEsc(flip_to_normal);

          postWrapper.addEventListener('mouseleave', () => {
            flip_to_normal();
          });

          delete_no.addEventListener('click', () => {
            flip_to_normal();
          })

          delete_yes.addEventListener('click', async () => {
            try {
              const res = await POST_JSON(`/post/${postWrapper.id}/delete`, {});
              if (!res.ok) {
                res.errors.forEach(showErrorBanner);
                return;
              } else {
                postWrapper.style.opacity = '0';
                setTimeout(() => {
                  if (document.chat_mode) {
                    toggleLoader();
                    get_back_to_normal();
                    setTimeout(() => {
                      postWrapper.nextElementSibling?.remove(); // remove comment section
                      if (postWrapper.value === 0 && postWrapper.nextElementSibling.nextElementSibling?.nextElementSibling.classList[0] === 'post_wrapper') postWrapper.nextElementSibling?.classList.add('first_one');
                      else if (postWrapper.value === 0) postWrapper.nextElementSibling?.classList.add('only_one');
                      else if (postWrapper.classList.contains('last_one')) postWrapper.previousElementSibling?.previousElementSibling?.classList.add('last_one');
                      postWrapper.remove();
                      toggleLoader();
                    }, 1200);
                  } else {
                    postWrapper.nextElementSibling?.remove(); // remove comment section
                    if (postWrapper.value === 0 && postWrapper.nextElementSibling.nextElementSibling?.nextElementSibling.classList[0] === 'post_wrapper') postWrapper.nextElementSibling?.classList.add('first_one');
                    else if (postWrapper.value === 0) postWrapper.nextElementSibling?.classList.add('only_one');
                    else if (postWrapper.classList.contains('last_one')) postWrapper.previousElementSibling?.previousElementSibling?.classList.add('last_one');
                    postWrapper.remove();
                  }
                }, 400);
              }
            } catch (e) {
              console.error(e);
              showErrorBanner('Network error.');
            }
          })
        })
        // EDIT MODE


        // IMAGE HANDLING
          let edit_imgs = postWrapper.querySelector('.edit_imgs_btn');
          let image_input = postWrapper.querySelector('.image_input');
          const slide_show = postWrapper.querySelector('.post_slide_show');
          const bin = postWrapper.querySelector('.post_bin');
          const next_button = postWrapper.querySelector('.next_button');
          const prev_button = postWrapper.querySelector('.prev_button');
          const img_warning = postWrapper.querySelector('.img_warning');
          init_imgs = Array.from(postWrapper.querySelectorAll('.create_image'))
          let track_old_imgs = init_imgs.length;


          show_smth(edit_imgs);
          show_smth(bin);

          let image_handling = function() {

            add_post_img.style.border = '.5px solid #dcdcde';

            let new_files = Array.from(postWrapper.querySelector('.files_id').files);

            let cur_images = postWrapper.querySelectorAll('.create_image');
            let cur_image_count = Array.from(cur_images).length;

            new_files.forEach((file, index) => {
              show_smth(bin);
              if ((index === 0 && cur_image_count) || index > 0) {
                next_button.style.display = 'block';
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
              img.style.display = 'block';
              img.setAttribute('id', 'img_' + (cur_image_count + index));
              slide_show.appendChild(img);
            });
          }

          image_input.onchange = () => {
            image_handling();
          };

          image_input.addEventListener('click', function() {
              this.value = '';
          });


          next_button.onmouseover = function () {
              let img_button = next_button.firstElementChild
              img_button.style.right = '-8px';
              img_button.style.transition = 'right 300ms'
          }
          next_button.onmouseleave = function () {
              let img_button = next_button.firstElementChild
              img_button.style.right = '-5px';
              img_button.style.transition = 'right 300ms'
          }
          prev_button.onmouseover = function () {
              let img_button = prev_button.firstElementChild
              img_button.style.left = '-16px';
              img_button.style.transition = 'left 300ms';
          }
          prev_button.onmouseleave = function () {
              let img_button = prev_button.firstElementChild
              img_button.style.left = '-13px';
              img_button.style.transition = 'left 300ms'
          }

          let page = 0
          for (let i = 0; i < init_imgs.length; i++) {
            if (init_imgs[i].style.display === 'block') {
              page = i;
              break;
            }
          }
          next_button.onclick = function () {
              let image_count = postWrapper.querySelectorAll('.create_image').length;

              var this_one = postWrapper.querySelector('#img_' + page)
              var next_one = postWrapper.querySelector('#img_' + (page + 1))

              this_one.style.display = 'none';
              next_one.style.display = 'block';

              prev_button.style.display = 'block';

              page++;
              if (page === image_count - 1)
                next_button.style.display = 'none';
          }

          prev_button.onclick = function () {
              let image_count = postWrapper.querySelectorAll('.create_image').length;

              var this_one = postWrapper.querySelector('#img_' + page )
              var prev_one = postWrapper.querySelector('#img_' + (page - 1))


              this_one.style.display = 'none';
              prev_one.style.display = 'block';

              next_button.style.display = 'block';

              page--;
              if (page == 0) {
                prev_button.style.display = 'none';
              }
          }

          bin.onclick = function () {

            let create_images = postWrapper.querySelectorAll('.create_image');
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
                if (page + 1 > track_old_imgs)
                  cur_files.splice(page - track_old_imgs, 1);
                if (page + 1 <= track_old_imgs)
                  track_old_imgs--;
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
            if (page === 0) {
              prev_button.style.display = 'none';
              next_button.style.display = 'block';
            } else if (page >= image_count - 1) {
              prev_button.style.display = 'block';
              next_button.style.display = 'none';
            }
            if (image_count - 1 <= 1) {
              prev_button.style.display = 'none';
              next_button.style.display = 'none';
            }
          }

          // END IMAGE HANDLING

        // DATA INPUT
        if (category.innerHTML === "Keyboard") {
          let switches = postWrapper.querySelector('#switches');
          let keycaps = postWrapper.querySelector('#keycaps');
          let edit_switches = postWrapper.querySelector('.edit_switches');
          let edit_keycaps = postWrapper.querySelector('.edit_keycaps');
          let switches_label = postWrapper.querySelector('.post_switches_label');
          let keycaps_label = postWrapper.querySelector('.post_keycaps_label');

          switches.classList.remove('show');
          keycaps.classList.remove('show');
          switches.style.opacity = '0';
          keycaps.style.opacity = '0';

          if (switches_label.classList.contains('hide')) {
            switches_label.classList.remove('hide');
            switches_label.classList.add('show');
            setTimeout(() => switches_label.style.opacity = '1', 20);
          }
          if (keycaps_label.classList.contains('hide')) {
            keycaps_label.classList.remove('hide');
            keycaps_label.classList.add('show');
            setTimeout(() => keycaps_label.style.opacity = '1', 20);
          }

          setTimeout(() => {
            switches.classList.add('hide');
            keycaps.classList.add('hide');

            edit_switches.classList.remove('hide');
            edit_keycaps.classList.remove('hide');

            edit_switches.classList.add('show');
            edit_keycaps.classList.add('show');

            setTimeout(() => {
              edit_switches.style.opacity = '1';
              edit_keycaps.style.opacity = '1';
            }, 20);
          }, 200);


        } else if (category.innerHTML === "Switches") {
          let s_lubed = postWrapper.querySelector('.s_lubed');
          let edit_s_lubed = postWrapper.querySelector('.edit_s_lubed');

          let s_amount =  postWrapper.querySelector('#s_amount');
          let edit_s_amount = postWrapper.querySelector('.edit_s_amount');

          edit_s_amount?.addEventListener('blur', () => {
            const v = Number(edit_s_amount.value);
            if (Number.isNaN(v)) return;
            if (v && v < 10) edit_s_amount.value = 10;
            if (v && v > 999) edit_s_amount.value = 999;
          });

          if (s_lubed.innerHTML === "Yes") edit_s_lubed.checked = true;

          s_amount.classList.remove('show');
          s_amount.style.opacity = '0';
          setTimeout(() => s_amount.classList.add('hide'), 200);

          s_lubed.classList.remove('show');
          s_lubed.style.opacity = '0';
          setTimeout(() => s_lubed.classList.add('hide'), 200);

          setTimeout(() => {
            edit_s_amount.classList.remove('hide');
            edit_s_amount.classList.add('show');
            setTimeout(() => edit_s_amount.style.opacity = '1', 20);

            edit_s_lubed.classList.remove('hide');
            edit_s_lubed.classList.add('show');
            setTimeout(() => edit_s_lubed.style.opacity = '1', 20);
          }, 200);
        }
        // FOR SALE INPUT
        let for_sale = postWrapper.querySelector('.sale_label');
        let price = postWrapper.querySelector('.post_price');
        let price_label = postWrapper.querySelector('.post_price_label');
        let edit_for_sale = postWrapper.querySelector('.edit_for_sale');
        let edit_price = postWrapper.querySelector('.edit_price');
        let tooltip = postWrapper.querySelector('.tooltip');

        edit_price?.addEventListener('blur', () => {
          if (!edit_for_sale.checked) return;
          const v = Number(edit_price.value);
          if (Number.isNaN(v)) return;
          if (v && v < 10) edit_price.value = 10;
          if (v && v > 10000) edit_price.value = 10000;
        });

        for_sale.classList.remove('show');
        for_sale.style.opacity = '0';
        setTimeout(() => for_sale.classList.add('hide'), 200);

        if (for_sale.innerHTML === "Yes") {
          price.classList.remove('show');
          price.style.opacity = '0';
          edit_for_sale.checked = true;
          setTimeout(() => {
            price.classList.add('hide')
            edit_price.classList.remove('hide');
            edit_price.classList.add('show');
            setTimeout(() => edit_price.style.opacity = '1', 20);
            price_label.classList.remove('hide');
            price_label.classList.add('show');
            setTimeout(() => price_label.style.opacity = '1', 20);
          }, 200);
        }

        setTimeout(() => {
          edit_for_sale.classList.remove('hide');
          edit_for_sale.classList.add('show');
          setTimeout(() => edit_for_sale.style.opacity = '1', 20);
        }, 200);


        edit_for_sale.onclick = function() {
          if (edit_for_sale.checked) {
            edit_price.classList.remove('hide');
            edit_price.classList.add('show');
            price_label.classList.remove('hide');
            price_label.classList.add('show');
            tooltip.classList.remove('hide');
            tooltip.classList.add('show');
            setTimeout(() => edit_price.style.opacity = '1', 20);
            setTimeout(() => price_label.style.opacity = '1', 20);
            setTimeout(() => tooltip.style.opacity = '1', 20);
          } else {
            edit_price.classList.remove('show');
            edit_price.style.opacity = '0';
            price_label.classList.remove('show');
            price_label.style.opacity = '0';
            tooltip.classList.remove('show');
            tooltip.classList.add('hide');
            tooltip.style.opacity = '0';
            setTimeout(() => edit_price.classList.add('hide'), 200);
            setTimeout(() => price_label.classList.add('hide'), 100);
          }
        }


        // DESCRIPTION INPUT

        let descr = postWrapper.querySelector('.post_descr_content');
        let textarea = postWrapper.querySelector('.edit_descr');
        let edit_descr = postWrapper.querySelector('.edit_descr_wrapper');

        textarea.addEventListener('input', function() {
          if (parseInt(this.style.height, 10) >= 280) {
            this.style.overflow = 'scroll';
            this.style.height = '100%';
          } else {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
          }
        });

        descr.classList.remove('show');
        descr.classList.add('hide');

        edit_descr.classList.remove('hide');
        edit_descr.classList.add('show');

      // END EDIT MODE
      } else {

        deleteEsc();
        let formData = new FormData();
        let image_count = (Array.from(postWrapper.querySelectorAll('.create_image'))).length;
        const img_warning = postWrapper.querySelector('.img_warning');

        if (image_count > 9) {
          img_warning.classList.remove('hide');
          img_warning.classList.add('show');
          return ;
        } else {
          img_warning.classList.remove('show');
          img_warning.classList.add('hide');
        }

        edit_mode_off(formData);
        // SAVE DATA --> FETCH
        let images_arr = Array.from(postWrapper.querySelectorAll('.create_image'));
        let same = true;
        if (init_imgs.length === images_arr.length) {
          for (let i = 0; i < init_imgs.length; i++) {
            if (init_imgs[i].src !== images_arr[i].src) same = false;
          }
        } else same = false;
        if (images_arr.length && !same) {
          for (const file of cur_files) formData.append("files", file, file.name);
          images_arr.forEach((img) => formData.append("old_files", img.name));
        }

        if ((Array.from(formData)).length >= 1) await save_and_fetch(formData, postWrapper.id);

      }
    };
  }

  if (!likeBtn) return;

  likeBtn.onclick = async function () {
    try {
      const res = await POST_JSON(`/post/${likeBtn.id}/like`);
      if (!res.ok) return;

      // If your view returns { liked, likes } use it; otherwise remove this block.
      const { liked, likes } = res.data;
      if (typeof likes === 'number' && likeCount) {
        likeCount.textContent = String(likes);
      }

      // Toggle the two icons (firstChild = unliked, lastChild = liked), like your code
      let like_count = postWrapper.querySelector('.like_count');
      let num = Number(like_count.innerHTML);
      if (liked) {
        likeBtn.firstElementChild.style.opacity = '0';
        setTimeout(() =>  likeBtn.firstElementChild.classList.remove('show'), 100);
        setTimeout(() =>  likeBtn.firstElementChild.classList.add('hide'), 100);
        setTimeout(() =>  likeBtn.lastElementChild.classList.remove('hide'), 100);
        setTimeout(() =>  likeBtn.lastElementChild.classList.add('show'), 100);
        setTimeout(() =>  likeBtn.lastElementChild.style.opacity  = '1', 100);
      } else {
        likeBtn.lastElementChild.style.opacity = '0';
        setTimeout(() =>  likeBtn.lastElementChild.classList.remove('show'), 100);
        setTimeout(() =>  likeBtn.lastElementChild.classList.add('hide'), 100);
        setTimeout(() =>  likeBtn.firstElementChild.classList.remove('hide'), 100);
        setTimeout(() =>  likeBtn.firstElementChild.classList.add('show'), 100);
        setTimeout(() =>  likeBtn.firstElementChild.style.opacity = '1', 100);
      }
    } catch (err) {
      console.error('Like toggle failed', err);
    }
  };
}


// ======= MAIN REBIND FUNCTION =======
// This is the function you export and call after posts are appended
export function rebindPosts(root = document, scroller = null) {
  setTimeout(() => {
    let spinner = document.querySelector('.spinner');
    const postWrappers = root.querySelectorAll('.post_wrapper');
    let i = 0;
    postWrappers.forEach(postWrapper => {
      if (i === 0 && postWrappers[1]) {
        postWrapper.classList.add('first_one');
      } else if (i === 0 && !postWrappers[1]) {
        postWrapper.classList.add('only_one');
      } else if (postWrapper.nextElementSibling?.nextElementSibling?.classList.contains('spinner'))
        postWrapper.classList.add('last_one');
      postWrapper.value = i;
      bindChat(postWrapper, scroller);
      bindSlideshow(postWrapper);
      bindStamp(postWrapper);
      postWrapper.style.opacity = '1';
      i++;
    });
  }, 400);
}


document.addEventListener('DOMContentLoaded', () => {
  const keyboard_div = document.getElementById('keyboard_div');

  let scroller; // 1) declare first so the callback can close over it
  scroller = ensureScroller({
    container: keyboard_div,
    onAfterInsert: (root) => {
      rebindPosts(keyboard_div, scroller); // 2) callback uses the same binding
    },
  });

  if (profile_name)
    rebindPosts(document, scroller); // 3) initial bind with a defined scroller

  // Track mouse position once
  let mouse = { x: null, y: null };
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    updateDateVisibility();
  }, { passive: true });

  let lastShown = null; // remember the currently shown .post_date

  function updateDateVisibility() {
    if (mouse.x == null || mouse.y == null) return; // no mouse yet

    const el = document.elementFromPoint(mouse.x, mouse.y);
    const wrapper = el?.closest?.('.post_wrapper') || null;
    const date = wrapper ? wrapper.querySelector('.post_date') : null;

    // Only change DOM when needed
    if (date !== lastShown) {
      if (lastShown) lastShown.style.opacity = '0';
      if (date) date.style.opacity = '1';
      lastShown = date;
    }
  }



  // Run on scroll/resize to react when content moves under the cursor
  keyboard_div.addEventListener('scroll', updateDateVisibility, { passive: true });
  window.addEventListener('resize', updateDateVisibility);


});

