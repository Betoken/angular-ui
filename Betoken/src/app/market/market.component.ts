import { Component, OnInit } from '@angular/core';
import { tokens, loading, refresh_actions, error_notifications } from '../../betokenjs/helpers';
import BigNumber from 'bignumber.js';
import { isUndefined } from 'util';

@Component({
  selector: 'app-market',
  templateUrl: './market.component.html',
  styleUrls: ['./market.component.scss']
})
export class MarketComponent implements OnInit {

  tokenList: any;
  errorMsg = '';

  constructor() { }

  ngOnInit() {
    setInterval(() => {
      this.refreshDisplay();
      setTimeout(() => {
        error_notifications.check_dependency();
        this.errorMsg = error_notifications.get_error_msg();
      }, 1000);
    }, 100);
  }

  getTokenPrice(token) {
    let price = tokens.asset_symbol_to_price(token);
    if (isUndefined(price)) {
      price = new BigNumber(0);
    }
    return price.toFormat(10);
  }

  getTokenDailyPriceChange(token) {
    let result = tokens.asset_symbol_to_daily_price_change(token);
    if (isUndefined(result)) {
      result = new BigNumber(0);
    }
    return result.toFormat(4);
  }

  getTokenWeeklyPriceChange(token) {
    let result = tokens.asset_symbol_to_weekly_price_change(token);
    if (isUndefined(result)) {
      result = new BigNumber(0);
    }
    return result.toFormat(4);
  }

  getTokenMonthlyPriceChange(token) {
    let result = tokens.asset_symbol_to_monthly_price_change(token);
    if (isUndefined(result)) {
      result = new BigNumber(0);
    }
    return result.toFormat(4);
  }

  refreshDisplay() {
    this.tokenList = tokens.token_list();
  }

  refresh() {
    refresh_actions.prices();
  }

  isLoading() {
    return loading.prices();
  }
}
