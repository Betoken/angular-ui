import { Component, OnInit } from '@angular/core';
import BigNumber from 'bignumber.js';
import { isUndefined, isNull } from 'util';
import { Chart } from 'chart.js';

declare var $: any;;

import {
  user, timer, tokens, investor_actions
} from '../../betokenjs/helpers';

import { ApolloEnabled } from '../apollo';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';

@Component({
  selector: 'app-investor',
  templateUrl: './investor.component.html'
})
export class InvestorComponent extends ApolloEnabled implements OnInit {
  sharesPrice: BigNumber;
  avgMonthReturn: BigNumber;
  currMoROI: BigNumber;
  AUM: BigNumber;
  maxDrawdown: BigNumber;
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
  sharesPriceHistory: any;
  btcPriceHistory: any;
  ethPriceHistory: any;

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

  errorMsg: String;

  isLoading: Boolean;

  constructor(private apollo: Apollo) {
    super();

    this.sharesPrice = new BigNumber(0);
    this.avgMonthReturn = new BigNumber(0);
    this.currMoROI = new BigNumber(0);
    this.AUM = new BigNumber(0);
    this.maxDrawdown = new BigNumber(0);
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

    this.errorMsg = "";

    this.isLoading = true;
  }

  ngOnInit() {
    $('[data-toggle="tooltip"]').tooltip();
    $('#modalInvestorBuy').on('hidden.bs.modal', () => {
      this.resetModals();
    });
    $('#modalInvestorSell').on('hidden.bs.modal', () => {
      this.resetModals();
    });

    this.tokenData = tokens.token_data();
    this.updateTimer();
    this.getTokenBalance(this.selectedTokenSymbol);
    this.selectedTokenSymbol = this.tokenData[0]['symbol'];
    setInterval(() => this.updateTimer(), 1000);
    this.createQuery();
  }

  createQuery() {
    let userAddress = user.address().toLowerCase();
    this.query = this.apollo
      .watchQuery({
        pollInterval: 300000,
        fetchPolicy: 'cache-and-network',
        query: gql`
          {
            fund(id: "BetokenFund") {
              cyclePhase
              totalFundsAtPhaseStart
              aum
              sharesPrice
              sharesPriceHistory(orderBy: timestamp, orderDirection: asc, first: 1000) {
                timestamp
                value
              }
            }
            investor(id: "${userAddress}") {
              sharesBalance
              depositWithdrawHistory(orderBy: timestamp, orderDirection: desc, first: 1000) {
                timestamp
                isDeposit
                amountInDAI
                txHash
              }
            }
            btcPriceHistory: tokenPrices(where: { tokenSymbol: "WBTC" }, orderBy: timestamp, first: 1000) {
              timestamp
              priceInDAI
            }
            ethPriceHistory: tokenPrices(where: { tokenSymbol: "ETH" }, orderBy: timestamp, first: 1000) {
              timestamp
              priceInDAI
            }
          }
        `
      });
    this.querySubscription = this.query.valueChanges.subscribe((result) => this.handleQuery(result));
  }

  handleQuery({ data, loading }) {
    this.isLoading = loading || isUndefined(loading);

    if (!loading) {
      let fund = data['fund'];
      let investor = data['investor'];

      this.AUM = new BigNumber(fund.aum);
      this.sharesPrice = new BigNumber(fund.sharesPrice);
      this.currMoROI = this.AUM.div(fund.totalFundsAtPhaseStart).minus(1).times(100);
      if (fund.cyclePhase === 'INTERMISSION') {
        this.currMoROI = new BigNumber(0);
      }

      if (!isNull(investor)) {
        this.sharesBalance = new BigNumber(investor.sharesBalance);
        this.depositWithdrawHistory = investor.depositWithdrawHistory;
        this.investmentBalance = this.sharesBalance.times(this.sharesPrice);
      }

      // draw chart
      this.sharesPriceHistory = fund.sharesPriceHistory;
      this.btcPriceHistory = data['btcPriceHistory'];
      this.ethPriceHistory = data['ethPriceHistory'];
      console.log(this.ethPriceHistory);
      this.calcStats();
      this.chartDraw();
    }
  }

