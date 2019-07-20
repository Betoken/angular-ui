import { Component, OnInit } from '@angular/core';
import { user, timer, manager_actions, tokens } from '../../betokenjs/helpers';
import BigNumber from 'bignumber.js';
import { isUndefined, isNull } from 'util';

import { ApolloEnabled } from '../apollo';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';

declare var $: any;

@Component({
    selector: 'app-proposal',
    templateUrl: './investments.component.html'
})

export class InvestmentsComponent extends ApolloEnabled implements OnInit {
    COL_RATIO_MODIFIER = 4 / 3;
    UNSAFE_COL_RATIO_MULTIPLIER = 1.1;

    createInvestmentPopupStep: Number;
    sellInvestmentPopupStep: Number;
    nextPhasePopupStep: Number;
    topupPopupStep: Number;

    portfolioValueInDAI: BigNumber;
    riskTakenPercentage: BigNumber;
    userValue: BigNumber;
    expectedCommission: BigNumber;
    kairoBalance: BigNumber;
    userROI: BigNumber;
    phase: Number;

    selectedTokenSymbol: String;
    stakeAmount: BigNumber;
    transactionId: String;
    continueEnabled: Boolean;
    orderTypes: Array<Object>;
    selectedOrderType: Object;
    fulcrumMinStake: BigNumber;

    sellId: Number;
    sellData: Object;

    activeInvestmentList: Array<Object>;
    inactiveInvestmentList: Array<Object>;
    tokenData: Array<Object>;
    activePortfolio: Array<Object>;

    errorMsg: String;

    isLoading: Boolean;

    constructor(private apollo: Apollo) {
        super();

        this.createInvestmentPopupStep = 0;
        this.sellInvestmentPopupStep = 0;
        this.nextPhasePopupStep = 0;
        this.topupPopupStep = 0;

        this.portfolioValueInDAI = new BigNumber(0);
        this.riskTakenPercentage = new BigNumber(0);
        this.userValue = new BigNumber(0);
        this.expectedCommission = new BigNumber(0);
        this.kairoBalance = new BigNumber(0);
        this.userROI = new BigNumber(0);
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
        this.fulcrumMinStake = new BigNumber(0);

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
        this.activePortfolio = new Array<Object>();

        this.errorMsg = "";

        this.isLoading = true;
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
        this.fulcrumMinStake = new BigNumber(0);
    }

    // Refresh info

