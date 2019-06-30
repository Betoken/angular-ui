import {Component, OnInit} from '@angular/core';
import { AppComponent } from '../app.component';
import { user, timer, manager_actions, loading, tokens, refresh_actions } from '../../betokenjs/helpers';
import BigNumber from 'bignumber.js';
import { isUndefined } from 'util';

declare var $ :any;

@Component({
    selector: 'app-proposal',
    templateUrl: './investments.component.html'
})

export class InvestmentsComponent implements OnInit {
    createInvestmentPopupStep: Number;
    sellInvestmentPopupStep: Number;
    nextPhasePopupStep: Number;
    topupPopupStep: Number;

    portfolioValueInDAI: String;
    riskTakenPercentage: BigNumber;
    userValue: String;
    expected_commission: String;
    kairo_balance: BigNumber;
    monthly_pl: BigNumber;
    phase: Number;

    selectedTokenSymbol: String;
    stakeAmount: BigNumber;
    transactionId: String;
    continueEnabled: Boolean;
    orderTypes: Array<Object>;
    selectedOrderType: Object;

    sellId: Number;
    sellData: Object;

    activeInvestmentList: Array<Object>;
    inactiveInvestmentList: Array<Object>;
    tokenData: Array<Object>;

    errorMsg: String;

    constructor(private ms: AppComponent) {
        this.createInvestmentPopupStep = 0;
        this.sellInvestmentPopupStep = 0;
        this.nextPhasePopupStep = 0;
        this.topupPopupStep = 0;

        this.portfolioValueInDAI = '';
        this.riskTakenPercentage = new BigNumber(0);
        this.userValue = '';
        this.expected_commission = '';
        this.kairo_balance = new BigNumber(0);
        this.monthly_pl = new BigNumber(0);
        this.phase = 0;

        this.selectedTokenSymbol = 'ETH';
        this.stakeAmount = new BigNumber(0);
        this.transactionId = '';
        this.selectedOrderType = {
            text: 'Basic Order',
            leverage: 1,
            type: 'basic'
        };
        this.continueEnabled = false;

        this.sellId = 0;
        this.sellData = {
            stake: new BigNumber(0),
            ROI: new BigNumber(0),
            currValue: new BigNumber(0),
            type: "basic",
            buyTime: new Date(),
            collateralRatio: new BigNumber(0),
            minCollateralRatio: new BigNumber(0),
            currCollateral: new BigNumber(0),
            currBorrow: new BigNumber(0),
            currCash: new BigNumber(0),
            leverage: 0
        };

        this.activeInvestmentList = new Array<Object>();
        this.inactiveInvestmentList = new Array<Object>();
        this.tokenData = new Array<Object>();

        this.errorMsg = "";
    }

    ngOnInit() {
        $('#modalBuy').on('hidden.bs.modal', () => {
            this.resetModals();
        });
        $('#modalSell').on('hidden.bs.modal', () => {
            this.resetModals();
        });
        $('#modalTopUp').on('hidden.bs.modal', () => {
            this.resetModals();
        });
        $('[data-toggle="tooltip"]').tooltip();
        this.refreshDisplay();
    }

    resetModals() {
        this.stakeAmount = new BigNumber(0);
        this.selectedTokenSymbol = this.tokenData[0]['symbol'];
        this.selectedOrderType = {
            text: 'Basic Order',
            leverage: 1,
            type: 'basic'
        };
        this.createInvestmentPopupStep = 0;
        this.sellInvestmentPopupStep = 0;
        this.nextPhasePopupStep = 0;
        this.topupPopupStep = 0;
        this.continueEnabled = false;
    }

    // Refresh info

    refreshDisplay() {
        this.expected_commission = user.expected_commission().toFormat(2);
        this.kairo_balance = user.kairo_balance();
        this.monthly_pl = user.monthly_roi();
        this.tokenData = tokens.token_data().filter((x) => tokens.not_stablecoin(x.symbol));
        this.userValue = user.portfolio_value().toFormat(4);
        this.portfolioValueInDAI = user.portfolio_value_in_dai().toFormat(4);
        this.riskTakenPercentage = user.risk_taken_percentage().times(100);
        this.phase = timer.phase();

        this.activeInvestmentList = user.investment_list().filter((data) => data.isSold === false);
        this.inactiveInvestmentList = user.investment_list().filter((data) => data.isSold === true);
    }

