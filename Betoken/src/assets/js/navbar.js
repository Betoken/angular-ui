//
// navbar.js
// Theme module
//

'use strict';

(function() {

  //
  // Variables
  //

  var navbarCollapse = document.querySelectorAll('.navbar-nav .collapse');


  //
  // Functions
  //

  function toggleAccordion(el) {
    var collapses = el.closest('.navbar-nav, .navbar-nav .nav').querySelectorAll('.collapse');

    [].forEach.call(collapses, function(currentEl) {
      if (currentEl !== el) {
        $(currentEl).collapse('hide');
      }
    });
  }


  //
  // Events
  //

  $(navbarCollapse).on('show.bs.collapse', function() {
    toggleAccordion(this);
  });

})();