    refreshDisplay() {
        this.isLoading = true;
        this.tokenData = tokens.token_data().filter((x) => tokens.not_stablecoin(x.symbol));

        let userAddress = user.address().toLowerCase();
        this.querySubscription = this.apollo
            .watchQuery({
                query: gql`
                    {
                        fund(id: "BetokenFund") {
                            aum
                            cyclePhase
                            totalFundsInDAI
                            kairoTotalSupply
                            cycleTotalCommission
                            totalFundsAtPhaseStart
                        }
                        manager(id: "${userAddress}") {
                            kairoBalance
                            kairoBalanceWithStake
                            baseStake
                            riskTaken
                            riskThreshold
                        }
                        activeBasicOrders: basicOrders(where: {owner: "${userAddress}", cycleNumber: "${timer.cycle()}", isSold: false}) {
                            idx
                            tokenAddress
                            stake
                            tokenAmount
                            buyPrice
                            sellPrice
                            buyTime
                            cycleNumber
                        }
                        inactiveBasicOrders: basicOrders(where: {owner: "${userAddress}", cycleNumber: "${timer.cycle()}", isSold: true}) {
                            tokenAddress
                            stake
                            buyPrice
                            sellPrice
                        }
                        activeFulcrumOrders: fulcrumOrders(where: {owner: "${userAddress}", cycleNumber: "${timer.cycle()}", isSold: false}) {
                            idx
                            tokenAddress
                            stake
                            tokenAmount
                            buyPrice
                            sellPrice
                            buyTime
                            liquidationPrice
                        }
                        inactiveFulcrumOrders: fulcrumOrders(where: {owner: "${userAddress}", cycleNumber: "${timer.cycle()}", isSold: true}) {
                            tokenAddress
                            stake
                            buyPrice
                            sellPrice
                        }
                        activeCompoundOrders: compoundOrders(where: {owner: "${userAddress}", cycleNumber: "${timer.cycle()}", isSold: false}) {
                            idx
                            tokenAddress
                            stake
                            collateralAmountInDAI
                            collateralRatio
                            currProfit
                            currBorrow
                            currCash
                            currCollateral
                            marketCollateralFactor
                            outputAmount
                            buyTime
                            isShort
                            orderAddress
                        }
                        inactiveCompoundOrders: compoundOrders(where: {owner: "${userAddress}", cycleNumber: "${timer.cycle()}", isSold: true}) {
                            tokenAddress
                            stake
                            collateralAmountInDAI
                            currProfit
                            outputAmount
                            isShort
                        }
                    }
                `
            })
            .valueChanges.subscribe(({ data, loading }) => {
                this.isLoading = loading;

                let fund = data['fund'];
                let manager = data['manager'];

                this.phase = fund.cyclePhase === 'INTERMISSION' ? 0 : 1;

                if (!isNull(manager)) {
                    this.userValue = new BigNumber(manager.kairoBalanceWithStake);
                    this.userROI = this.userValue.div(manager.baseStake).minus(1).times(100);
                    this.riskTakenPercentage = BigNumber.min(new BigNumber(manager.riskTaken).div(manager.riskThreshold).times(100), 100);
                    this.portfolioValueInDAI = this.userValue.div(fund.kairoTotalSupply).times(fund.totalFundsInDAI);
                    this.kairoBalance = new BigNumber(manager.kairoBalance);
                    // calculate expected commission
                    if (+fund.kairoTotalSupply > 0) {
                        if (this.phase == 0) {
                            // Actual commission that will be redeemed
                            this.expectedCommission = this.kairoBalance.div(fund.kairoTotalSupply).times(fund.cycleTotalCommission);
                        }
                        // Expected commission based on previous average ROI
                        let totalProfit = new BigNumber(fund.aum).minus(fund.totalFundsAtPhaseStart);
                        totalProfit = BigNumber.max(totalProfit, 0);
                        let commission = totalProfit.div(fund.kairoTotalSupply).times(this.userValue).times(user.commission_rate());
                        let assetFee = new BigNumber(fund.aum).div(fund.kairoTotalSupply).times(this.userValue).times(user.asset_fee_rate());
                        this.expectedCommission = commission.plus(assetFee);
                    }
                }

                let activeBasicOrders = data['activeBasicOrders'].map((x) => {
                    x.tokenSymbol = this.getOrderTokenSymbol(x);
                    x.ROI = new BigNumber(x.sellPrice).div(x.buyPrice).minus(1).times(100);
                    x.currValue = new BigNumber(x.stake).times(x.ROI.div(100).plus(1));
                    return x;
                });
                let activeFulcrumOrders = data['activeFulcrumOrders'].map((x) => {
                    x.tokenSymbol = this.getOrderTokenSymbol(x);
                    x.ROI = new BigNumber(x.sellPrice).div(x.buyPrice).minus(1).times(100);
                    x.currValue = new BigNumber(x.stake).times(x.ROI.div(100).plus(1));
                    x.leverage = tokens.ptoken_address_to_info(x.tokenAddress).leverage;
                    x.safety = new BigNumber(x.liquidationPrice).minus(x.sellPrice).div(x.sellPrice).abs().gt(this.UNSAFE_COL_RATIO_MULTIPLIER - 1);
                    return x;
                });
                let activeCompoundOrders = data['activeCompoundOrders'].map((x) => {
                    x.tokenSymbol = this.getOrderTokenSymbol(x);
                    x.ROI = new BigNumber(x.currProfit).div(x.collateralAmountInDAI).times(100);
                    x.currValue = new BigNumber(x.stake).times(x.ROI.div(100).plus(1));
                    x.minCollateralRatio = new BigNumber(1).div(x.marketCollateralFactor);
                    x.leverage = x.isShort ? x.minCollateralRatio.times(this.COL_RATIO_MODIFIER).pow(-1).dp(4).toNumber() : new BigNumber(1).plus(x.minCollateralRatio.times(this.COL_RATIO_MODIFIER).pow(-1)).dp(4).toNumber();
                    x.safety = new BigNumber(x.collateralRatio).gt(x.minCollateralRatio.times(this.UNSAFE_COL_RATIO_MULTIPLIER));
                    return x;
                });
                let inactiveBasicOrders = data['inactiveBasicOrders'].map((x) => {
                    x.tokenSymbol = this.getOrderTokenSymbol(x);
                    x.ROI = new BigNumber(x.sellPrice).div(x.buyPrice).minus(1).times(100);
                    x.currValue = new BigNumber(x.stake).times(x.ROI.div(100).plus(1));
                    return x;
                });
                let inactiveFulcrumOrders = data['inactiveFulcrumOrders'].map((x) => {
                    x.tokenSymbol = this.getOrderTokenSymbol(x);
                    x.ROI = new BigNumber(x.sellPrice).div(x.buyPrice).minus(1).times(100);
                    x.currValue = new BigNumber(x.stake).times(x.ROI.div(100).plus(1));
                    x.leverage = tokens.ptoken_address_to_info(x.tokenAddress).leverage;
                    return x;
                });
                let inactiveCompoundOrders = data['inactiveCompoundOrders'].map((x) => {
                    x.tokenSymbol = this.getOrderTokenSymbol(x);
                    x.ROI = new BigNumber(x.currProfit).div(x.collateralAmountInDAI).times(100);
                    x.currValue = new BigNumber(x.stake).times(x.ROI.div(100).plus(1));
                    let minCollateralRatio = new BigNumber(1).div(x.marketCollateralFactor);
                    x.leverage = x.isShort ? minCollateralRatio.times(this.COL_RATIO_MODIFIER).pow(-1).dp(4).toNumber() : new BigNumber(1).plus(minCollateralRatio.times(this.COL_RATIO_MODIFIER).pow(-1)).dp(4).toNumber();
                    return x;
                });

                this.activeInvestmentList = activeBasicOrders.concat(activeFulcrumOrders).concat(activeCompoundOrders).sort((a, b) => new BigNumber(b['buyTime']).minus(a['buyTime']).toNumber());
                this.inactiveInvestmentList = inactiveBasicOrders.concat(inactiveFulcrumOrders).concat(inactiveCompoundOrders).sort((a, b) => new BigNumber(b['buyTime']).minus(a['buyTime']).toNumber());

                // convert active investments into portfolio format
                this.activePortfolio = [];
                let recordStake = (_symbol, _stake) => {
                    let assetIdx = this.activePortfolio.findIndex((x) => x['symbol'] === _symbol);
                    if (assetIdx == -1) {
                        // asset not recorded
                        this.activePortfolio.push({
                            symbol: _symbol,
                            stake: new BigNumber(0)
                        });
                        assetIdx = this.activePortfolio.length - 1;
                    }
                    this.activePortfolio[assetIdx]['stake'] = this.activePortfolio[assetIdx]['stake'].plus(_stake);
                }
                for (let inv of this.activeInvestmentList) {
                    recordStake(inv['tokenSymbol'], inv['currValue']);
                }
                // record unstaked KRO as well
                this.activePortfolio.push({
                    symbol: 'DAI',
                    stake: this.kairoBalance
                });
                // sort in descending order of stake
                this.activePortfolio.sort((a, b) => new BigNumber(b['stake']).minus(a['stake']).toNumber());
            });
    }

