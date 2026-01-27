import { getAuthState } from './session.js';

window.AppRealtimeReady = (async function () {

  // CHECK IF USER IS AUTHENTICATED
  const is_auth = await getAuthState();
  if (!is_auth.authenticated) return null;

  if (window.AppRealtime) return window.AppRealtime; // singleton


  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const wsUrl = `${proto}://${window.location.hostname}:8001/ws/`;

  const state = {
    ws: null,
    groups: new Set(),               // "chat_42", "post_99", "feed"
    handlers: new Map(),             // key: `${type}|${topic}` -> [fn]
    backoff: 500,
  };

  function key(type, topic) { return `${type}|${topic || ""}`; }

  function on(type, topicOrFn, maybeFn) {
    const topic = (typeof topicOrFn === "function") ? "" : String(topicOrFn || "");
    const fn = (typeof topicOrFn === "function") ? topicOrFn : maybeFn;
    const k = key(type, topic);
    if (!state.handlers.has(k)) state.handlers.set(k, []);
    state.handlers.get(k).push(fn);
    return () => off(type, topic, fn);
  }

  function off(type, topic, fn) {
    const k = key(type, topic || "");
    const arr = state.handlers.get(k) || [];
    const i = arr.indexOf(fn);
    if (i >= 0) arr.splice(i, 1);
  }

  function emit(type, payload) {
    const topic = payload.chat_id || payload.post_id || payload.group || "";
    const arr = [
      ...(state.handlers.get(key(type, topic)) || []),
      ...(state.handlers.get(key(type, "")) || []),
    ];
    for (const fn of arr) { try { fn(payload); } catch (e) {} }
  }

  function subscribe(group) {
    state.groups.add(group);
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({ action: "subscribe", group }));
    }
  }

  function unsubscribe(group) {
    state.groups.delete(group);
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({ action: "unsubscribe", group }));
    }
  }

  function connect() {
    const ws = new WebSocket(wsUrl.toString());
    state.ws = ws;

    ws.onopen = () => {
      for (const g of state.groups) {
        ws.send(JSON.stringify({ action: "subscribe", group: g }));
      }
      state.backoff = 500;
      // optional heartbeat
      if (state.pingId) clearInterval(state.pingId);          // <-- clear old
      state.pingId = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ action: "ping" }));
      }, 30000);
    };

    ws.onmessage = (evt) => {
      let msg; try { msg = JSON.parse(evt.data); } catch { return; }
      if (!msg || !msg.type) return;
      emit(msg.type, msg);
    };

    ws.onclose = (e) => {
      console.log("WS closed", { code: e.code, reason: e.reason, wasClean: e.wasClean });
      // const d = Math.min(state.backoff, 8000);
      // setTimeout(connect, d);
      // state.backoff = d * 2;
    };
    ws.onerror = () => { try { ws.close(); } catch {} };
  }

  connect();

  let api = { on, off, subscribe, unsubscribe };

  window.AppRealtime = api;

  return api;

})();
