//
// demo.js
// Theme module
//

'use strict';

var demoMode = (function() {

  //
  // Variables
  //

  var form = document.querySelector('#demoForm');
  var topnav = document.querySelector('#topnav');
  var topbar = document.querySelector('#topbar');
  var sidebar = document.querySelector('#sidebar');
  var sidebarSmall = document.querySelector('#sidebarSmall');
  var sidebarUser = document.querySelector('#sidebarUser');
  var sidebarUserSmall = document.querySelector('#sidebarSmallUser');
  var sidebarSizeContainer = document.querySelector('#sidebarSizeContainer')
  var navPositionToggle = document.querySelectorAll('input[name="navPosition"]');
  var containers = document.querySelectorAll('[class^="container"]');
  var stylesheets = document.querySelectorAll('#stylesheetLight, #stylesheetDark');
  var stylesheetLight = document.querySelector('#stylesheetLight');
  var stylesheetDark = document.querySelector('#stylesheetDark');

  var config = {
    colorScheme: (localStorage.getItem('dashkitColorScheme')) ? localStorage.getItem('dashkitColorScheme') : 'light',
    navPosition: (localStorage.getItem('dashkitNavPosition')) ? localStorage.getItem('dashkitNavPosition') : 'sidenav',
    navColor: (localStorage.getItem('dashkitNavColor')) ? localStorage.getItem('dashkitNavColor') : 'default',
    sidebarSize: (localStorage.getItem('dashkitSidebarSize')) ? localStorage.getItem('dashkitSidebarSize') : 'base'
  }


  //
  // Functions
  //

  function parseUrl() {
    var search = window.location.search.substring(1);
    var params = search.split('&');

    for (var i = 0; i < params.length; i++) {
      var arr = params[i].split('=');
      var prop = arr[0];
      var val = arr[1];

      if (prop == 'colorScheme' || prop == 'navPosition' || prop == 'navColor' || prop == 'sidebarSize') {

        // Save to localStorage
        localStorage.setItem('dashkit' + prop.charAt(0).toUpperCase() + prop.slice(1), val);

        // Update local variables
        config[prop] = val;
      }
    }
  }

  function toggleColorScheme(colorScheme) {
    if (colorScheme == 'light') {
      stylesheetLight.disabled = false;
      stylesheetDark.disabled = true;
      colorScheme = 'light';
    } else if (colorScheme == 'dark') {
      stylesheetLight.disabled = true;
      stylesheetDark.disabled = false;
      colorScheme = 'dark';
    }
  }

  function toggleNavPosition(navPosition) {
    if (topnav && topbar && sidebar && sidebarSmall && sidebarUser && sidebarUserSmall) {
      if (navPosition == 'topnav') {
        hideNode(topbar);
        hideNode(sidebar);
        hideNode(sidebarSmall);

        for (var i = 0; i < containers.length; i++) {
          containers[i].classList.remove('container-fluid');
          containers[i].classList.add('container');
        }
      } else if (navPosition == 'combo') {
        hideNode(topnav);
        hideNode(sidebarUser);
        hideNode(sidebarUserSmall);

        for (var i = 0; i < containers.length; i++) {
          containers[i].classList.remove('container');
          containers[i].classList.add('container-fluid');
        }
      } else if (navPosition == 'sidenav') {
        hideNode(topnav);
        hideNode(topbar);

        for (var i = 0; i < containers.length; i++) {
          containers[i].classList.remove('container');
          containers[i].classList.add('container-fluid');
        }
      }
    }
  }

  function toggleNavColor(navColor) {
    
    if (sidebar && sidebarSmall && topnav) {

      if (navColor == 'default') {

        // Sidebar
        sidebar.classList.add('navbar-light');

        // Sidebar small
        sidebarSmall.classList.add('navbar-light');

        // Topnav
        topnav.classList.add('navbar-light');

      } else if (navColor == 'inverted') {

        // Sidebar
        sidebar.classList.add('navbar-dark');

        // Sidebar small
        sidebarSmall.classList.add('navbar-dark');

        // Topnav
        topnav.classList.add('navbar-dark');

      } else if (navColor == 'vibrant') {

        // Sidebar
        sidebar.classList.add('navbar-dark', 'navbar-vibrant');

        // Sidebar small
        sidebarSmall.classList.add('navbar-dark', 'navbar-vibrant');

        // Sidebar small
        topnav.classList.add('navbar-dark', 'navbar-vibrant');

      }
    }
  }

  function toggleSidebarSize(sidebarSize) {
    if (sidebarSize == 'base') {
      hideNode(sidebarSmall);
    } else if (sidebarSize == 'small') {
      hideNode(sidebar);
    }
  }

  function toggleFormControls(form, colorScheme, navPosition, navColor, sidebarSize) {
    $(form).find('[name="colorScheme"][value="' + colorScheme + '"]').closest('.btn').button('toggle');
    $(form).find('[name="navPosition"][value="' + navPosition + '"]').closest('.btn').button('toggle');
    $(form).find('[name="navColor"][value="' + navColor + '"]').closest('.btn').button('toggle');
    $(form).find('[name="sidebarSize"][value="' + sidebarSize + '"]').closest('.btn').button('toggle');
  }

  function toggleSidebarSizeCongainer(navPosition) {
    if (navPosition == 'topnav') {
      $(sidebarSizeContainer).collapse('hide');
    } else {
      $(sidebarSizeContainer).collapse('show');
    }
  }

  function submitForm(form) {
    var colorScheme = form.querySelector('[name="colorScheme"]:checked').value;
    var navPosition = form.querySelector('[name="navPosition"]:checked').value;
    var navColor = form.querySelector('[name="navColor"]:checked').value;
    var sidebarSize = form.querySelector('[name="sidebarSize"]:checked').value;

    // Save data to localStorage
    localStorage.setItem('dashkitColorScheme', colorScheme);
    localStorage.setItem('dashkitNavPosition', navPosition);
    localStorage.setItem('dashkitNavColor', navColor);
    localStorage.setItem('dashkitSidebarSize', sidebarSize);

    // Reload page
    window.location = window.location.pathname;
  }

  function hideNode(node) {
    node.setAttribute('style', 'display: none !important');
  }


  //
  // Event
  //

  // Parse url
  parseUrl();

  // Toggle color scheme
  toggleColorScheme(config.colorScheme);

  // Toggle nav position
  toggleNavPosition(config.navPosition);

  // Toggle sidebar color
  toggleNavColor(config.navColor);

  // Toggle sidebar size
  toggleSidebarSize(config.sidebarSize);

  // Toggle form controls
  toggleFormControls(form, config.colorScheme, config.navPosition, config.navColor, config.sidebarSize);

  // Toggle sidebarSize container
  toggleSidebarSizeCongainer(config.navPosition);

  // Enable body
  document.body.style.display = 'block';

  if (form) {

    // Form submitted
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      submitForm(form);
    });

    // Nav position changed
    [].forEach.call(navPositionToggle, function(el) {
      el.parentElement.addEventListener('click', function() {
        var navPosition = el.value;
        toggleSidebarSizeCongainer(navPosition);
      });
    });
  }


  //
  // Return
  //

  return true;

})();