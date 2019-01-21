import {Component, ElementRef, OnInit, Renderer2} from '@angular/core';
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
    createInvestmentPopupStep: number;
    sellInvestmentPopupStep: number;
    nextPhasePopupStep: number;

    tradeAssetval: any;

    portfolioValueInDAI = '';
    currentStake = '';
    currentStakeProportion = '';

    userValue: any;
    days = 0;
    hours = 0;
    minutes = 0;
    seconds = 0;
    phase = -1;
    expected_commission = 0.00;
    kairo_balance = 0.0000;
    monthly_pl = 0.00;
    selectedTokenSymbol = 'ETH';
    stakeAmount = '';
    activeInvestmentList: any;
    inactiveInvestmentList: any;
    sellId: any;
    tokenList: any;
    transactionId: '';
    kroRedeemed: '';
    dailyPriceChange = 0;

    constructor(private ms: AppComponent, private elementRef: ElementRef,private renderer:Renderer2) {
        this.createInvestmentPopupStep = 0;
        this.sellInvestmentPopupStep = 0;
        this.nextPhasePopupStep = 0;
    }

    ngOnInit() {
        setInterval(() => {
            this.refreshDisplay();
        }, 100);
        $('#modalBuy').on('hidden.bs.modal', () => {
            this.resetModals();
        });
        $('#modalSell').on('hidden.bs.modal', () => {
            this.resetModals();
        });
        $('[data-toggle="tooltip"]').tooltip();
    }

    resetModals() {
        this.stakeAmount = '';
        this.createInvestmentPopupStep = 0;
        this.sellInvestmentPopupStep = 0;
        this.nextPhasePopupStep = 0;
    }

    // Refresh info

    refreshDisplay() {
        this.activeInvestmentList = user.investment_list().filter((data) => data.isSold === false);
        this.inactiveInvestmentList = user.investment_list().filter((data) => data.isSold === true);
        this.expected_commission = user.expected_commission().toFormat(2);
        this.kairo_balance = user.kairo_balance().toFormat(6);
        this.monthly_pl = user.monthly_roi().toFormat(4);
        this.tokenList = tokens.token_list();
        this.userValue = user.portfolio_value().toFormat(4);
        this.portfolioValueInDAI = user.portfolio_value_in_dai().toFormat(2);
        this.currentStake = user.current_stake().toFormat(4);
        this.currentStakeProportion = user.current_stake().div(user.portfolio_value()).times(100).toFixed(4);
        this.updateDates();
    }

    refresh() {
        refresh_actions.investments();
    }

    async updateDates() {
        this.days = timer.day();
        this.hours = timer.hour();
        this.minutes = timer.minute();
        this.seconds = timer.second();
        this.phase = timer.phase();
    }

    // Create investment

    createInvestment() {
        this.stakeAmount = $('#kairo-input').val();
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
        manager_actions.new_investment(this.selectedTokenSymbol, this.stakeAmount, pending, confirm);
    }

    // Sell investment

    sell(data) {
        this.sellId = data.id;
        this.kroRedeemed = data.currValue;

        let pendingSell = (transactionHash) => {
            this.sellInvestmentPopupStep = 1;
            this.transactionId = transactionHash;
        }

        let confirmSell = () => {
            if (this.sellInvestmentPopupStep === 1) {
                this.sellInvestmentPopupStep = 2;
            }
        }

        manager_actions.sell_investment(this.sellId, pendingSell, confirmSell);
    }

    // UI helpers

    isLoading() {
        return loading.investments();
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

    filterList = (event, listID, searchID) => {
        let searchInput = event.target.value.toLowerCase();
        let entries = $(`#${listID} li`);
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
        let result = tokens.asset_symbol_to_metadata(token);
        if (isUndefined(result)) {
            return '';
        }
        return result.name;
    }

    getTokenLogoUrl(token) {
        let result = tokens.asset_symbol_to_metadata(token);
        if (isUndefined(result)) {
            return '';
        }
        return result.logoUrl;
    }

    getTokenDailyPriceChange(token) {
        let result = tokens.asset_symbol_to_daily_price_change(token);
        if (isUndefined(result)) {
            result = new BigNumber(0);
        }
        return result.toFormat(4);
    }
}