  refreshDisplay() {
    this.isLoading = true;
    this.query.refetch().then((result) => this.handleQuery(result));
  }

  updateTimer() {
    this.days = timer.day();
    this.hours = timer.hour();
    this.minutes = timer.minute();
    this.seconds = timer.second();
    this.phase = timer.phase();
  }

  refreshBuyOrderDetails(val) {
    this.buyTokenAmount = new BigNumber(val);
    if (!this.buyTokenAmount.isNaN()) {
      this.buySharesAmount = this.buyTokenAmount.times(this.assetSymbolToPrice(this.selectedTokenSymbol)).div(this.sharesPrice);
    } else {
      this.buyTokenAmount = new BigNumber(0);
      this.buySharesAmount = new BigNumber(0);
    }
  }

  refreshSellOrderDetails(val) {
    this.sellSharesAmount = new BigNumber(val);
    if (!this.sellSharesAmount.isNaN()) {
      this.sellTokenAmount = this.sellSharesAmount.times(this.sharesPrice).div(this.assetSymbolToPrice(this.selectedTokenSymbol));
    } else {
      this.sellSharesAmount = new BigNumber(0);
      this.sellTokenAmount = new BigNumber(0);
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

  resetModals() {
    this.buyStep = 0;
    this.sellStep = 0;
    this.selectedTokenSymbol = this.tokenData[0]['symbol'];
    this.checkboxes = [false, false, false];
    this.continueEnabled = false;
    this.getTokenBalance(this.selectedTokenSymbol);
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
    };
    let error = (e) => {
      if (this.buyStep != 0) {
        this.buyStep = -1;
        this.errorMsg = e.toString();
      }
    }
    switch (this.selectedTokenSymbol) {
      case 'ETH':
        investor_actions.depositETH(payAmount, pending, confirm, error);
        break;
      case 'DAI':
        investor_actions.depositDAI(payAmount, pending, confirm, error);
        break;
      default:
        investor_actions.depositToken(payAmount, this.selectedTokenSymbol, pending, confirm, error);
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
      this.refreshDisplay();
    };
    let error = (e) => {
      if (this.sellStep != 0) {
        this.sellStep = -1;
        this.errorMsg = e.toString();
      }
    }
    switch (this.selectedTokenSymbol) {
      case 'ETH':
        investor_actions.withdrawETH(sellAmount, pending, confirm, error);
        break;
      case 'DAI':
        investor_actions.withdrawDAI(sellAmount, pending, confirm, error);
        break;
      default:
        investor_actions.withdrawToken(sellAmount, this.selectedTokenSymbol, pending, confirm, error);
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

  calcStats() {
    let BONDS_MONTHLY_INTEREST = 2.4662697e-3 // 3% annual interest rate
    let NUM_DECIMALS = 4;
    let sharesPriceList: Array<BigNumber> = this.sharesPriceHistory.map((x) => new BigNumber(x.value).dp(NUM_DECIMALS));

    // calculate stats for Betoken
    let calcMean = function (list) {
      return list.reduce(function (accumulator, curr) {
        return new BigNumber(accumulator).plus(curr);
      }, new BigNumber(0)).div(list.length);
    };
    let calcSampleStd = function (list) {
      var mean, sampleVar;
      mean = calcMean(list);
      sampleVar = list.reduce(function (accumulator, curr) {
        return new BigNumber(accumulator).plus(new BigNumber(curr - mean).pow(2));
      }, new BigNumber(0)).div(list.length - 1);
      return sampleVar.sqrt();
    };
    let calcDownsideStd = (list, minAcceptableRate) => {
      let sampleVar = list.reduce(
        (accumulator, curr) => (new BigNumber(accumulator)).plus(new BigNumber(BigNumber.min(curr - minAcceptableRate, 0)).pow(2))
        , new BigNumber(0)).div(list.length - 1);
      let sampleStd = sampleVar.sqrt();
      return sampleStd;
    }

    // Get cumulative data & calc std
    this.standardDeviation = calcSampleStd(sharesPriceList).dp(NUM_DECIMALS);

    if (sharesPriceList.length > 0) {
      this.avgMonthReturn = this.sharesPrice.div(sharesPriceList[0]).minus(1).times(100);
    }

    // max drawdown
    this.maxDrawdown = new BigNumber(0);
    for (let i = 0; i < sharesPriceList.length; i++) {
      let cumulativeMax = sharesPriceList.slice(0, i + 1).reduce((accumulator, curr) => BigNumber.max(accumulator, curr), new BigNumber(0)); // max of sharesPriceList[:i+1]
      let drawdown = sharesPriceList[i].minus(cumulativeMax).div(cumulativeMax).times(100);
      if (drawdown.lt(this.maxDrawdown)) {
        this.maxDrawdown = drawdown;
      }
    }
  }

  async chartDraw() {
    if (!this.hasDrawnChart) {
      this.hasDrawnChart = true;

      let self = this;
      let NUM_DECIMALS = 4;

      let sharesPriceList = this.sharesPriceHistory.map((x) => new BigNumber(x.value).minus(1).times(100).dp(NUM_DECIMALS));
      sharesPriceList.push(this.sharesPrice.minus(1).times(100).dp(NUM_DECIMALS));

      let btcPriceList = this.btcPriceHistory.map((x) => new BigNumber(x.priceInDAI));
      btcPriceList.push(this.assetSymbolToPrice('WBTC'));
      btcPriceList = btcPriceList.map((x) => x.div(btcPriceList[0]).minus(1).times(100).dp(NUM_DECIMALS));

      let ethPriceList = this.ethPriceHistory.map((x) => new BigNumber(x.priceInDAI));
      ethPriceList.push(this.assetSymbolToPrice('ETH'));
      ethPriceList = ethPriceList.map((x) => x.div(ethPriceList[0]).minus(1).times(100).dp(NUM_DECIMALS));

      let now = new Date();

      const canvas: any = document.getElementById('roi-chart');
      const ctx = canvas.getContext('2d');
      var gradientFill = ctx.createLinearGradient(0, 0, 0, 200);
      gradientFill.addColorStop(0, 'rgba(0, 217, 126, 0.5)');
      gradientFill.addColorStop(0.5, 'rgba(0, 217, 126, 0.25)');
      gradientFill.addColorStop(1, 'rgba(0, 217, 126, 0)');

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

      var colorScheme = (getComputedStyle(document.body).backgroundColor === 'rgb(249, 251, 253)') ? 'light' : 'dark';
      Chart.defaults.global.defaultFontColor = colors.gray[300];
      this.performanceChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: this.sharesPriceHistory.map((x) => this.toDateObject(x.timestamp)).concat([now]),
          datasets: [
            {
              label: 'Betoken',
              borderColor: '#22c88a',
              fill: false,
              data: sharesPriceList
            }
          ]
        },

        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            xAxes: [{
              type: 'time',
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
                beginAtZero: false,
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
                  content += '<span class="popover-body-label mr-auto">' + label + '</span>';
                }

                content += '<span class="popover-body-value">' + yLabel + '%' + '</span>';
                return content;
              }
            },
          }
        }
      });

      // add ETH & BTC prices to chart
      this.performanceChart.data.datasets.push(
        {
          label: 'Ether',
          borderColor: '#8A91B6',
          fill: false,
          data: ethPriceList
        }
      );
      this.performanceChart.data.datasets.push(
        {
          label: 'Bitcoin',
          borderColor: '#FF9500',
          fill: false,
          data: btcPriceList
        }
      );
      this.performanceChart.update();
    }
  }
}
