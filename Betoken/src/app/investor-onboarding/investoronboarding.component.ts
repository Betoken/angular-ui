import { Component, OnInit } from '@angular/core';
import { AppComponent } from '../app.component';
import { Router } from '@angular/router';
import { isUndefined } from 'util';
import BigNumber from 'bignumber.js';

import { } from 'jquery';
declare var $: any;

import {
  user, timer, stats, tokens, investor_actions
} from '../../betokenjs/helpers';

@Component({
  selector: 'app-account',
  templateUrl: './investoronboarding.component.html'
})
export class InvestoronboardingComponent implements OnInit {
  tokenData: any;
  user_address = '0x0';
  errorMsg = '';
  buyStep = 0;
  checkboxes = [false, false, false];
  selectedTokenSymbol = '';
  selectedTokenBalance = new BigNumber(0);
  transactionId = '';
  sharesPrice = new BigNumber(0);
  buySharesAmount = new BigNumber(0);
  buyTokenAmount = new BigNumber(0);
  
  days = 0;
  hours = 0;
  minutes = 0;
  seconds = 0;
  phase = 0;
  
  constructor(private ms: AppComponent, private router: Router) {
  }
  
  ngOnInit() {
    $('[data-toggle="tooltip"]').tooltip();
    $('#modalInvestorBuy').on('hidden.bs.modal', () => {
      this.resetModals();
    });
    this.tokenData = tokens.token_data().get();
    this.selectedTokenSymbol = this.tokenData[0].symbol;
    setInterval(() => {
      this.refreshDisplay();
    }, 100);
  }
  
  refreshDisplay() {
    this.user_address = user.address();
    this.ms.setHeaderSidebarDisplay(!this.checkRouterURL('/start'));
    this.sharesPrice = stats.shares_price();
    
    this.days = timer.day();
    this.hours = timer.hour();
    this.minutes = timer.minute();
    this.seconds = timer.second();
    this.phase = timer.phase();
    
    this.getTokenBalance(this.selectedTokenSymbol);
  }
  
  resetModals() {
    this.buyStep = 0;
    this.selectedTokenSymbol = this.tokenData[0].symbol;
    this.checkboxes = [false, false, false];
  }
  
  refreshBuyOrderDetails(val) {
    this.buyTokenAmount = new BigNumber(val);
    if (!this.buyTokenAmount.isNaN()) {
      this.buySharesAmount = this.buyTokenAmount.times(this.assetSymbolToPrice(this.selectedTokenSymbol)).div(this.sharesPrice);
    }
  }

  maxBuyAmount() {
    $('#sharesAmountToBuy').val(this.selectedTokenBalance.toString());
    this.refreshBuyOrderDetails(this.selectedTokenBalance);
  }

  selectBuyToken(value) {
    this.selectedTokenSymbol = value;
    $('#sharesAmountToBuy').val('0');
    this.refreshBuyOrderDetails(0);
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
  
  checkRouterURL(route) {
    return this.router.url === route;
  }
  
  agreementsChecked() {
    for (var checked of this.checkboxes) {
      if (!checked) {
        return false;
      }
    }
    return true;
  }
}
