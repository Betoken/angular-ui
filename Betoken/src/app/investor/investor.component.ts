import { Component, OnInit } from '@angular/core';
import { AppComponent } from '../app.component';
import { Router } from '@angular/router';
import BigNumber from 'bignumber.js';
import { isUndefined } from 'util';
import { Chart } from 'chart.js';

import { } from 'jquery';
declare var $: any;

import {
  user, timer, stats, loading, tokens, refresh_actions, investor_actions
} from '../../betokenjs/helpers';

@Component({
  selector: 'app-investor',
  templateUrl: './investor.component.html'
})
export class InvestorComponent implements OnInit {
  sharesPrice: BigNumber;
  avgMonthReturn: BigNumber;
  currMoROI: BigNumber;
  AUM: BigNumber;
  sortinoRatio: BigNumber;
  standardDeviation: BigNumber;
  tokenData: Array<Object>;
  
  sharesBalance: BigNumber;
  investmentBalance: BigNumber;
  
  buySharesAmount: BigNumber;
  buyTokenAmount: BigNumber;
  sellSharesAmount: BigNumber;
  sellTokenAmount: BigNumber;
  
  hasDrawnChart: boolean;
  performanceChart: any;
  
  buyStep: Number;
  sellStep: Number;
  days: Number;
  hours: Number;
  minutes: Number;
  seconds: Number;
  phase: Number;
  
  checkboxes: Array<boolean>;
  selectedTokenSymbol: String;
  selectedTokenBalance: BigNumber;
  transactionId: String;
  continueEnabled: Boolean;

  depositWithdrawHistory: Array<Object>;
  
  constructor(private ms: AppComponent, private route: Router) {
    this.sharesPrice = new BigNumber(0);
    this.avgMonthReturn = new BigNumber(0);
    this.currMoROI = new BigNumber(0);
    this.AUM = new BigNumber(0);
    this.sortinoRatio = new BigNumber(0);
    this.standardDeviation = new BigNumber(0);
    this.tokenData = new Array<Object>();
    
    this.sharesBalance = new BigNumber(0);
    this.investmentBalance = new BigNumber(0);
    
    this.buySharesAmount = new BigNumber(0);
    this.buyTokenAmount = new BigNumber(0);
    this.sellSharesAmount = new BigNumber(0);
    this.sellTokenAmount = new BigNumber(0);
    
    this.hasDrawnChart = false;
    
    this.buyStep = 0;
    this.sellStep = 0;
    this.days = 0;
    this.hours = 0;
    this.minutes = 0;
    this.seconds = 0;
    this.phase = 0;
    
    this.checkboxes = [false, false, false];
    this.selectedTokenSymbol = 'DAI';
    this.selectedTokenBalance = new BigNumber(0);
    this.transactionId = '';
    this.continueEnabled = false;

    this.depositWithdrawHistory = new Array<Object>();
  }
  
  ngOnInit() {
    this.tokenData = tokens.token_data().get();
    this.selectedTokenSymbol = this.tokenData[0]['symbol'];
    this.depositWithdrawHistory = user.deposit_withdraw_history().get();
    this.refreshDisplay();
    $('[data-toggle="tooltip"]').tooltip();
    $('#modalInvestorBuy').on('hidden.bs.modal', () => {
      this.resetModals();
    });
    $('#modalInvestorSell').on('hidden.bs.modal', () => {
      this.resetModals();
    });
  }

  async refresh() {
    await refresh_actions.records();
    await refresh_actions.stats();
    this.depositWithdrawHistory = user.deposit_withdraw_history().get();
    this.refreshDisplay();
  }
  
