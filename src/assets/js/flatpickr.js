//
// flatpickr.js
// Theme module
//

'use strict';

(function() {

  //
  // Variables
  //

  var toggle = document.querySelectorAll('[data-toggle="flatpickr"]');


  //
  // Functions
  //

  function init(el) {
    var options = el.dataset.options;
        options = options ? JSON.parse(options) : {};

    flatpickr(el, options);
  }


  //
  // Events
  //

  if (typeof flatpickr !== 'undefined' && toggle) {
    [].forEach.call(toggle, function(el) {
      init(el);
    });
  }

})();