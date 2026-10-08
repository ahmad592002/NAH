/* products.html: cabin range filter */
(function () {
  var btns = [].slice.call(document.querySelectorAll('.pr-filter [data-f]'));
  var cards = [].slice.call(document.querySelectorAll('.pr-cab'));
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      var f = b.getAttribute('data-f');
      btns.forEach(function (x) { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
      cards.forEach(function (c) { c.hidden = f !== 'all' && c.getAttribute('data-cat') !== f; });
    });
  });
})();
