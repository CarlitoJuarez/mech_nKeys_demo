import { POST_JSON } from './post_json.js';
import { showErrorBanner } from './server_errors.js';

// badges.js
let totalUnread = 0;                 // displayed total (filtered for mutes)
const perChat = new Map();           // chatId (string) -> unread count (raw)
const mutedChats = new Set();        // chatIds that are muted (strings)
const globalTargets = new Set();     // DOM els mirroring totalUnread

let wired = false;
let loadPromise = null;
let offBadgeUpdate = null;
let offMsgLastRow = null;
let offMuteState = null;

// Callers can provide these; defaults are safe no-ops.
let isActiveChatFn = () => false;    // (chatId) => boolean
let shouldCountFn  = () => true;     // (event)  => boolean

/* ---------------- utils ---------------- */

function $(selOrEl) {
  return typeof selOrEl === 'string' ? document.querySelector(selOrEl) : selOrEl;
}

function keyOf(id) { return String(id); }

function setBadgeEl(el, n) {
  if (!el) return;
  n = n | 0;
  if (n <= 0) { el.hidden = true;  el.textContent = '0'; }
  else        { el.hidden = false; el.textContent = n > 99 ? '99+' : String(n); }
}


// NOTE: IF THE LABAL IS     __INSIDE__     THE BUTTON

// function buttonBadgeForChat(chatId) {
//   const sel = `.message_profile_btn[data-chat-id="${CSS.escape(String(chatId))}"] .badge, ` +
//               `.message_profile_btn[data-chat-id="${CSS.escape(String(chatId))}"] .chat-badge`;
//   console.log("SEL: ", sel);
//   return document.querySelector(sel);
// }

// NOTE: IF THE LABAL IS    __OUTSIDE__     THE BUTTON

function buttonBadgeForChat(chatId) {
  const base = `.message_profile_btn[data-chat-id="${CSS.escape(String(chatId))}"]`;
  const sel = `${base} + .badge, ${base} + .chat-badge`;
  return document.querySelector(sel);
}

function isMuted(chatId) { return mutedChats.has(keyOf(chatId)); }

function setMuted(chatId, muted) {
  const k = keyOf(chatId);
  if (muted) mutedChats.add(k);
  else       mutedChats.delete(k);

  // Reflect per-chat badge immediately: muted -> 0; unmuted -> show current count
  const badge = buttonBadgeForChat(k);
  if (badge) setBadgeEl(badge, muted ? 0 : (perChat.get(k) | 0));

  // Recompute global (global excludes muted chats)
  recomputeGlobal();
}

function seedMutedFromServer(ids = []) {
  mutedChats.clear();
  for (const id of ids) mutedChats.add(String(id));
}

function seedMutedFromDOM() {
  // Read current mute state from any mute buttons in the DOM (best-effort).
  document.querySelectorAll('.mute_chat_btn[data-chat-id]').forEach(btn => {
    const cid = btn.getAttribute('data-chat-id');
    const v = (btn.getAttribute('data-muted-state') || '').trim().toLowerCase();
    const muted = v === '1' || v === 'true';
    if (muted) mutedChats.add(keyOf(cid)); else mutedChats.delete(keyOf(cid));
  });
}

function recomputeGlobal() {
  // Sum only UNMUTED chats
  let sum = 0;
  for (const [cid, n] of perChat.entries()) {
    if (!isMuted(cid)) sum += (n | 0);
  }
  totalUnread = Math.max(0, sum);
  renderGlobal();
}

function renderGlobal() {
  for (const el of globalTargets) setBadgeEl(el, totalUnread);
}

function reconcileFromServer(total, per_chat) {
  // Reset local snapshot
  perChat.clear();

  // Fill perChat with server values
  if (per_chat && typeof per_chat === 'object') {
    for (const [chatId, n] of Object.entries(per_chat)) {
      perChat.set(keyOf(chatId), n | 0);
    }
  }

  // For any chat buttons that exist in the DOM but are absent from server map,
  // ensure their per-chat badge is updated (0 or hidden). This helps when a chat has 0.
  document.querySelectorAll('.message_profile_btn[data-chat-id]').forEach(btn => {
    const cid = btn.getAttribute('data-chat-id');
    if (!perChat.has(keyOf(cid))) perChat.set(keyOf(cid), 0);
  });

  // Recompute global (filtered for mutes)
  recomputeGlobal();

  // Reflect per-chat badges (muted => always 0)
  for (const [chatId, n] of perChat.entries()) {
    const badge = buttonBadgeForChat(chatId);
    if (badge) setBadgeEl(badge, isMuted(chatId) ? 0 : (n | 0));
  }
}

/* ---------------- public API ---------------- */

export function registerGlobalBadge(selOrEl) {
  const el = $(selOrEl);
  if (el) {
    globalTargets.add(el);
    setBadgeEl(el, totalUnread); // immediate render with current total
  }
}

export function getTotalUnread() { return totalUnread; }

export function getChatUnread(chatId) { return perChat.get(keyOf(chatId)) || 0; }

export function setGlobalUnread(n) {
  // Keep this API but prefer recomputeGlobal() elsewhere.
  totalUnread = Math.max(0, n | 0);
  renderGlobal();
}

