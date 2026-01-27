

function debounce(func, timeout = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
}

export const hide_smth = function(el, time) {
  if (time)
    el.style.transition = `opacity .${time}s ease`;
  else
    el.style.transition = `opacity .2s ease`;
  el.style.opacity = '0';
  el.classList.remove('show');
  if (time) {
    setTimeout(() => el.classList.add('hide'), time);
  } else {
    setTimeout(() => el.classList.add('hide'), 200);
  }
};

export const show_smth = function(el, time) {
  if (time) {
    setTimeout(() => {
      el.classList.remove('hide');
      el.classList.add('show');
      setTimeout(() => el.style.opacity = '1', 20);
    }, time);
  }
  else {
    setTimeout(() => {
      el.classList.remove('hide');
      el.classList.add('show');
      setTimeout(() => el.style.opacity = '1', 20);
    }, 20)
  }
};


export const click_hide_smth = debounce((el) => {
  el.style.opacity = '0';
  el.classList.remove('show');
  setTimeout(() => el.classList.add('hide'), 200);
});

export const click_show_smth = debounce((el) => {
  el.classList.remove('hide');
  el.classList.add('show');
  setTimeout(() => el.style.opacity = '1', 20);
});


