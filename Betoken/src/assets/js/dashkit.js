//
// Plugin instantiation (optional) ==================================
//

'use strict';

// Header
//
// Header card chart

var Header = (function() {

  //
  // Variables
  //

  var $headerChart = $('#roi-chart');


  //
  // Methods
  //

  function init($chart) {

    // Create chart
    var headerChart = new Chart($chart, {
      type: 'line',
      options: {
        scales: {
          yAxes: [{
            gridLines: {
              color: ThemeCharts.colors.gray[900],
              zeroLineColor: ThemeCharts.colors.gray[900]
            },
            ticks: {
              callback: function(value) {
                if ( !(value % 10) ) {
                  return '$' + value + 'k';
                }
              }
            }
          }]
        },
        tooltips: {
          callbacks: {
            label: function(item, data) {
              var label = data.datasets[item.datasetIndex].label || '';
              var yLabel = item.yLabel;
              var content = '';

              if (data.datasets.length > 1) {
                content += '<span class="popover-body-label mr-auto">' + label + '</span>';
              }

              content += '<span class="popover-body-value">$' + yLabel + 'k</span>';
              return content;
            }
          }
        }
      },
      datasets: [
          {
              label: 'Betoken',
              borderColor: '#22c88a',
              backgroundColor: '#22c88a',
              fill: false,
              data: id === 0 ? betokenROIList : cumBetokenROIList
          }
      ]
    });

    // Save to jQuery object
    $chart.data('chart', headerChart);

  };


  //
  // Events
  //

  if ($headerChart.length) {
    init($headerChart);
  }

})();