export function setChatUnread(chatId, n) {
  const k = keyOf(chatId);
  const next = Math.max(0, n | 0);
  perChat.set(k, next);

  // Per-chat badge: if muted -> 0, else -> n
  const badgeEl = buttonBadgeForChat(k);
  if (badgeEl) setBadgeEl(badgeEl, isMuted(k) ? 0 : next);

  // Global should ignore muted chats; recompute rather than diff math
  recomputeGlobal();
}

export function bumpChatUnread(chatId, delta = 1) {
  const k = keyOf(chatId);
  if (isMuted(k)) return; // muted chats never bump
  const cur = perChat.get(k) || 0;
  setChatUnread(k, cur + (delta | 0));
}

// optimistic local clear + server mark
export async function markRead(chatId) {
  const k = keyOf(chatId);
  // zero locally (even if already 0) to force DOM reflect
  setChatUnread(k, 0);


  const res = await POST_JSON('/messenger/mark_read', { chat_id: chatId });
  if (!res.ok) {
    res.errors.forEach((e) => console.warn('mark_read failed: ', e));
  }
}

export async function bootBadges(opts = {}) {
  wireBadgesRealtime(opts);          // guarded by `wired`
  await loadUnreadCounts();          // guarded by `loadPromise`
}

export async function loadUnreadCounts({ force = false } = {}) {
  if (!force && loadPromise) return loadPromise;  // de-dupe in-flight
  loadPromise = (async () => {
    try {
      // Seed mute state from DOM once before first render
      seedMutedFromDOM();

      const res = await POST_JSON('/messenger/unread_counts')
      if (!res.ok) {
        res.errors.forEach(showErrorBanner);
        return ;
      }
      const { total, per_chat, muted_chat_ids } = res.data;

      seedMutedFromServer(muted_chat_ids || []);
      reconcileFromServer(total, per_chat);
    } finally {
      // keep the cached promise so later calls don't refetch unless force:true
    }
  })();
  return loadPromise;
}

/**
 * Hook into the shared AppRealtime bus (ONE websocket for the app).
 * @param {Object} opts
 * @param {(chatId:string|number)=>boolean} [opts.isActiveChat] returns true if this chat is open
 * @param {(payload:any)=>boolean}          [opts.shouldCount]   allow caller to suppress bump (e.g., extra filters)
 */

export function wireBadgesRealtime(opts = {}) {
  const tryWire = (attempt = 0) => {
    if (wired) return;                          // already wired
    if (!window.AppRealtime) {                  // hub not ready yet
      if (attempt < 60) {                       // retry up to ~3s (60 * 50ms)
        return setTimeout(() => tryWire(attempt + 1), 50);
      } else {
        console.warn('[badges] AppRealtime never appeared; skipping wiring');
        return;
      }
    }

    // we have AppRealtime now Ñ proceed
    wired = true;

    isActiveChatFn = typeof opts.isActiveChat === 'function' ? opts.isActiveChat : () => false;
    shouldCountFn  = typeof opts.shouldCount  === 'function' ? opts.shouldCount  : () => true;

    offBadgeUpdate = window.AppRealtime.on('badge_update', '', (e) => {
      if (Array.isArray(e.muted_chat_ids)) seedMutedFromServer(e.muted_chat_ids);
      reconcileFromServer(e.total, e.per_chat);
    });

    offMsgLastRow = window.AppRealtime.on('messenger_last_row', '', (e) => {
      const chatId = String(e.chat_id);
      const active = isActiveChatFn(chatId);
      const fromOther = e.sender_id && window.CURRENT_USER_ID
        ? (String(e.sender_id) !== String(window.CURRENT_USER_ID))
        : true;

      const eventMuted = (e.muted === true || e.muted === 1 || e.muted === '1');
      const muted = eventMuted || isMuted(chatId);

      if (active) return markRead(chatId);
      if (!muted && fromOther) bumpChatUnread(chatId, +1);
    });

    // offMsgLastRow = window.AppRealtime.on('messenger_last_row', '', (e) => {
    //   const chatId = String(e.chat_id);
    //   const active = isActiveChatFn(chatId);
    //   const allow  = shouldCountFn(e) !== false;
    //   const fromOther = e.sender_id && window.CURRENT_USER_ID
    //     ? (String(e.sender_id) !== String(window.CURRENT_USER_ID))
    //     : true;
    //
    //   if (active) return markRead(chatId);
    //   if (fromOther && allow) bumpChatUnread(chatId, +1);
    // });

    offMuteState = window.AppRealtime.on('mute_state', '', () => {
      loadUnreadCounts({ force: true });
    });

  };

  tryWire();
}


/**
 * Cleanly unhook from the websocket bus.
 * Call this when tearing down a page or hot-reloading.
 */
export function unwireBadgesRealtime() {
  if (!wired) return;
  wired = false;

  try { offBadgeUpdate && offBadgeUpdate(); } catch {}
  try { offMsgLastRow && offMsgLastRow(); } catch {}
  try { offMuteState && offMuteState(); } catch {}

  offBadgeUpdate = null;
  offMsgLastRow = null;
  offMuteState = null;
}

/* --------- optional: expose globally for non-ESM callers --------- */
const Badges = {
  registerGlobalBadge,
  getTotalUnread, getChatUnread,
  setGlobalUnread, setChatUnread, bumpChatUnread,
  markRead, loadUnreadCounts,
  wireBadgesRealtime, unwireBadgesRealtime, bootBadges,
};

if (typeof window !== 'undefined') window.Badges = Badges;

export default Badges;





