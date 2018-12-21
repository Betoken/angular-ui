import { Component, OnInit } from '@angular/core';
import { tokens, loading, refresh_actions, error_notifications } from '../../betokenjs/helpers';
import BigNumber from 'bignumber.js';
import { isUndefined } from 'util';

declare var jquery:any;
declare var $ :any;

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
        error_notifications.set_error_msg("");
        setInterval(() => {
            this.refreshDisplay();
            this.updateErrorMsg();
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

    updateErrorMsg() {
        error_notifications.check_dependency();
        this.errorMsg = error_notifications.get_error_msg();
    }

    filterTable = (event, tableID, searchID) => {
        let searchInput = event.target.value.toLowerCase();
        let entries = $(`#${tableID} tr`);
        for (let i = 0; i < entries.length; i++) {
            let entry = entries[i];
            let searchTarget = entry.children[searchID];
            if (searchTarget) {
                if (searchTarget.innerText.toLowerCase().indexOf(searchInput) > -1)
                    entry.style.display = "";
                else
                    entry.style.display = "none";
            }    
        }     
    }
}
