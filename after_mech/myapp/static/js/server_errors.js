
export function clearServerErrors () {
  const error_div = document.querySelector('#error_div');
  if (!error_div) return;
  error_div.innerHTML = '';
  error_div.classList.remove('show');
  error_div.classList.add('hide');
};

export function showErrorBanner (msg) {
  const error_div = document.querySelector('#error_div');
  error_div.classList.remove('hide');
  error_div.classList.add('show');
  error_div.classList.add('fade_in');
  let error = document.createElement('p');
  error.textContent = msg;
  error.style.opacity = 0;
  error.classList.add('fade_in');
  error_div.appendChild(error);
  requestAnimationFrame(() => {
      error.classList.add('show');
    });
}
