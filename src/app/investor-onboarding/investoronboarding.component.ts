import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { isUndefined } from 'util';
import BigNumber from 'bignumber.js';

import { } from 'jquery';
declare var $: any;;

import {
  user, timer, tokens, investor_actions, refresh_actions
} from '../../betokenjs/helpers';

import { ApolloEnabled } from '../apollo';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';

@Component({
  selector: 'app-account',
  templateUrl: './investoronboarding.component.html'
})
export class InvestoronboardingComponent extends ApolloEnabled implements OnInit {
  ZERO_ADDR = '0x0000000000000000000000000000000000000000';

  tokenData: Array<Object>;
  user_address: String;
  checkboxes: Array<boolean>;
  selectedTokenSymbol: String;
  selectedTokenBalance: BigNumber;
  transactionId: String;
  sharesPrice: BigNumber;
  buySharesAmount: BigNumber;
  buyTokenAmount: BigNumber;
  continueEnabled: Boolean;

  buyStep: Number;
  days: Number;
  hours: Number;
  minutes: Number;
  seconds: Number;
  phase: Number;

  errorMsg: String;

  constructor(private router: Router, private apollo: Apollo) {
    super();
    this.user_address = this.ZERO_ADDR;
    this.buyStep = 0;
    this.checkboxes = [false, false, false];
    this.selectedTokenSymbol = '';
    this.selectedTokenBalance = new BigNumber(0);
    this.transactionId = '';
    this.sharesPrice = new BigNumber(0);
    this.buySharesAmount = new BigNumber(0);
    this.buyTokenAmount = new BigNumber(0);
    this.continueEnabled = false;

    this.days = 0;
    this.hours = 0;
    this.minutes = 0;
    this.seconds = 0;
    this.phase = 0;

    this.errorMsg = "";
  }

  ngOnInit() {
    $('[data-toggle="tooltip"]').tooltip();
    $('#modalInvestorBuy').on('hidden.bs.modal', () => {
      this.resetModals();
    });
    this.tokenData = tokens.token_data();
    this.selectedTokenSymbol = this.tokenData[0]['symbol'];
    this.refreshDisplay();
    setInterval(() => this.updateTimer(), 1000);
  }

  refreshDisplay() {
    this.user_address = user.address();
    this.getTokenBalance(this.selectedTokenSymbol);

    this.querySubscription = this.apollo
      .watchQuery({
        pollInterval: this.pollInterval,
        fetchPolicy: this.fetchPolicy,
        query: gql`
          {
            fund(id: "BetokenFund") {
              sharesPrice
              cyclePhase
            }
          }
        `
      })
      .valueChanges.subscribe(({ data, loading }) => {
        if (!loading) {
          let fund = data['fund'];

          this.sharesPrice = new BigNumber(fund.sharesPrice);
        }
      });
  }

  updateTimer() {
    this.days = timer.day();
    this.hours = timer.hour();
    this.minutes = timer.minute();
    this.seconds = timer.second();
    this.phase = timer.phase();
  }

  resetModals() {
    this.buyStep = 0;
    this.selectedTokenSymbol = this.tokenData[0]['symbol'];
    this.checkboxes = [false, false, false];
    this.continueEnabled = false;
    this.getTokenBalance(this.selectedTokenSymbol);
  }

  async reloadAll() {
    await refresh_actions.reload_all();
    this.refreshDisplay();
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

  maxBuyAmount() {
    $('#sharesAmountToBuy').val(this.selectedTokenBalance.toString());
    this.refreshBuyOrderDetails(this.selectedTokenBalance);
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
        this.errorMsg = JSON.stringify(e);
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