  refreshDisplay() {
    const NUM_DECIMALS = 4;
    
    this.avgMonthReturn = stats.avg_roi().toFormat(NUM_DECIMALS);
    this.currMoROI = stats.cycle_roi().toFormat(NUM_DECIMALS);
    this.AUM = stats.total_funds().toFormat(NUM_DECIMALS);
    
    this.sharesBalance = user.shares_balance();
    this.investmentBalance = user.investment_balance();
    this.sharesPrice = stats.shares_price();
    if (this.sharesPrice.eq(0)) {
      this.sharesPrice = new BigNumber(1);
    }
    
    this.days = timer.day();
    this.hours = timer.hour();
    this.minutes = timer.minute();
    this.seconds = timer.second();
    this.phase = timer.phase();
    
    this.getTokenBalance(this.selectedTokenSymbol);
    
    if (stats.raw_roi_data().length > 0 && !this.hasDrawnChart) {
      this.drawChart();
    }
  }

  refreshBuyOrderDetails(val) {
    this.buyTokenAmount = new BigNumber(val);
    if (!this.buyTokenAmount.isNaN()) {
      this.buySharesAmount = this.buyTokenAmount.times(this.assetSymbolToPrice(this.selectedTokenSymbol)).div(this.sharesPrice);
    }
  }
  
  refreshSellOrderDetails(val) {
    this.sellSharesAmount = new BigNumber(val);
    if (!this.sellSharesAmount.isNaN()) {
      this.sellTokenAmount = this.sellSharesAmount.times(this.sharesPrice).div(this.assetSymbolToPrice(this.selectedTokenSymbol));
    }
  }

  maxBuyAmount() {
    $('#sharesAmountToBuy').val(this.selectedTokenBalance.toString());
    this.refreshBuyOrderDetails(this.selectedTokenBalance);
    this.continueEnabled = true;
  }

  maxSellAmount() {
    $('#sharesAmountToSell').val(this.sharesBalance.toString());
    this.refreshSellOrderDetails(this.sharesBalance);
    this.continueEnabled = true;
  }

  selectBuyToken(value) {
    this.selectedTokenSymbol = value;
    this.getTokenBalance(this.selectedTokenSymbol);
    $('#sharesAmountToBuy').val('0');
    this.refreshBuyOrderDetails(0);
  }

  selectSellToken(tokenIndex) {
    this.selectedTokenSymbol = this.tokenData[tokenIndex]['symbol'];
    this.refreshSellOrderDetails(this.sellSharesAmount);
  }
  
  isLoading() {
    return loading.records();
  }
  
  resetModals() {
    this.buyStep = 0;
    this.sellStep = 0;
    this.selectedTokenSymbol = this.tokenData[0]['symbol'];
    this.checkboxes = [false, false, false];
    this.continueEnabled = false;
  }
  
  assetSymbolToPrice(symbol) {
    return tokens.asset_symbol_to_price(symbol);
  }
  
  getTokenName(token) {
    let result = tokens.asset_symbol_to_name(token);
    if (isUndefined(result)) {
      return '';
    }
    return result;
  }
  
  getTokenLogoUrl(token) {
    let result = tokens.asset_symbol_to_logo_url(token);
    if (isUndefined(result)) {
      return '';
    }
    return result;
  }
  
  async getTokenBalance(token) {
    this.selectedTokenBalance = await user.token_balance(token);
  }
  
  deposit() {
    this.buyStep = 2;
    var payAmount = this.buyTokenAmount;
    let pending = (txHash) => {
      if (this.buyStep == 2) {
        this.transactionId = txHash;
        this.buyStep = 3;
      }
    };
    let confirm = () => {
      if (this.buyStep == 3) {
        this.buyStep = 4;
      }
      this.refresh();
    };
    switch (this.selectedTokenSymbol) {
      case 'ETH':
        investor_actions.depositETH(payAmount, pending, confirm);
        break;
      case 'DAI':
        investor_actions.depositDAI(payAmount, pending, confirm);
        break;
      default:
        investor_actions.depositToken(payAmount, this.selectedTokenSymbol, pending, confirm);
        break;
    }
  }
  
