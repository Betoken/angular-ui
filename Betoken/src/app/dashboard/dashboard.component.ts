import { Component, OnInit } from '@angular/core';
import { BigNumber } from 'bignumber.js';
import { Chart } from 'chart.js';

import { } from 'jquery';
declare var $: any;

import {
  user, timer, stats
} from '../../betokenjs/helpers';

import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { Subscription } from 'apollo-client/util/Observable';

@Component({
  selector: 'app-invest',
  templateUrl: './dashboard.component.html'
})

export class DashboardComponent implements OnInit {
  userRanking: String;
  userValue: BigNumber;
  userROI: BigNumber;
  expectedCommission: BigNumber;
  sharePrice: String;
  avgMonthReturn: String;
  currMoROI: String;
  totalUser: Number;
  AUM: BigNumber;
  sortinoRatio: BigNumber;
  standardDeviation: BigNumber;
  portfolioValueInDAI: BigNumber;

  hasDrawnChart: boolean;
  performanceChart: any;
  chartTabId: Number;
  shouldDrawChart: Boolean;

  private querySubscription: Subscription;

  constructor(private apollo: Apollo) {
    this.userRanking = '';
    this.userValue = new BigNumber(0);
    this.userROI = new BigNumber(0);
    this.expectedCommission = new BigNumber(0);
    this.sharePrice = '';
    this.avgMonthReturn = '';
    this.currMoROI = '';
    this.totalUser = 0;
    this.AUM = new BigNumber(0);
    this.sortinoRatio = new BigNumber(0);
    this.standardDeviation = new BigNumber(0);
    this.portfolioValueInDAI = new BigNumber(0);

    this.hasDrawnChart = false;
    this.chartTabId = 1;
    this.shouldDrawChart = true;
  }

  ngOnInit() {
    this.refreshDisplay();
    $('[data-toggle="tooltip"]').tooltip();
  }

  ngOnDestroy() {
    this.querySubscription.unsubscribe();
  }

  refreshDisplay() {
    const NUM_DECIMALS = 4;

    this.avgMonthReturn = stats.avg_roi().toFormat(NUM_DECIMALS);
    this.currMoROI = stats.cycle_roi().toFormat(NUM_DECIMALS);
    if (!this.hasROIData()) {
      this.shouldDrawChart = false;
    }
    if (this.hasROIData() && !this.hasDrawnChart) {
      this.drawChart(this.chartTabId);
    }

    let userAddress = user.address().toLowerCase();
    this.querySubscription = this.apollo
      .watchQuery({
        query: gql`
          {
            fund(id: "BetokenFund") {
              aum
              kairoTotalSupply
              totalFundsInDAI
              cyclePhase
              cycleTotalCommission
            }
            manager(id: "${userAddress}") {
              kairoBalance
              kairoBalanceWithStake
              baseStake
            }
            managers(orderBy: kairoBalanceWithStake, orderDirection: desc) {
              id
            }
          }
        `
      })
      .valueChanges.subscribe(({ data, loading }) => {
        let fund = data['fund'];
        let manager = data['manager'];
        let managers = data['managers'];

        this.userValue = new BigNumber(manager.kairoBalanceWithStake);
        this.userROI = this.userValue.div(manager.baseStake).minus(1).times(100);
        this.portfolioValueInDAI = this.userValue.div(fund.kairoTotalSupply).times(fund.totalFundsInDAI);
        this.AUM = new BigNumber(fund.aum);
        this.userRanking = managers.findIndex((x) => x.id === userAddress) + 1;
        this.totalUser = managers.length;

        // calculate expected commission
        if (+fund.kairoTotalSupply > 0) {
          if (fund.cyclePhase === 'INTERMISSION') {
            // Actual commission that will be redeemed
            return new BigNumber(manager.kairoBalance).div(fund.kairoTotalSupply).times(fund.cycleTotalCommission);
          }
          // Expected commission based on previous average ROI
          let totalProfit = new BigNumber(fund.aum).minus(fund.totalFundsInDAI);
          totalProfit = BigNumber.max(totalProfit, 0);
          let commission = totalProfit.div(fund.kairoTotalSupply).times(this.userValue).times(user.commission_rate());
          let assetFee = new BigNumber(fund.aum).div(fund.kairoTotalSupply).times(this.userValue).times(user.asset_fee_rate());
          this.expectedCommission = commission.plus(assetFee);
        }
      });
  }

  hasROIData() {
    return stats.raw_roi_data().length > 0;
  }

  switchChartTab(id) {
    if (this.hasROIData() && this.shouldDrawChart) {
      this.chartTabId = id;
      this.drawChart(id);
    }
  }