    async refresh() {
        await refresh_actions.investments();
        this.refreshDisplay();
    }

    // Create investment

    selectInvestmentAsset(symbol) {
        this.selectedTokenSymbol = symbol;
        this.createInvestmentPopupStep = 1;

        // generate list of order types
        let orderTypes = new Array();
        const basicOrder = {
            text: 'Basic Order',
            leverage: 1,
            type: 'basic'
        };
        orderTypes.push(basicOrder);
        if (tokens.is_compound_token(symbol)) {
            const longOrder = {
                text: 'Long • Leverage 1.5625x (Compound)',
                leverage: 1.5625,
                type: 'compound',
                isShort: false
            }
            const shortOrder = {
                text: 'Short • Leverage 0.5625x (Compound)',
                leverage: -0.5625,
                type: 'compound',
                isShort: true
            }
            orderTypes.push(longOrder);
            orderTypes.push(shortOrder);
        }
        if (tokens.is_fulcrum_token(symbol)) {
            let pTokens = tokens.asset_symbol_to_ptokens(symbol);
            for (let pToken of pTokens) {
                let option = {
                    text: `${pToken.type ? 'Short' : 'Long'} • Leverage ${pToken.leverage}x (Fulcrum)`,
                    leverage: pToken.type ? -pToken.leverage : pToken.leverage,
                    type: 'fulcrum',
                    tokenAddress: pToken.address
                }
                orderTypes.push(option);
            }
        }

        this.orderTypes = orderTypes;
    }

    selectOrderType(typeId) {
        this.selectedOrderType = this.orderTypes[typeId];
    }

