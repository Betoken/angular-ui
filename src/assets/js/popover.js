//
// popover.js
// Theme module
//

'use strict';

(function() {

  //
  // Variables
  //

  var toggle = document.querySelectorAll('[data-toggle="popover"]');


  //
  // Functions
  //

  function init(toggle) {
    $(toggle).popover();
  }


  //
  // Events
  //

  if (toggle) {
    init(toggle);
  }
  
})();