    formatNumber(n, decimals) {
        return new BigNumber(n).toFormat(decimals);
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
                if (!(pToken.type && symbol === 'WBTC')) {
                    orderTypes.push(option);
                }
            }
        }

        this.orderTypes = orderTypes;
    }

    selectOrderType(typeId) {
        this.selectedOrderType = this.orderTypes[typeId];
        if (this.selectedOrderType['type'] === 'fulcrum') {
            this.fulcrumMinStake = tokens.fulcrum_min_stake(this.selectedTokenSymbol, (this.selectedOrderType['leverage'] < 0));
        }
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
            this.refreshDisplay();
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
        this.sellId = +data.idx;
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
            this.refreshDisplay();
        }

        let error = (e) => {
            if (this.sellInvestmentPopupStep != 0) {
                this.sellInvestmentPopupStep = -1;
                this.errorMsg = e.toString();
            }
        }

        switch (this.sellData['__typename']) {
            case 'BasicOrder':
                // basic order
                let tokenPrice = this.assetSymbolToPrice(this.selectedTokenSymbol);
                let minPrice = tokenPrice.minus(tokenPrice.times(minAcceptablePriceProp));
                manager_actions.sell_investment(this.sellId, sellPercentage, minPrice, tokenPrice.times(100000), pendingSell, confirmSell, error);
                break;
            case 'FulcrumOrder':
                // fulcrum order
                let tokenPrice1 = new BigNumber(this.sellData['sellPrice']);
                let minPrice1 = tokenPrice1.minus(tokenPrice1.times(minAcceptablePriceProp));
                manager_actions.sell_investment(this.sellId, sellPercentage, minPrice1, tokenPrice1.times(100000), pendingSell, confirmSell, error);
                break;
            case 'CompoundOrder':
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
        let repayAmount = new BigNumber(this.sellData['currBorrow']).minus(new BigNumber(this.sellData['currCollateral']).div(targetColRatio));
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
            this.refreshDisplay();
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
        $('#kairo-input').val(this.kairoBalance.toString());
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

    getOrderTokenSymbol(orderData) {
        switch (orderData.__typename) {
            case 'BasicOrder':
                return tokens.asset_address_to_symbol(orderData.tokenAddress);
            case 'FulcrumOrder':
                return tokens.ptoken_address_to_symbol(orderData.tokenAddress);
            case 'CompoundOrder':
                return tokens.ctoken_address_to_symbol(orderData.tokenAddress);
        }
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
        return orderData.__typename === type;
    }
}
