//
// dropdowns.js
// Theme module
//

'use strict';

(function() {

  //
  // Variables
  //

  var dropdown = document.querySelectorAll('.dropup, .dropright, .dropdown, .dropleft');
  var dropdownSubmenuToggle = document.querySelectorAll('.dropdown-menu .dropdown-toggle');


  //
  // Functions
  //

  function toggleSubmenu(el) {
    var dropdownMenu = el.parentElement.querySelector('.dropdown-menu');
    var dropdownMenuSiblings = el.closest('.dropdown-menu').querySelectorAll('.dropdown-menu');

    [].forEach.call(dropdownMenuSiblings, function(el) {
      if (el !== dropdownMenu) {
        el.classList.remove('show');
      }
    });

    dropdownMenu.classList.toggle('show');
  }

  function hideSubmenu(el) {
    var dropdownSubmenus = el.querySelectorAll('.dropdown-menu');

    if (dropdownSubmenus) {
      [].forEach.call(dropdownSubmenus, function(el) {
        el.classList.remove('show');
      });
    }
  }


  //
  // Events
  //

  if (dropdownSubmenuToggle) {
    [].forEach.call(dropdownSubmenuToggle, function(el) {
      el.addEventListener('click', function(e) {
        e.preventDefault();
        toggleSubmenu(el);
        e.stopPropagation();
      });
    });
  }

  $(dropdown).on('hide.bs.dropdown', function() {
    hideSubmenu(this);
  });

})();