  drawChart = (id) => {
    let BONDS_MONTHLY_INTEREST = 2.4662697e-3 // 3% annual interest rate
    let NUM_DECIMALS = 4;
    let betokenROIList = stats.raw_roi_data();

    const convertToCumulative = (list) => {
      var tmp = new BigNumber(1);
      var tmpArray = [new BigNumber(0)];
      for (let roi of list) {
        tmp = new BigNumber(roi).div(100).plus(1).times(tmp);
        tmpArray.push(tmp.times(100).minus(100).dp(NUM_DECIMALS));
      }
      return tmpArray;
    }

    // calculate stats for Betoken
    let calcMean = function (list) {
      return list.reduce(function (accumulator, curr) {
        return new BigNumber(accumulator).plus(curr);
      }, new BigNumber(0)).div(list.length);
    };
    let calcSampleStd = function (list) {
      var mean, sampleStd, sampleVar;
      mean = calcMean(list);
      sampleVar = list.reduce(function (accumulator, curr) {
        return new BigNumber(accumulator).plus(new BigNumber(curr - mean).pow(2));
      }, 0).div(list.length - 1);
      return sampleStd = sampleVar.sqrt();
    };
    let calcDownsideStd = (list, minAcceptableRate) => {
      let sampleVar = list.reduce(
        (accumulator, curr) => (new BigNumber(accumulator)).plus(new BigNumber(BigNumber.min(curr - minAcceptableRate, 0)).pow(2))
        , 0).div(list.length - 1);
      let sampleStd = sampleVar.sqrt();
      return sampleStd;
    }

    // Sortino Ratio (against bonds, since inception)
    let meanExcessReturn = calcMean(betokenROIList).minus(BONDS_MONTHLY_INTEREST);
    let excessReturnStd = calcDownsideStd(betokenROIList, BONDS_MONTHLY_INTEREST);
    this.sortinoRatio = meanExcessReturn.div(excessReturnStd).dp(NUM_DECIMALS);

    // Get cumulative data & calc std
    let cumBetokenROIList = convertToCumulative(betokenROIList);
    this.standardDeviation = calcSampleStd(cumBetokenROIList).dp(NUM_DECIMALS);

    // Convert to 4 decimals
    betokenROIList = betokenROIList.map((x) => new BigNumber(x).dp(NUM_DECIMALS));

    // Compute timestamps
    let phase = timer.phase();
    let now = Math.floor(new Date().getTime() / 1000);
    let phaseStart = timer.phase_start_time();
    let phaseLengths = timer.phase_lengths();
    let timestamps = new Array(betokenROIList.length);
    switch (phase) {
      case 0:
        // intermission phase
        // use last cycle's data
        timestamps[timestamps.length - 1] = {
          end: phaseStart,
          start: phaseStart - phaseLengths[1]
        }
        break;
      case 1:
        // manage phase
        // use current data
        timestamps[timestamps.length - 1] = {
          end: now,
          start: phaseStart
        }
        break;
    }
    for (let i = timestamps.length - 2; i >= 0; i--) {
      timestamps[i] = {
        start: 0,
        end: 0
      }
      timestamps[i].end = timestamps[i + 1].start - phaseLengths[0];
      timestamps[i].start = timestamps[i].end - phaseLengths[1];
    }

    let MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    var timestampStrs = [];
    for (var i = 0; i < timestamps.length; i++) {
      timestampStrs.push(new Date(timestamps[i].start * 1e3).toLocaleDateString());
    }
    if (id === 1) {
      timestampStrs.push(new Date(timestamps[timestamps.length - 1].end * 1e3).toLocaleDateString());
    }

    var xLabels = [];
    for (var i = 0; i < timestamps.length; i++) {
      var date = new Date(timestamps[i].start * 1e3);
      var formattedString = `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
      xLabels.push(formattedString);
    }
    if (id === 1) {
      xLabels.push("Now");
    }

    // draw chart
    if (!this.hasDrawnChart) {
      const canvas: any = document.getElementById('roi-chart');
      const ctx = canvas.getContext('2d');
      var gradientFill = ctx.createLinearGradient(0, 0, 0, 200);
      gradientFill.addColorStop(0, 'rgba(0, 217, 126, 0.5)');
      gradientFill.addColorStop(0.5, 'rgba(0, 217, 126, 0.25)');
      gradientFill.addColorStop(1, 'rgba(0, 217, 126, 0)');

      var $toggle = $('[data-toggle="chart"]');

      // Config

      var fonts = {
        base: 'Cerebri Sans'
      }

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

      var colorScheme = (getComputedStyle(document.body).backgroundColor == 'rgb(249, 251, 253)') ? 'light' : 'dark';
      Chart.defaults.global.defaultFontColor = colors.gray[300];
      this.performanceChart = new Chart(ctx, {

        type: 'line',
        data: {
          labels: xLabels,
          datasets: [
            {
              label: 'Betoken',
              borderColor: '#22c88a',
              fill: true,
              backgroundColor: gradientFill,
              data: id === 0 ? betokenROIList : cumBetokenROIList
            }
          ]
        },

        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            xAxes: [{
              gridLines: {
                display: false
              },
              ticks: {
                padding: 20
              },
              maxBarThickness: 10
            }],
            yAxes: [{
              gridLines: {
                display: true,
                borderDash: [2],
                borderDashOffset: [2],
                color: colors.gray[900],
                drawBorder: false,
                drawTicks: false,
                lineWidth: 0,
                zeroLineWidth: 0,
                zeroLineColor: colors.gray[300],
                zeroLineBorderDash: [2],
                zeroLineBorderDashOffset: [2]
              },
              ticks: {
                beginAtZero: true,
                padding: 10,
                callback: function (value, index, values) {
                  return value + '%';
                }
              }
            }]
          },
          defaultColor: colors.primary[100],
          defaultFontColor: colors.primary[100],
          defaultFontFamily: fonts.base,
          defaultFontSize: 16,
          layout: {
            padding: 0
          },
          legend: {
            display: false,
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 16
            }
          },
          elements: {
            point: {
              radius: 0,
              backgroundColor: colors.primary[700]
            },
            line: {
              tension: .4,
              borderWidth: 3,
              borderColor: colors.primary[700],
              backgroundColor: colors.transparent,
              borderCapStyle: 'rounded'
            },
            rectangle: {
              backgroundColor: colors.primary[700]
            },
            arc: {
              backgroundColor: colors.primary[700],
              borderColor: (colorScheme == 'dark') ? colors.gray[800] : colors.white,
              borderWidth: 4
            }
          },
          tooltips: {
            enabled: false,
            mode: 'index',
            intersect: false,
            custom: function (model) {

              // Get tooltip
              var $tooltip = $('#chart-tooltip');

              // Create tooltip on first render
              if (!$tooltip.length) {
                $tooltip = $('<div id="chart-tooltip" class="popover bs-popover-top" role="tooltip"></div>');

                // Append to body
                $('body').append($tooltip);
              }

              // Hide if no tooltip
              if (model.opacity === 0) {
                $tooltip.css('display', 'none');
                return;
              }

              function getBody(bodyItem) {
                return bodyItem.lines;
              }

              // Fill with content
              if (model.body) {
                var titleLines = model.title || [];
                var bodyLines = model.body.map(getBody);
                var html = '';

                // Add arrow
                html += '<div class="arrow"></div>';

                // Add header
                titleLines.forEach(function (title) {
                  html += '<h3 class="popover-header text-center">' + title + '</h3>';
                });

                // Add body
                bodyLines.forEach(function (body, i) {
                  var colors = model.labelColors[i];
                  var styles = 'background-color: ' + colors.borderColor;
                  var indicator = '<span class="popover-body-indicator" style="' + styles + '"></span>';
                  var align = (bodyLines.length > 1) ? 'justify-content-left' : 'justify-content-center';
                  html += '<div class="popover-body d-flex align-items-center ' + align + '">' + indicator + body + '</div>';
                });

                $tooltip.html(html);
              }

              // Get tooltip position
              var $canvas = $(this._chart.canvas);

              var canvasWidth = $canvas.outerWidth();
              var canvasHeight = $canvas.outerHeight();

              var canvasTop = $canvas.offset().top;
              var canvasLeft = $canvas.offset().left;

              var tooltipWidth = $tooltip.outerWidth();
              var tooltipHeight = $tooltip.outerHeight();

              var top = canvasTop + model.caretY - tooltipHeight - 16;
              var left = canvasLeft + model.caretX - tooltipWidth / 2;

              // Display tooltip
              $tooltip.css({
                'top': top + 'px',
                'left': left + 'px',
                'display': 'block',
              });

            },
            callbacks: {
              label: function (item, data) {
                var label = data.datasets[item.datasetIndex].label || '';
                var yLabel = item.yLabel;
                var content = '';

                if (data.datasets.length > 1) {
                  content += '<span class="popover-body-label mr-auto">' + label + '%' + '</span>';
                }

                content += '<span class="popover-body-value">' + yLabel + '%' + '</span>';
                return content;
              }
            },


          }
        }
      });

    } else {
      this.performanceChart.data.datasets[0].data = id === 0 ? betokenROIList : cumBetokenROIList;
      this.performanceChart.data.labels = xLabels;
      this.performanceChart.update();
    }

    this.hasDrawnChart = true;
  }
}