  sell() {
    this.sellStep = 1;
    var sellAmount = this.sellSharesAmount.times(this.sharesPrice);
    let pending = (txHash) => {
      if (this.sellStep == 1) {
        this.transactionId = txHash;
        this.sellStep = 2;
      }
    };
    let confirm = () => {
      if (this.sellStep == 2) {
        this.sellStep = 3;
      }
      this.refresh();
    };
    switch (this.selectedTokenSymbol) {
      case 'ETH':
        investor_actions.withdrawETH(sellAmount, pending, confirm);
        break;
      case 'DAI':
        investor_actions.withdrawDAI(sellAmount, pending, confirm);
        break;
      default:
        investor_actions.withdrawToken(sellAmount, this.selectedTokenSymbol, pending, confirm);
        break;
    }
  }
  
  agreementsChecked() {
    for (var checked of this.checkboxes) {
      if (!checked) {
        return false;
      }
    }
    return true;
  }
  
  drawChart = () => {
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
    let calcMean = function(list) {
      return list.reduce(function(accumulator, curr) {
        return new BigNumber(accumulator).plus(curr);
      }).div(list.length);
    };
    let calcSampleStd = function(list) {
      var mean, sampleStd, sampleVar;
      mean = calcMean(list);
      sampleVar = list.reduce(function(accumulator, curr) {
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
        timestamps[i].end = timestamps[i+1].start - phaseLengths[0];
        timestamps[i].start = timestamps[i].end - phaseLengths[1];
      }
      
      let MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      
      var timestampStrs = [];
      for (var i = 0; i < timestamps.length; i++) {
        timestampStrs.push(new Date(timestamps[i].start * 1e3).toLocaleDateString());
      }
      timestampStrs.push(new Date(timestamps[timestamps.length - 1].end * 1e3).toLocaleDateString());
      
      var xLabels = [];
      for (var i = 0; i < timestamps.length; i++) {
        var date = new Date(timestamps[i].start * 1e3);
        var formattedString = `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
        xLabels.push(formattedString);
      }
      xLabels.push("Now");
      
      // draw chart
      if (!this.hasDrawnChart) {
        const canvas: any = document.getElementById('roi-chart');
        const ctx = canvas.getContext('2d');
        var gradientFill = ctx.createLinearGradient(0, 0, 0, 200);
        gradientFill.addColorStop(0, 'rgba(44, 123, 229, 0.5)');
        gradientFill.addColorStop(0.5, 'rgba(44, 123, 229, 0.25)');
        gradientFill.addColorStop(1, 'rgba(44, 123, 229, 0)');
        
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
        
        var colorScheme = ( getComputedStyle(document.body).backgroundColor == 'rgb(249, 251, 253)' ) ? 'light' : 'dark';
        Chart.defaults.global.defaultFontColor = colors.gray[300];
        this.performanceChart = new Chart(ctx, {
          
          type: 'line',
          data: {
            labels: xLabels,
            datasets: [
              {
                label: 'Betoken Share BTKS',
                borderColor: '#2c7be5',
                fill: true,
                backgroundColor: gradientFill,
                data: cumBetokenROIList
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
                  callback: function(value, index, values) {
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
                borderColor: ( colorScheme == 'dark' ) ? colors.gray[800] : colors.white,
                borderWidth: 4
              }
            },
            tooltips: {
              enabled: false,
              mode: 'index',
              intersect: false,
              custom: function(model) {
                
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
                  titleLines.forEach(function(title) {
                    html += '<h3 class="popover-header text-center">' + title + '</h3>';
                  });
                  
                  // Add body
                  bodyLines.forEach(function(body, i) {
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
                  'left':  left + 'px',
                  'display': 'block',
                });
                
              },
              callbacks: {
                label: function(item, data) {
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
        this.performanceChart.data.datasets[0].data = cumBetokenROIList;
        this.performanceChart.data.labels = xLabels;
        this.performanceChart.update();
      }
      
      this.hasDrawnChart = true;
    }
  }
  