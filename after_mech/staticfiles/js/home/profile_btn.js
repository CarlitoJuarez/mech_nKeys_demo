document.addEventListener('DOMContentLoaded', () => {

  let profileBtns = document.querySelectorAll('.search_profile_btn');
  profileBtns.forEach((elem) => {
    elem.addEventListener('click', function () {
      this.style.opacity = '0';
      setTimeout(() => window.location.href = `/profile/${this.value}`, 200);
    });
  });

});
