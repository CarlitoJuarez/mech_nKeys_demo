import { show_smth, hide_smth } from '../show_hide.js'

document.addEventListener("DOMContentLoaded", function() {
  const login_form = document.getElementById('index_login_form');
  const terms_and_conditions_form = document.getElementById('index_terms_and_conditions');
  const register_form = document.getElementById('index_register_form');
  const password_form = document.getElementById('index_password_form');
  const password_reset_form = document.getElementById('password_reset_form');
  const to_login = document.querySelector('.to_login');
  let error_div = document.getElementById('error_div');

  const send_verification_link_btn = document.getElementById('send_verification_link_btn');
  const login_btn = document.getElementById('login_submit');


  function getCSRFfromForm(form) {
    const el = form.querySelector('input[name="csrfmiddlewaretoken"]');
    return el? el.value : null;
  }

  function showErrors(errors) {
    error_div = document.getElementById('error_div');
    error_div.innerHTML = '';
    errors.forEach(error => {
      const p = document.createElement('p');
      p.textContent = error;
      p.style.opacity = 0;
      error_div.appendChild(p);
      error_div.classList.remove('hide');
      error_div.classList.add('fade_in');
      p.classList.add('fade_in');
      requestAnimationFrame(() => {
        error_div.classList.add('show');
        p.classList.add('show');
      });
    });
  }


  async function postForm(form) {
    const form_data = new FormData(form);
    const csrf_token = getCSRFfromForm(form);
    const url = form.action || window.location.href;

    const res = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Accept": 'application/json',
        "X-CSRFToken": csrf_token,
      },
      body: form_data,
    });

    const ct = (res.headers.get("content-type") || "").toLowerCase();

    if (!ct.includes("application/json")) {
      const text = await res.text();
      throw new Error(`Expected JSON, got ${res.status} ${ct || "unknown"}: ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    if (res.status === 429){
      data.false = true;
      data.errors = ["Too many login attempts. Try again later."];
    }
    return data;
  }


  function withInFlightLock(handler) {
    let inFlight = false;

    return async function(event) {
      event.preventDefault();
      if (inFlight) return;          // ignore double submit
      inFlight = true;

      try {
        await handler(event);
      } finally {
        inFlight = false;
      }
    };
  }

  function flattenDjangoErrors(errs) {
    // errs from get_json_data(): {field: [{message, code}, ...], ...}
    const out = [];
    if (!errs || typeof errs !== 'object') return out;
    for (const items of Object.values(errs)) {
      if (!Array.isArray(items)) continue;
      for (const it of items) {
        if (it && typeof it === 'object' && it.message) out.push(it.message);
        else out.push(String(it));
      }
    }
    return out;
  }

  password_form.addEventListener("submit", withInFlightLock(async () => {
    error_div.innerHTML = '';

    const data = await postForm(password_form);

    if (data.ok) {
      showErrors([data.detail || "If the email exists, a reset link has been sent."]);
      if (to_login) to_login.click(); // bounce back to login UI
    } else {
      // console.log("show Errors");
      showErrors(data.errors || ["Password reset failed."]);
    }
  }));


  if (password_reset_form) {
    password_reset_form.addEventListener("submit", withInFlightLock(async () => {
      error_div.innerHTML = '';

      try {
        const data = await postForm(password_reset_form);

        if (data.ok) {
          show_smth(login_form);
          setTimeout(() => login_form.querySelector('input[type="text"]').focus(), 20);
          hide_smth(password_reset_form);
          return;
        }

        // data.errors can be {field:[{message,code}]} OR ["msg","msg"]
        if (Array.isArray(data.errors)) {
          showErrors(data.errors);
        } else {
          const msgs = flattenDjangoErrors(data.errors);
          showErrors(msgs.length ? msgs : ["Password reset failed."]);
        }
      } catch (e) {
        showErrors([String(e.message || e)]);
      }
    }));
  }


terms_and_conditions_form.addEventListener("submit", withInFlightLock(async (e) => {
  e.preventDefault();
  e.stopPropagation();

  login_form.consent.value = "True";

  try {
    const data = await postForm(login_form);

    if (data.ok) {
      window.location.href = data.redirect || "/home";
      return;
    }

    // if server still says no consent or other errors
    if (data.detail === "no_consent") {
      showErrors(data.errors || ["Please accept terms to continue."]);
      return;
    }

    showErrors(data.errors || ["Login failed."]);
  } catch (err) {
    showErrors([String(err.message || err)]);
  }
}));


login_form.addEventListener("submit", withInFlightLock(async () => {
  error_div.innerHTML = '';

  try {
    const data = await postForm(login_form);

    if (data.detail === 'no_consent') {
      hide_smth(login_form);
      show_smth(terms_and_conditions_form);
      showErrors(data.errors || ["Login failed."]);
      return;
    }

    if (data.ok) {
      window.location.href = "/home";
      return;
    }


    if (data.status === 429) {
        showErrors(["Too many requests"]);
    }

    showErrors(data.errors || ["Login failed."]);
    if (data.code === "verification_email") {
        const height_val = login_form.getBoundingClientRect().height;
        login_form.style.height = `${height_val}px`;

        hide_smth(login_btn);
        setTimeout(() => show_smth(send_verification_link_btn), 400);
        setTimeout(() => login_form.style.height = 'unset', 420);
    }
  } catch (e) {
    showErrors([String(e.message || e)]);
  }
}));

  send_verification_link_btn.addEventListener('click', withInFlightLock(async () => {
    error_div.innerHTML = '';
    let csrf_token = getCSRFfromForm(login_form);
    console.log([...new FormData(login_form).entries()]);
    const form_data = new FormData(login_form);

    const res = await fetch('/resend_verification_email', {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Accept": 'application/json',
        "X-CSRFToken": csrf_token,
      },
      body: form_data,
    });

    const data = await res.json();
    if (data.ok) {
      let errors = ["Verification link has been sent."];
      showErrors(errors);
      hide_smth(send_verification_link_btn);
      show_smth(login_btn);
    } else {
      showErrors(data.errors);
    }

  }));


  register_form.addEventListener("submit", withInFlightLock(async () => {
    error_div.innerHTML = '';

    const data = await postForm(register_form);

    if (data.ok) {
      showErrors(["Please verify your email."]);
      to_login.click();
    } else {
      showErrors(data.errors || ["Registration failed."]);
    }
  }));


});
