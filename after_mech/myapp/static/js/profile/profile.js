import { ensureScroller } from '../home/scroller.js';
import { bindChat } from '../home/post.js';
import { clearServerErrors } from '../server_errors.js';
import { showErrorBanner } from '../server_errors.js';
import { add_post_field } from '../home/add_post.js';
import { handleEsc } from '../esc_module.js';
import { deleteEsc } from '../esc_module.js';
import Badges, { loadUnreadCounts, markRead } from '../badges.js';
import { click_show_smth, hide_smth } from '../show_hide.js';
import { get_back_to_normal } from '../home/post.js';
import { POST_JSON } from '../post_json.js';
import { getCookie } from '../get_cookie.js';


document.addEventListener('DOMContentLoaded', async function() {
 
  //  META
  const profile_name = document.querySelector('meta[name="profile_name"]').content;
  const profile_id = document.querySelector('meta[name="profile_id"]').content;
  let is_follow = document.querySelector('meta[name="is_follow"]').content;
  const follow_url = document.querySelector('meta[name="follow_img"]').content;
  const unfollow_url = document.querySelector('meta[name="unfollow_img"]').content;
  const raw_chat_id = document.querySelector('meta[name="chat_id"]').content || '';
  let chat_id = raw_chat_id && raw_chat_id.toLowerCase() !== 'none' ? raw_chat_id : null;
  const profile_picture_url = document.querySelector('meta[name="profile_picture_url"]').content;
  const user_name = document.querySelector('meta[name="user_name"]').content;
  const is_own_profile = profile_name == user_name ? true : false;
  
  // ----- BADGES -----

  let offMessengerLastRow = null;
  let offChatMessage = null;

  // NAVBAR BADGE
  Badges.registerGlobalBadge('#messenger_badge');

  // hook into the single hub; define 'active chat' + muted suppression
  Badges.wireBadgesRealtime({
    isActiveChat: (chatId) => {
      const pane = document.getElementById('profile_chat');
      return !!pane && pane.classList.contains('active_board') &&
             String(pane.dataset.chatId) === String(chatId);
    },
    shouldCount: (e) => {
      const row = document.querySelector(`.messenger_wrapper[id="${e.chat_id}"]`);
      const btn = row && row.querySelector('.mute_chat_btn');
      const v = (btn && btn.dataset.mutedState) || '';
      const isMuted = /^(1|true)$/i.test(v) || /^true$/i.test(v);
      return !isMuted; // skip muted chats
    }
  });

  await loadUnreadCounts();

  async function ensureChatId(profileName) {
    const res = await POST_JSON('/chat/ensure', { profile: profileName })
    if (!res.ok) res.errors.forEach(showErrorBanner);
    return String(res.data.chat_id);
  }

  window.cur_thread = null;

  let exit_btn = document.getElementById('exit_btn');
  let add_post_btn = document.querySelector('.add_post_btn');
  // let add_post_btn_wrapper = document.getElementById('add_post_btn_wrapper');
  let market_btn = document.getElementById('market_header');
  let keyboard_btn = document.getElementById('keyboard_header');
  // let profile_wrapper = document.getElementById('profile_wrapper');
  let profile_chat = document.getElementById('profile_chat');
  let profile_div = document.getElementById('profile_div');
  let profile_name_div = document.getElementById('profile_name');
  // let profile_username = document.getElementById('profile_username');
  let msg_btn = document.getElementById('profile_msg_label');
  let follow_btn = document.getElementById('profile_follow_label');
  let settings_btn = document.getElementById('profile_settings_label');
  let messenger_btn = document.getElementById('profile_messenger_label');

  let msg_img = document.getElementById('profile_msg_img');
  let follow_img = document.getElementById('profile_follow_img');
  let settings_img = document.getElementById('profile_settings_img');
  let messenger_img = document.getElementById('profile_messenger_img');

  let profile_info_btn = document.getElementById('profile_info_btn');
  let profile_info_img = document.getElementById('profile_info_img');

  let messenger_div = document.getElementById('messenger_div');

  let profile_btns = document.querySelectorAll('.profile_btn');
  profile_btns.forEach(elem => {
    elem.addEventListener('click', function () {
      this.style.opacity = '0';
      setTimeout(() => { window.location.href = `/profile/${this.value}`; }, 200);
    });
  });

  // STYLE THE HEADER
  // add_post_btn_wrapper.style.opacity = '1';
  market_btn.style.boxShadow = 'inset 2px 2px 2px 0px rgba(255, 255, 255, 0), 7px 7px 20px 0px rgba(0, 0, 0, 0.2), 4px 4px 5px 0px rgba(0, 0, 0, 0.2)';
  keyboard_btn.style.boxShadow = 'inset 2px 2px 2px 0px rgba(255, 255, 255, 0), 7px 7px 20px 0px rgba(0, 0, 0, 0.2), 4px 4px 5px 0px rgba(0, 0, 0, 0.2)';


  // DEACTIVATE POST CHAT BTNS

  let post_buttons_deactivate = function() {
    let postWrapper = document.querySelectorAll('.post_wrapper');
    postWrapper.forEach(elem => {
      let post_chat_btn = elem.querySelector('.post_chat_btn');
      post_chat_btn.removeEventListener('click', post_chat_btn._chatHandler);
    });
  }

  let post_buttons_activate = function () {
    let postWrapper = document.querySelectorAll('.post_wrapper');
    postWrapper.forEach(elem => {
      let post_chat_btn = elem.querySelector('.post_chat_btn');
      post_chat_btn.addEventListener('click', post_chat_btn._chatHandler);
    });
  }

  // FOLLOWER TEMPLATE LOGIC
  let follower_board = document.querySelector('#follower_div');
  let following_board = document.querySelector('#following_div');
  let follower_btn = document.querySelector('#profile_follower');
  let following_btn = document.querySelector('#profile_following');

  let follower_board_activate = function () {
    if (document.chat_mode) {
        return ;
    }
    // FIRST MAKE SURE EVERY OTHER DIV IS CLOSED
    follower_board.classList.remove('inactive_board');
    follower_board.classList.add('active_board');
    if (add_post_btn.classList.contains('active')) {
      add_post_field();
    } else if (following_board.classList.contains('active_board')) {
      following_board_deactivate();
    } else if (messenger_div && messenger_div.classList.contains('active_board')) {
      messenger_deactivate();
    } else if (profile_chat.classList.contains('active_board')) {
      close_profile_chat();
      if (messenger_div) messenger_deactivate();
    }
    click_show_smth(exit_btn);
    // hide_smth(add_post_btn);
    deleteEsc();
    handleEsc(follower_board_deactivate);
    follower_board.style.left = '10%';
    exit_btn.removeEventListener('click', follower_board_deactivate);
    exit_btn.addEventListener('click', follower_board_deactivate);
    post_buttons_deactivate();
  }

  let follower_board_deactivate= function () {
    deleteEsc();

    follower_board.classList.remove('active_board');
    follower_board.classList.add('inactive_board');
    follower_board.style.left = '-80%';
    exit_btn.removeEventListener('click', follower_board_deactivate);
    // click_show_smth(add_post_btn);
    hide_smth(exit_btn);
    post_buttons_activate();
  }

  let following_board_activate = function () {
    if (document.chat_mode) {
        return ;
    }
    // FIRST MAKE SURE EVERY OTHER DIV IS CLOSED
    following_board.classList.remove('inactive_board');
    following_board.classList.add('active_board');
    if (add_post_btn.classList.contains('active')) {
      add_post_field();
    } else if (follower_board.classList.contains('active_board')) {
      follower_board_deactivate();
    } else if (messenger_div && messenger_div.classList.contains('active_board')) {
      messenger_deactivate();
    } else if (profile_chat.classList.contains('active_board')) {
      close_profile_chat();
      if (messenger_div) messenger_deactivate();
    }
    click_show_smth(exit_btn);
    // hide_smth(add_post_btn);
    deleteEsc();
    handleEsc(following_board_deactivate);
    following_board.style.left = '10%';
    exit_btn.removeEventListener('click', following_board_deactivate);
    exit_btn.addEventListener('click', following_board_deactivate);
    post_buttons_deactivate();
  }

  let following_board_deactivate= function () {
    deleteEsc();
    hide_smth(exit_btn);
    // click_show_smth(add_post_btn);

    following_board.classList.remove('active_board');
    following_board.classList.add('inactive_board');
    following_board.style.left = '-80%';
    exit_btn.removeEventListener('click', following_board_deactivate);
    post_buttons_activate();
  }

  follower_btn.addEventListener('click', function() {
    if (follower_board.classList.contains('inactive_board')) {
      follower_board_activate();
    } else {
      follower_board_deactivate();
    }
  })

  following_btn.addEventListener('click', function() {
    if (following_board.classList.contains('inactive_board')) {
      following_board_activate();
    } else {
      following_board_deactivate();
    }
  })


function connect_thread(chatId) {
  if (!window.AppRealtime) {
    console.warn('AppRealtime not found; load realtime.js first.');
    return null;
  }
  const idStr = String(chatId);

  // Cleanup previous subscription (if switching threads)
  if (window.cur_thread) {
    if (window.cur_thread.chatId === idStr) return window.cur_thread; // already wired
    try { window.AppRealtime.unsubscribe(`chat_${window.cur_thread.chatId}`); } catch {}
    try { window.cur_thread.off && window.cur_thread.off(); } catch {}
    window.cur_thread = null;
  }

  // Subscribe this tab to the chat group
  window.AppRealtime.subscribe(`chat_${idStr}`);

  if (offChatMessage) {
    offChatMessage();
    offChatMessage = null;
  }

  // Bind a handler only for this chatId (topic=chatId)
  offChatMessage = window.AppRealtime.on('chat_message', idStr, (e) => {
    // e: { type:'chat_message', chat_id, message_id, content, user_id, ts }
    const isOwn = String(e.user_name) === user_name;

    // Adapt to your rendererÕs shape
    update_chat_section({
      username: user_name,
      message:  e.content,
      date:     e.ts,
      is_own:   isOwn,
    });

    // Optional: auto-scroll your thread view here
    // chat_section_2.scrollTop = chat_section_2.scrollHeight
  });

  // Keep a handle so we can unsubscribe later
  window.cur_thread = { chatId: idStr };

  return window.cur_thread;
}

let load_chat = async function(profile_name) {
    chat_section_2.innerHTML = '';
    const res = await POST_JSON('/chat/update', {profile: profile_name});
    if (!res.ok) {
      res.errors.forEach(showErrorBanner);
      return ;
    }
    res.data.data.reverse().forEach(update_chat_section);
}

let textarea = document.querySelector('.chat_input');
textarea.addEventListener('input', function() {
  clearServerErrors();
  this.style.height = 'auto';
  this.style.height = (this.scrollHeight) + 'px';
});

let submit_chat = document.querySelector('.submit_chat');

let submit_chat_click = async function(profile_name) {
  clearServerErrors();
  const chat_input = textarea.value.trim();
  if (!chat_input) return;

  const res = await POST_JSON('/chat', { profile: profile_name, message: chat_input })
  if (!res.ok) {
    errs.forEach(showErrorBanner);
    return;
  }
  textarea.value = '';
  textarea.style.height = 'auto';
}


let attach_mute_btn = function () {
  let mute_btns = document.querySelectorAll('.mute_chat_btn');
  mute_btns.forEach(elem => {
    // elem.removeEventListener('click', () => mute_btn_click(elem));
    // elem.addEventListener('click', () => mute_btn_click(elem));
    elem.removeEventListener('click', mute_btn_click);
    elem.addEventListener('click', mute_btn_click);
  });
}

let muteBusy = false;

async function mute_btn_click(e) {
  e.stopPropagation();

  let btn = e.target.closest('.mute_chat_btn');
  if (muteBusy) return;
  muteBusy = true;

  try {
    if (!btn) return;

    const chat_id = btn.dataset.chatId;

    const res = await POST_JSON(`/chat/${chat_id}/mute_chat`);
    if (!res.ok) throw new Error('mute failed');
    const { muted } = res.data;
    // Update data-attr and icons explicitly
    btn.dataset.mutedState = muted;
    const [iconMute, iconMuted] = btn.querySelectorAll('.mute_icon');
    if (iconMute && iconMuted) {
      if (muted === '1') {
        iconMute.classList.remove('show');  iconMute.classList.add('hide');
        iconMuted.classList.remove('hide'); iconMuted.classList.add('show');
      } else {
        iconMute.classList.remove('hide');  iconMute.classList.add('show');
        iconMuted.classList.remove('show'); iconMuted.classList.add('hide');
      }
    }
    // Badges module will also get the WS "mute_state" and keep counts aligned.
  } catch (err) {
    console.error('Network error.', err);
  } finally {
    muteBusy = false;
  }
}

let messenger_deactivate = null;

let messenger_btn_click = function(event) {

  event.stopPropagation();
  

  setTimeout(() => {
    if (messenger_div.classList.contains('inactive_board')) {
      messenger_activate();
      } else {
      messenger_deactivate();
    }
  }, 20);
}

if (messenger_btn) messenger_btn.addEventListener('click', messenger_btn_click);

function makeSubmitHandler(profile_name) {
  return function() {
    submit_chat_click(profile_name);
  };
}

submit_chat._submitHandler = makeSubmitHandler(profile_name);
submit_chat.addEventListener('click', submit_chat._submitHandler);


let messenger_activate = function() {
  if (document.chat_mode) {
      get_back_to_normal();
  }
  if (add_post_btn.classList.contains('active')) {
    add_post_field();
  } else if (follower_board.classList.contains('active_board')) {
    follower_board_deactivate();
  } else if (following_board.classList.contains('active_board')) {
    following_board_deactivate();
  }
  attach_mute_btn();
  // setTimeout(() => click_show_smth(exit_btn), 220);
  click_show_smth(exit_btn);
  deleteEsc();
  handleEsc(messenger_deactivate);
  messenger_div.classList.remove('inactive_board');
  messenger_div.classList.add('active_board');
  messenger_div.style.left = '10%';
  exit_btn.removeEventListener('click', messenger_btn_click);
  exit_btn.addEventListener('click', messenger_btn_click);
  post_buttons_deactivate();
  let profile_btns = messenger_div.querySelectorAll('.post_btn');
  profile_btns.forEach(elem => {
    elem.addEventListener('click', function () {
      this.style.opacity = '0';
      setTimeout(() => { window.location.href = `/profile/${this.value}`; }, 200);
    });
  });
}

messenger_deactivate = function(event) {
  deleteEsc();

  // click_show_smth(add_post_btn);
  hide_smth(exit_btn);
  messenger_div.classList.remove('active_board');
  messenger_div.classList.add('inactive_board');
  messenger_div.style.left = '-80%';
  exit_btn.removeEventListener('click', messenger_btn_click);
  post_buttons_activate();
}


async function clearChatUnreadOnOpen(chatId) {
  // local clear
  await markRead(chatId);
}


let open_profile_chat = async function(chatId, profile_name) {
  if (document.chat_mode) {
      return ;
  }
  if (!chatId || chatId === 'None') {
    try {
      chatId = await ensureChatId(profile_name);
      // remember it so subsequent opens use it
      chat_id = chatId; 
    } catch (e) {
      clearServerErrors();
      showErrorBanner(e.message || 'Could not open chat');
      return;
    }
  }
  if (is_own_profile) {
    messenger_deactivate();
    messenger_btn.removeEventListener('click', messenger_btn_click);
    messenger_btn.addEventListener('click', close_profile_chat, { once: true });
    // setTimeout(() => click_show_smth(exit_btn), 220);
  } else { // WHEN WE ARE ON DIFFERENT PROFILE
    if (follower_board.classList.contains('active_board')) {
      follower_board_deactivate();
    } else if (following_board.classList.contains('active_board')) {
      following_board_deactivate();
    }
    exit_btn.addEventListener('click', close_profile_chat);
  }
  click_show_smth(exit_btn);
  // hide_smth(add_post_btn);
  profile_chat.classList.remove('inactive_board');
  profile_chat.classList.add('active_board');
  // click_show_smth(exit_btn);
  let postWrapper = document.querySelectorAll('.post_wrapper');
  postWrapper.forEach(elem => {
    let post_chat_btn = elem.querySelector('.post_chat_btn');
    post_chat_btn.removeEventListener('click', post_chat_btn._chatHandler);
  });

  profile_chat.dataset.chatId = String(chatId);
  await load_chat(profile_name);
  connect_thread(chatId);
  await markRead(chatId);

  // Remove previous handler if it exists
  if (submit_chat._submitHandler) {
      submit_chat.removeEventListener('click', submit_chat._submitHandler);
  }
  
  // Create new handler and store reference
  submit_chat._submitHandler = makeSubmitHandler(profile_name);
  submit_chat.addEventListener('click', submit_chat._submitHandler);
}


let close_profile_chat = async function() {
  profile_chat.classList.remove('active_board');
  profile_chat.classList.add('inactive_board');
  const post_div = document.getElementById('keyboard_div');
  let scroller; // 1) declare first so the callback can close over it
  scroller = ensureScroller({
    container: post_div,
    onAfterInsert: (root) => rebindPosts(root, scroller), // 2) callback uses the same binding
  });
  // click_show_smth(add_post_btn);
  hide_smth(exit_btn);
  if (is_own_profile) {
    if (follower_div.classList.contains('inactive_board') && following_div.classList.contains('inactive_board'))
      messenger_activate();
    exit_btn.removeEventListener('click', close_profile_chat);
    messenger_btn.removeEventListener('click', close_profile_chat);
    messenger_btn.addEventListener('click', messenger_btn_click);
  } else { // WHEN WE ARE ON DIFFERENT PROFILE
    deleteEsc();
  }
  let postWrapper = document.querySelectorAll('.post_wrapper');
  if (!is_own_profile) {
    postWrapper.forEach(elem => {
      bindChat(elem, scroller);
    });
  }
  // postWrapper.forEach(elem => {
  //   let post_chat_btn = elem.querySelector('.post_chat_btn');
  //   post_chat_btn.addEventListener('click', post_chat_btn._chatHandler);
  // });
}

  // MESSENGER WEBSOCKET LOGIC

;(function() {
  if (!is_own_profile) return; 
  const container = document.getElementById("messenger_div");
  if (!container) return;
  let messenger_btns = container.querySelectorAll(".message_profile_btn");
  messenger_btns.forEach(el => {
    el.addEventListener('click', function() {
      open_profile_chat(el.parentElement.id, el.parentElement.dataset.otherUsername);
      handleEsc(close_profile_chat);
      exit_btn.removeEventListener('click', close_profile_chat);
      exit_btn.addEventListener('click', close_profile_chat);
    });
  })

function buildMessengerRow({ chat_id, content, iso_date, other_username, profile_picture_url, is_own, muted}) {
  const row = document.createElement('div');
  row.id = String(chat_id);
  row.className = 'messenger_wrapper';
  row.dataset.otherUsername = other_username;
  row.dataset.lastDate = iso_date;

  row.innerHTML = `
    <label class="profile_picture_stack">
      <img class="search_profile_picture" src="${profile_picture_url || '/static/imgs/friends_b.png'}" alt="${other_username}">
    </label>

    <button class="search_profile_btn post_btn" value="${other_username}">
      ${other_username}
    </button>

    <div class="last_one_div ${is_own ? 'own_message' : ''}">
      <p class="last_one_preview last_content">${content}</p>
      <p class="last_one_date last_date">${relTime(iso_date)} ago</p>
    </div>

    <button class="small_btn message_profile_btn" data-chat-id="${chat_id}">
      <img src="/static/imgs/message.png" alt="message image">
      <span class="badge chat-badge" hidden>0</span>
    </button>

    <button class="mute_chat_btn" data-chat-id="${ chat_id }" data-muted-state="${ muted }">
      <img class="mute_icon mute show" src="/static/imgs/mute.png" alt="mute">
      <img class="mute_icon muted hide" src="/static/imgs/mute_filled.png" alt="muted">
    </button>
  `;

  return row;
}

if (offMessengerLastRow) {
  offMessengerLastRow();
  offMessengerLastRow = null;
}

offMessengerLastRow = window.AppRealtime?.on('messenger_last_row', '', (e) => {
  const { chat_id, last_content: content, sender_username, sender_id, last_ts: iso_date, other_username, profile_picture_url} = e;
  attach_mute_btn();

  let is_own = (user_name === sender_username);

  // update profile links
  let profile_btns = container.querySelectorAll('.post_btn');
  profile_btns.forEach(elem => {
    elem.addEventListener('click', function () {
      this.style.opacity = '0';
      setTimeout(() => { window.location.href = `/profile/${this.value}`; }, 200);
    });
  });
  const muted = false;
  let row = container.querySelector(`#${CSS.escape(String(chat_id))}`);
  if (!row) {
    row = buildMessengerRow({
      chat_id,
      content,
      iso_date,
      other_username,
      profile_picture_url,
      muted,
    });
  }


  // active chat id if panel is open
  const isPanelOpen = profile_chat?.classList.contains('active_board');
  const activeChatId = isPanelOpen ? (profile_chat.dataset.chatId || null) : null;
  if (isPanelOpen && Number(profile_chat.dataset.chatId) === chat_id)
    { markRead(chat_id) };


  // Only count if message came from the other user
  // if (!is_own) {
  //   if (!isPanelOpen || String(activeChatId) !== String(chat_id)) {
  //     // messenger hidden OR different chat open -> increment badges
  //     bumpChatUnread(chat_id, +1);
  //   } else {
  //     // Optional: if active panel and matching chat are open, you could auto-clear here
  //     // but per your spec we clear on click/open via clearChatUnreadOnOpen()
  //   }
  // }

  // let messenger_btn = row.querySelector(".message_profile_btn");
  // messenger_btn.removeEventListener('click', open_profile_chat);
  // messenger_btn.addEventListener('click', () => open_profile_chat(row.id, row.dataset.otherUsername));

  // update last message UI
  const userEl = row.querySelector(".last_user");
  const contentEl = row.querySelector(".last_content");
  const dateEl = row.querySelector(".last_date");
  if (userEl) userEl.textContent = `${sender_username}:`;
  if (contentEl) contentEl.textContent = content;
  if (dateEl) dateEl.textContent = relTime(iso_date) + " ago";

  // toggle own_comment
  const lastDiv = row.querySelector(".last_one_div");
  if (is_own) lastDiv.classList.add('own_message');
  else lastDiv.classList.remove('own_message');

  // move to top
  row.dataset.lastTs = iso_date;
  container.prepend(row);
});

  function relTime(iso) {
    const s = Math.floor((Date.now() - new Date(iso).getTime())/1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s/60); if (m < 60) return `${m}m`;
    const h = Math.floor(m/60); if (h < 24) return `${h}h`;
    const d = Math.floor(h/24); return `${d}d`;
  }
})();


  // console.log('init websocket 2');
  // const websocket = new WebSocket(`ws://${window.location.hostname}:8001/ws/chat/${chat_id}/`);

  // websocket.onopen = () => console.log("connected!");
  //
  // websocket.onerror = (e) => {
  //   console.log("Error! ", e);
  //   console.log("ReadyState: ", websocket.readyState);
  // };
  //
  // websocket.onclose = (event) => {
  //   console.log('WebSocket closed:', event.code, event.reason);
  // };

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

  function update_chat_section(data) {

    const chat_elem = document.createElement('div');
    chat_elem.classList.add('chat_elem');
    if (data.is_own) {
      chat_elem.classList.add('own_message');
    }
    const chat_content = document.createElement('p');
    chat_content.classList.add('chat_content');
    chat_content.innerHTML = data.message;

    const chat_date = document.createElement('p')
    chat_date.classList.add('chat_date');
    chat_date.innerHTML = format_date(data.date || new Date());

    chat_elem.appendChild(chat_content);
    chat_elem.appendChild(chat_date);
    chat_section_2.prepend(chat_elem);

    chat_section_2.scrollTop = chat_section_2.scrollHeight            
  };


  //  HOVER EFFECTS

  if (msg_btn) {

    msg_btn.onmouseover = function() {
      msg_btn.style.background = 'rgba(140, 140, 140, .8)';
      msg_img.style.left = '10%';
    }
    msg_btn.onmouseleave = function() {
      msg_btn.style.background = 'rgba(140, 140, 140, .4)';
      msg_img.style.left = '2%';
    }
    follow_btn.onmouseover = function() {
      follow_btn.style.background = 'rgba(140, 140, 140, .8)';
      follow_img.style.width = '28px';
    }
    follow_btn.onmouseleave = function() {
      follow_btn.style.background = 'rgba(140, 140, 140, .4)';
      follow_img.style.width = '30px';
    }

    follow_btn.onclick = async function(event) {
      event.stopPropagation();
      follow_img.style.transition = 'width 0s ease';
      follow_img.style.width = '28px';

      setTimeout(() => follow_img.style.transition = 'width .4s ease', 20);
      if (is_follow == 'True') {
        profile_name_div.classList.remove('border_gradient');
        follow_img.setAttribute('src', follow_url);
        // TODO: can't I just put the two fetch calls above this if statement?
        const res = await POST_JSON(`/profile/${profile_name}`, {follow: is_follow});
        if (!res.ok) {
          res.errors.forEach(showErrorBanner);
          return ;
        }
        is_follow = 'False';
      }
      else {
        profile_name_div.classList.add('border_gradient');
        follow_img.setAttribute('src', unfollow_url);
        follow_btn.style.background = 'rgba(140, 140, 140, .8)';
        const res = await POST_JSON(`/profile/${profile_name}`, {follow: is_follow});
        if (!res.ok) {
          res.errors.forEach(showErrorBanner);
          return ;
        }
        is_follow = 'True';
      }
    }

    msg_btn.onclick = async function(event) {
      event.stopPropagation();

      let postWrapper = document.querySelectorAll('.post_wrapper');
      const post_div = document.getElementById('keyboard_div');
      let scroller; // 1) declare first so the callback can close over it
      scroller = ensureScroller({
        container: post_div,
        onAfterInsert: (root) => rebindPosts(root, scroller), // 2) callback uses the same binding
      });
      if (profile_chat.classList.contains('inactive_board')) {
        let cid = chat_id;
        if (!cid || cid === 'None') {
          try {
            cid = await ensureChatId(profile_name);
            chat_id = cid; // cache
          } catch (e) {
            clearServerErrors();
            showErrorBanner(e.message || 'Could not open chat');
            return;
          }
        }
        handleEsc(close_profile_chat);
        await open_profile_chat(cid, profile_name);
        // profile_chat.classList.remove('inactive');
        // profile_chat.style.left = '10%';

        postWrapper.forEach(elem => {
          let post_chat_btn = elem.querySelector('.post_chat_btn');
          post_chat_btn.removeEventListener('click', post_chat_btn._chatHandler);
        });

      } else {
        close_profile_chat();
      }
    }
  } else {
    profile_name_div.classList.add('border_gradient');
    settings_btn.onmouseover = function() {
      settings_btn.style.background = 'rgba(140, 140, 140, .8)';
    }
    settings_btn.onmouseleave = function() {
      settings_btn.style.background = 'rgba(140, 140, 140, .4)';
    }
    settings_btn.onclick = function() {
      window.location.href = '/settings'
    }
    messenger_btn.onmouseover = function() {
      messenger_btn.style.background = 'rgba(140, 140, 140, .8)';
    }
    messenger_btn.onmouseleave = function() {
      messenger_btn.style.background = 'rgba(140, 140, 140, .4)';
    }
}
  // profile_name_div.onmouseover = function () {
  //   profile_info_img.style.left = '0';
  // }
  // profile_name_div.onmouseleave = function () {
  //   profile_info_img.style.left = '-20%';
  // }
  profile_name_div.onclick = function () {
    profile_div.style.left = '0';
  }
  profile_div.onmouseleave = function () {
    if (profile_div.style.left = '0') {
      profile_div.style.left = '-2rem';
    }
  };
});
