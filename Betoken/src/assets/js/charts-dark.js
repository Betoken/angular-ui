//
// charts-dark.js
// Theme module
//

'use strict';

(function() {

  //
  // Variables
  //

  var colors = {
    gray: {
      300: '#E3EBF6',
      600: '#95AAC9',
      700: '#6E84A3',
      800: '#152E4D',
      900: '#283E59'
    },
    primary: {
      100: '#D2DDEC',
      300: '#A6C5F7',
      700: '#2C7BE5',
    },
    black: '#12263F',
    white: '#FFFFFF',
    transparent: 'transparent',
  };

  var config = {
    colorScheme: ( localStorage.getItem('dashkitColorScheme') ) ? localStorage.getItem('dashkitColorScheme') : 'light'
  };


  //
  // Functions
  //

  function globalOptions() {

    // Global
    Chart.defaults.global.defaultColor = colors.gray[700];
    Chart.defaults.global.defaultFontColor = colors.gray[700];

    // Arc
    Chart.defaults.global.elements.arc.borderColor = colors.gray[800];
    Chart.defaults.global.elements.arc.hoverBorderColor = colors.gray[800];

    // yAxes
    Chart.scaleService.updateScaleDefaults('linear', {
      gridLines: {
        borderDash: [2],
        borderDashOffset: [2],
        color: colors.gray[900],
        drawBorder: false,
        drawTicks: false,
        zeroLineColor: colors.gray[900],
        zeroLineBorderDash: [2],
        zeroLineBorderDashOffset: [2]
      },
      ticks: {
        beginAtZero: true,
        padding: 10,
        callback: function(value) {
          if ( !(value % 10) ) {
            return value
          }
        }
      }
    });
  }


  //
  // Events
  //

  if (typeof Chart !== 'undefined') {
    if (typeof demoMode == 'undefined') {
      globalOptions();
    } else {
      if (demoMode && config.colorScheme == 'dark') {
        globalOptions();
      }
    }
  }

})();