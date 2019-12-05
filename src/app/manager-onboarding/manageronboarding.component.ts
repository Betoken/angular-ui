import { Component, OnInit } from '@angular/core';
import { AppComponent } from '../app.component';
import { Router } from '@angular/router';
import { isUndefined } from 'util';
import BigNumber from 'bignumber.js';

import { } from 'jquery';
declare var $: any;

import {
  user, stats, tokens, manager_actions
} from '../../betokenjs/helpers';

@Component({
  selector: 'app-account',
  templateUrl: './manageronboarding.component.html'
})
export class ManageronboardingComponent implements OnInit {
  ZERO_ADDR = '0x0000000000000000000000000000000000000000';
  FALLBACK_MAX_DONATION: BigNumber;
  tokenData: Array<Object>;
  user_address: String;
  checkboxes: Array<boolean>;
  selectedTokenSymbol: String;
  selectedTokenBalance: BigNumber;
  transactionId: String;
  kairoPrice: BigNumber;
  buyKairoAmount: BigNumber;
  buyTokenAmount: BigNumber;
  kairoBalance: BigNumber;
  kairoTotalSupply: BigNumber;
  totalFunds: BigNumber;

  buyStep: Number;
  continueEnabled: Boolean;

  errorMsg: String;

  constructor(private ms: AppComponent, private router: Router) {
    this.user_address = this.ZERO_ADDR;
    this.buyStep = 0;
    this.checkboxes = [false, false, false];
    this.selectedTokenSymbol = '';
    this.selectedTokenBalance = new BigNumber(0);
    this.transactionId = '';
    this.kairoPrice = new BigNumber(0);
    this.buyKairoAmount = new BigNumber(0);
    this.buyTokenAmount = new BigNumber(0);
    this.kairoBalance = new BigNumber(0);
    this.kairoTotalSupply = new BigNumber(0);
    this.FALLBACK_MAX_DONATION = new BigNumber(100); // fallback max DAI payment is 100
    this.continueEnabled = false;
    this.errorMsg = "";
    this.totalFunds = new BigNumber(0);
  }

  ngOnInit() {
    $('[data-toggle="tooltip"]').tooltip();
    $('#modalBuy').on('hidden.bs.modal', () => {
      this.resetModals();
    });
    this.tokenData = tokens.token_data();
    this.selectedTokenSymbol = this.tokenData[0]['symbol'];
    this.refreshDisplay();
  }

  refreshDisplay() {
    this.user_address = user.address();
    this.kairoPrice = stats.kairo_price();
    this.kairoBalance = user.portfolio_value();
    this.kairoTotalSupply = stats.kairo_total_supply();
    this.totalFunds = stats.total_funds();

    this.getTokenBalance(this.selectedTokenSymbol);
  }

  resetModals() {
    this.buyStep = 0;
    this.selectedTokenSymbol = this.tokenData[0]['symbol'];
    this.checkboxes = [false, false, false];
    this.continueEnabled = false;
    this.getTokenBalance(this.selectedTokenSymbol);
  }

  refreshBuyOrderDetails(val) {
    this.buyTokenAmount = new BigNumber(val);
    if (!this.buyTokenAmount.isNaN()) {
      this.buyKairoAmount = this.buyTokenAmount.times(this.assetSymbolToPrice(this.selectedTokenSymbol)).div(this.kairoPrice);
    } else {
      this.buyTokenAmount = new BigNumber(0);
      this.buyKairoAmount = new BigNumber(0);
    }
  }

  getMaxPaymentAmount() {
    return BigNumber.max(this.kairoTotalSupply.div(100).times(this.kairoPrice), this.FALLBACK_MAX_DONATION).div(this.assetSymbolToPrice(this.selectedTokenSymbol));
  }

  maxBuyAmount() {
    let amount = BigNumber.min(this.selectedTokenBalance, this.getMaxPaymentAmount());
    $('#sharesAmountToBuy').val(amount.toString());
    this.refreshBuyOrderDetails(amount);
    this.continueEnabled = true;
  }

  selectBuyToken(value) {
    this.selectedTokenSymbol = value;
    $('#sharesAmountToBuy').val('0');
    this.refreshBuyOrderDetails(0);
    this.getTokenBalance(this.selectedTokenSymbol);
  }

  async getTokenBalance(token) {
    this.selectedTokenBalance = await user.token_balance(token);
  }

  register() {
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
        this.errorMsg = JSON.stringify(e);
      }
    }
    switch (this.selectedTokenSymbol) {
      case 'ETH':
        manager_actions.register_with_ETH(payAmount, pending, confirm, error);
        break;
      case 'SAI':
        manager_actions.register_with_DAI(payAmount, pending, confirm, error);
        break;
      default:
        manager_actions.register_with_token(payAmount, this.selectedTokenSymbol, pending, confirm, error);
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