    async createInvestment() {
        this.stakeAmount = new BigNumber($('#kairo-input').val());
        let maxAcceptablePriceProp = new BigNumber($('#maxAcceptablePrice').val()).div(100);

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
            }
            this.refresh();
        }

        let error = (e) => {
            if (this.createInvestmentPopupStep != 0) {
                this.createInvestmentPopupStep = -1;
                this.errorMsg = e.toString();
            }
        }

        switch (this.selectedOrderType['type']) {
            case 'basic':
                let tokenPrice = tokens.asset_symbol_to_price(this.selectedTokenSymbol);
                let maxPrice = tokenPrice.plus(tokenPrice.times(maxAcceptablePriceProp));
                manager_actions.new_investment_with_symbol(this.selectedTokenSymbol, this.stakeAmount, new BigNumber(0), maxPrice, pending, confirm, error);
                break;
            case 'compound':
                let tokenPrice1 = tokens.asset_symbol_to_price(this.selectedTokenSymbol);
                let maxPrice1 = tokenPrice1.plus(tokenPrice1.times(maxAcceptablePriceProp));
                manager_actions.new_compound_order(this.selectedOrderType['isShort'], this.selectedTokenSymbol, this.stakeAmount, new BigNumber(0), maxPrice1, pending, confirm, error);
                break;
            case 'fulcrum':
                let tokenPrice2 = await tokens.get_ptoken_price(this.selectedOrderType['tokenAddress'], tokens.asset_symbol_to_price(this.selectedTokenSymbol));
                let maxPrice2 = tokenPrice2.plus(tokenPrice2.times(maxAcceptablePriceProp));
                manager_actions.new_investment_with_address(this.selectedOrderType['tokenAddress'], this.stakeAmount, new BigNumber(0), maxPrice2, pending, confirm, error);
                break;
        }
    }

    // Sell investment

    openSellModal(data) {
        this.sellId = data.id;
        this.sellData = data;
        this.selectedTokenSymbol = data.tokenSymbol;
    }

    async sell() {
        let sellPercentage = new BigNumber($('#sell-percentage-input').val()).div(100);
        let minAcceptablePriceProp = new BigNumber($('#minAcceptablePrice').val()).div(100);
        this.sellInvestmentPopupStep = 1;

        let pendingSell = (transactionHash) => {
            if (this.sellInvestmentPopupStep !== 0) {
                this.sellInvestmentPopupStep = 2;
                this.transactionId = transactionHash;
            }
        }

        let confirmSell = () => {
            if (this.sellInvestmentPopupStep !== 0) {
                this.sellInvestmentPopupStep = 3;
            }
            this.refresh();
        }

        let error = (e) => {
            if (this.sellInvestmentPopupStep != 0) {
                this.sellInvestmentPopupStep = -1;
                this.errorMsg = e.toString();
            }
        }

        switch (this.sellData['type']) {
            case 'basic':
                // basic order
                let tokenPrice = this.assetSymbolToPrice(this.selectedTokenSymbol);
                let minPrice = tokenPrice.minus(tokenPrice.times(minAcceptablePriceProp));
                manager_actions.sell_investment(this.sellId, sellPercentage, minPrice, tokenPrice.times(100000), pendingSell, confirmSell, error);
                break;
            case 'fulcrum':
                // fulcrum order
                let tokenPrice1 = await tokens.get_ptoken_price(this.sellData['tokenAddress'], tokens.asset_symbol_to_price(this.selectedTokenSymbol));
                let minPrice1 = tokenPrice1.minus(tokenPrice1.times(minAcceptablePriceProp));
                manager_actions.sell_investment(this.sellId, sellPercentage, minPrice1, tokenPrice1.times(100000), pendingSell, confirmSell, error);
                break;
            case 'compound':
                // compound order
                let tokenPrice2 = this.assetSymbolToPrice(this.selectedTokenSymbol);
                let minPrice2 = tokenPrice2.minus(tokenPrice2.times(minAcceptablePriceProp));
                manager_actions.sell_compound_order(this.sellId, minPrice2, tokenPrice2.times(100000), pendingSell, confirmSell, error);
                break;
        }

    }

    // Top up Compound order
    topup() {
        let targetColRatio = new BigNumber($('#collateral-ratio-target-input').val()).div(100);
        let repayAmount = this.sellData['currBorrow'].minus(this.sellData['currCollateral'].div(targetColRatio));
        this.topupPopupStep = 1;

        let pending = (transactionHash) => {
            if (this.topupPopupStep !== 0) {
                this.topupPopupStep = 2;
                this.transactionId = transactionHash;
            }
        }

        let confirm = () => {
            if (this.topupPopupStep !== 0) {
                this.topupPopupStep = 3;
            }
            this.sellData['collateralRatio'] = targetColRatio;
            this.refresh();
        }

        let error = (e) => {
            if (this.topupPopupStep != 0) {
                this.topupPopupStep = -1;
                this.errorMsg = e.toString();
            }
        }

        manager_actions.repay_compound_order(this.sellId, repayAmount, pending, confirm, error);
    }

    // UI helpers

    maxStake() {
        $('#kairo-input').val(this.kairo_balance.toString());
        this.continueEnabled = true;
    }

    maxSellPercent() {
        $('#sell-percentage-input').val('100.0');
        this.continueEnabled = true;
    }

    maxTopupTarget() {
        $('#collateral-ratio-target-input').val(this.sellData['currCollateral'].div(this.sellData['currBorrow'].minus(this.sellData['currCash'])).times(100).toFixed(0));
        this.continueEnabled = true;
    }

    isLoading() {
        return loading.investments();
    }


    filterList = (event, listID, searchID) => {
        let searchInput = event.target.value.toLowerCase();
        let entries = $(`#${listID} li`);
        for (let i = 0; i < entries.length; i++) { // skip first item (titles etc.)
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
        return result.isNaN() ? 'Not available' : result.toFormat(4);
    }

    isMarginToken(token) {
        return tokens.is_compound_token(token) || tokens.is_fulcrum_token(token);
    }

    isOrderOfType(orderData, type) {
        return orderData.type === type;
    }
}
