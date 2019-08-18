//
// list.js
// Theme module
//

'use strict';

(function() {

  //
  // Variables
  //

  var toggle = document.querySelectorAll('[data-toggle="lists"]');
  var toggleSort = document.querySelectorAll('[data-toggle="lists"] [data-sort]');


  //
  // Functions
  //

  function init(el) {
    var options = el.dataset.options;
        options = options ? JSON.parse(options) : {};

    new List(el, options);
  }


  //
  // Events
  //

  if (typeof List !== 'undefined') {

    if (toggle) {
      [].forEach.call(toggle, function(el) {
        init(el);
      });
    }

    if (toggleSort) {
      [].forEach.call(toggleSort, function(el) {
        el.addEventListener('click', function(e) {
          e.preventDefault();
        });
      });
    }
  }

})();