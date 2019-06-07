import {Component, OnInit} from '@angular/core';
import { AppComponent } from '../app.component';
import { user, timer, manager_actions, loading, tokens, refresh_actions} from '../../betokenjs/helpers';
import BigNumber from 'bignumber.js';
import { isUndefined } from 'util';

declare var jquery:any;
declare var $ :any;

@Component({
    selector: 'app-proposal',
    templateUrl: './investments.component.html'
})

export class InvestmentsComponent implements OnInit {
    createInvestmentPopupStep: Number;
    sellInvestmentPopupStep: Number;
    nextPhasePopupStep: Number;

    portfolioValueInDAI: String;
    riskTakenPercentage: BigNumber;
    userValue: String;
    expected_commission: String;
    kairo_balance: BigNumber;
    monthly_pl: BigNumber;

    selectedTokenSymbol: String;
    stakeAmount: BigNumber;
    transactionId: String;
    orderType: Number;
    orderLeverage: Number;

    sellId: Number;
    sellData: Object;

    activeInvestmentList: Array<Object>;
    inactiveInvestmentList: Array<Object>;
    tokenData: Array<Object>;

    days: Number;
    hours: Number;
    minutes: Number;
    seconds: Number;
    phase: Number;

    constructor(private ms: AppComponent) {
        this.createInvestmentPopupStep = 0;
        this.sellInvestmentPopupStep = 0;
        this.nextPhasePopupStep = 0;

        this.portfolioValueInDAI = '';
        this.riskTakenPercentage = new BigNumber(0);
        this.userValue = '';
        this.expected_commission = '';
        this.kairo_balance = new BigNumber(0);
        this.monthly_pl = new BigNumber(0);

        this.selectedTokenSymbol = 'ETH';
        this.stakeAmount = new BigNumber(0);
        this.transactionId = '';
        this.orderType = 0;
        this.orderLeverage = 1;

        this.sellId = 0;
        this.sellData = {
            stake: new BigNumber(0),
            ROI: new BigNumber(0),
            currValue: new BigNumber(0),
            type: "basic",
            buyTime: new Date()
        };

        this.activeInvestmentList = new Array<Object>();
        this.inactiveInvestmentList = new Array<Object>();
        this.tokenData = new Array<Object>();

        this.days = 0;
        this.hours = 0;
        this.minutes = 0;
        this.seconds = 0;
        this.phase = -1;
    }

    ngOnInit() {
        setInterval(() => {
            this.refreshDisplay();
        }, 500);
        $('#modalBuy').on('hidden.bs.modal', () => {
            this.resetModals();
        });
        $('#modalSell').on('hidden.bs.modal', () => {
            this.resetModals();
        });
        $('[data-toggle="tooltip"]').tooltip();
    }

    resetModals() {
        this.stakeAmount = new BigNumber(0);
        this.selectedTokenSymbol = this.tokenData[0]['symbol'];
        this.orderType = 0;
        this.orderLeverage = 1;
        this.createInvestmentPopupStep = 0;
        this.sellInvestmentPopupStep = 0;
        this.nextPhasePopupStep = 0;
    }

    // Refresh info

    refreshDisplay() {
        this.activeInvestmentList = user.investment_list().filter((data) => data.isSold === false);
        this.inactiveInvestmentList = user.investment_list().filter((data) => data.isSold === true);
        this.expected_commission = user.expected_commission().toFormat(2);
        this.kairo_balance = user.kairo_balance();
        this.monthly_pl = user.monthly_roi();
        this.tokenData = tokens.token_data().get().filter((x) => tokens.not_stablecoin(x.symbol));
        this.userValue = user.portfolio_value().toFormat(4);
        this.portfolioValueInDAI = user.portfolio_value_in_dai().toFormat(2);
        this.riskTakenPercentage = user.risk_taken_percentage().times(100);

        this.days = timer.day();
        this.hours = timer.hour();
        this.minutes = timer.minute();
        this.seconds = timer.second();
        this.phase = timer.phase();
    }

    refresh() {
        refresh_actions.investments();
    }

    // Create investment

    selectOrderType(type) {
        this.orderType = type;
        
        // set leverage
        switch (type) {
            case 0:
                // basic order
                this.orderLeverage = 1;
                break;
            case 1:
                // long compound order
                this.orderLeverage = 1.5;
                break;
            case 2:
                // short compound order
                this.orderLeverage = -0.5;
                break 
        }
    }

    createInvestment() {
        this.stakeAmount = new BigNumber($('#kairo-input').val());
        this.createInvestmentPopupStep = 2;

        let pending = (transactionHash) => {
            if (this.createInvestmentPopupStep !== 0) {
                this.transactionId = transactionHash;
                this.createInvestmentPopupStep = 3;
            }
        }

        let confirm = () => {
            if (this.createInvestmentPopupStep !== 0) {
                this.createInvestmentPopupStep = 4;
                this.refresh();
            }
        }

        let tokenPrice = this.assetSymbolToPrice(this.selectedTokenSymbol);
        let maxPrice = tokenPrice.plus(tokenPrice.times($('#maxAcceptablePrice').val()).div(100));
        
        switch (this.orderType) {
            case 0:
                // basic order
                manager_actions.new_investment(this.selectedTokenSymbol, this.stakeAmount, new BigNumber(0), maxPrice, pending, confirm);
                break;
            case 1:
                // long compound order
                manager_actions.new_compound_order(false, this.selectedTokenSymbol, this.stakeAmount, new BigNumber(0), maxPrice, pending, confirm);
                break;
            case 2:
                // short compound order
                manager_actions.new_compound_order(true, this.selectedTokenSymbol, this.stakeAmount, new BigNumber(0), maxPrice, pending, confirm);
                break;
        }
    }

    // Sell investment

    openSellModal(data) {
        this.sellId = data.id;
        this.sellData = data;
        this.selectedTokenSymbol = data.tokenSymbol;
    }

    sell() {
        this.sellInvestmentPopupStep = 1;

        let pendingSell = (transactionHash) => {
            this.sellInvestmentPopupStep = 2;
            this.transactionId = transactionHash;
        }

        let confirmSell = () => {
            if (this.sellInvestmentPopupStep === 2) {
                this.sellInvestmentPopupStep = 3;
                this.refresh();
            }
        }

        let tokenPrice = this.assetSymbolToPrice(this.selectedTokenSymbol);
        let minPrice = tokenPrice.minus(tokenPrice.times($('#minAcceptablePrice').val()).div(100));

        switch (this.sellData['type']) {
            case 'basic':
                // basic order
                let sellPercentage = new BigNumber($('#sell-percentage-input').val()).div(100);
                manager_actions.sell_investment(this.sellId, sellPercentage, minPrice, tokenPrice.times(100), pendingSell, confirmSell);
                break;
            case 'compound':
                // compound order
                manager_actions.sell_compound_order(this.sellId, minPrice, tokenPrice.times(100), pendingSell, confirmSell);
                break;
        }
    }

    // UI helpers

    maxStake() {
        $('#kairo-input').val(this.kairo_balance.toString());
    }

    maxSellPercent() {
        $('#sell-percentage-input').val('100.0');
    }

    isLoading() {
        return loading.investments();
    }


    filterList = (event, listID, searchID) => {
        let searchInput = event.target.value.toLowerCase();
        let entries = $(`#${listID} li`);
        if (searchInput.length > 0) {
            entries[0].style.display = "none";
        } else {
            entries[0].style.display = "";
        }
        for (let i = 1; i < entries.length; i++) { // skip first item (titles etc.)
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

    getTokenDailyPriceChange(token) {
        let result = tokens.asset_symbol_to_daily_price_change(token);
        if (isUndefined(result)) {
            result = new BigNumber(0);
        }
        return result.toFormat(4);
    }

    isMarginToken(token) {
        return tokens.is_compound_token(token);
    }

    isMarginOrder(orderData) {
        return orderData.type !== "basic";
    }
}
