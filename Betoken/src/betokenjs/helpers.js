// imports
import BigNumber from "bignumber.js";
import {Betoken} from "./betoken-obj";
import 'list.js';
const Data = require("./data-controller");

// constants
const SEND_TX_ERR = "There was an error during sending your transaction to the Ethereum blockchain. Please check that your inputs are valid and try again later.";
const NO_WEB3_ERR = "Betoken can only be used in a Web3 enabled browser. Please install MetaMask or switch to another browser that supports Web3. You can currently view the fund's data, but cannot make any interactions.";
const WRONG_NETWORK_ERR = "Please switch to the Ethereum Main Network.";
var error_msg = "";

// exports

export const sortTable = () => {
    //
    // Variables
    //

    var toggle = document.querySelectorAll('[data-toggle="lists"]');
    var toggleSort = document.querySelectorAll('[data-toggle="lists"] [data-sort]');

    //
    // Functions
    //

    function init(el) {
        var options = el.dataset.options;
        options = options ? JSON.parse(options) : {};

        new List(el, options);
    }


    //
    // Events
    //
    if (typeof List !== 'undefined') {

        if (toggle) {
            [].forEach.call(toggle, function (el) {
                init(el);
            });
        }

        if (toggleSort) {
            [].forEach.call(toggleSort, function (el) {
                el.addEventListener('click', function (e) {
                    e.preventDefault();
                });
            });
        }
    }
};

export const error_notifications = {
    get_error_msg: () => error_msg,
    set_error_msg: (msg) => {
        error_msg = msg;
    },
    check_dependency: () => {
        if (network.has_web3() === false) {
            if (network.wrong_network() === true) {
                error_notifications.set_error_msg(WRONG_NETWORK_ERR);
            } else {
                error_notifications.set_error_msg(NO_WEB3_ERR);
            }
        } else {
            error_notifications.set_error_msg('');
        }
    }
};

export const network = {
    network_prefix: () => Data.networkPrefix,
    network_name: () => Data.networkName,
    has_web3: () => betoken.hasWeb3,
    wrong_network: () => betoken.wrongNetwork
};

export const timer = {
    day: () => Data.countdownDay,
    hour: () => Data.countdownHour,
    minute: () => Data.countdownMin,
    second: () => Data.countdownSec,
    phase: () => Data.cyclePhase,
    phase_start_time: () => Data.startTimeOfCyclePhase,
    phase_lengths: () => Data.phaseLengths,
    cycle: () => Data.cycleNumber
};

export const user = {
    address: () => Data.userAddress,
    shares_balance: () => Data.sharesBalance,
    investment_balance: () => Data.investmentBalance,
    kairo_balance: () => Data.kairoBalance,
    token_balance: async (tokenSymbol) => {
        let balance = await betoken.getTokenBalance(Data.assetSymbolToAddress(tokenSymbol), Data.userAddress);
        let decimals = Data.TOKEN_DATA.find((x) => x.symbol === tokenSymbol).decimals;
        return BigNumber(balance).div(Math.pow(10, decimals));
    },
    monthly_roi: () => Data.managerROI,
    can_redeem_commission: () => {
        return betoken.hasWeb3 && Data.cyclePhase === 0 && Data.lastCommissionRedemption < Data.cycleNumber;
    },
    expected_commission: function () {
        if (Data.kairoTotalSupply.gt(0)) {
            if (Data.cyclePhase === 0) {
                // Actual commission that will be redeemed
                return Data.kairoBalance.div(Data.kairoTotalSupply).times(Data.cycleTotalCommission);
            }
            // Expected commission based on previous average ROI
            let totalProfit = Data.totalFunds.minus(Data.totalFunds.div(stats.cycle_roi().div(100).plus(1)));
            totalProfit = BigNumber.max(totalProfit, 0);
            let commission = totalProfit.div(Data.kairoTotalSupply).times(user.portfolio_value()).times(Data.commissionRate);
            let assetFee = Data.totalFunds.div(Data.kairoTotalSupply).times(user.portfolio_value()).times(Data.assetFeeRate);
            return commission.plus(assetFee);
        }
        return BigNumber(0);
    },
    commission_history: () => Data.commissionHistory,
    deposit_withdraw_history: () => Data.depositWithdrawHistory,
    investment_list: () => Data.cyclePhase == 1 ? Data.investmentList : [],
    rank: () => {
        var entry, j, len, ref;
        ref = Data.kairoRanking;
        for (j = 0, len = ref.length; j < len; j++) {
            entry = ref[j];
            if (entry.address === Data.userAddress) {
                return entry.rank;
            }
        }
        return "N/A";
    },
    portfolio_value: () => Data.portfolioValue,
    portfolio_value_in_dai: () => {
        return Data.portfolioValue.times(Data.totalFunds).div(Data.kairoTotalSupply);
    },
    risk_taken_percentage: () => Data.riskTakenPercentage,
    active_portfolio: () => Data.activePortfolio
};

export const stats = {
    cycle_length: () => {
        if (Data.phaseLengths.length > 0) {
            return BigNumber(Data.phaseLengths.reduce(function (t, n) {
                return t + n;
            })).div(24 * 60 * 60).toDigits(3);
        }
    },
    total_funds: () => Data.totalFunds,
    avg_roi: () => Data.avgROI,
    cycle_roi: () => {
        switch (Data.cyclePhase) {
            case 0:
            return BigNumber(0);
            case 1:
            return Data.currROI;
        }
    },
    raw_roi_data: () => Data.ROIArray,
    ranking: () => Data.kairoRanking,
    shares_price: () => Data.sharesPrice,
    kairo_price: () => Data.kairoPrice,
    kairo_total_supply: () => Data.kairoTotalSupply
};

export const tokens = {
    token_data: () => Data.TOKEN_DATA,
    asset_symbol_to_daily_price_change: (_symbol) => Data.assetSymbolToDailyPriceChange(_symbol),
    asset_symbol_to_weekly_price_change: (_symbol) => Data.assetSymbolToWeeklyPriceChange(_symbol),
    asset_symbol_to_monthly_price_change: (_symbol) => Data.assetSymbolToMonthlyPriceChange(_symbol),
    asset_symbol_to_price: (_symbol) => Data.assetSymbolToPrice(_symbol),
    asset_symbol_to_name: (_symbol) => Data.assetSymbolToName(_symbol),
    asset_symbol_to_logo_url: (_symbol) => Data.assetSymbolToLogoUrl(_symbol),
    asset_symbol_to_ptokens: (_symbol) => Data.assetSymbolToPTokens(_symbol),
    get_ptoken_price: (_addr, _underlyingPrice) => betoken.getPTokenPrice(_addr, _underlyingPrice), // returns promise
    not_stablecoin: (_symbol) => Data.notStablecoin(_symbol),
    is_compound_token: (_symbol) => Data.isCompoundToken(_symbol),
    is_fulcrum_token: (_symbol) => Data.isFulcrumToken(_symbol),
    fulcrum_min_stake: (_symbol, _isShort) => Data.fulcrumMinStake(_symbol, _isShort)
};

export const loading = {
    investments: () => Data.isLoadingInvestments || Data.isLoadingPrices,
    ranking: () => Data.isLoadingRanking || Data.isLoadingPrices,
    records: () => Data.isLoadingRecords || Data.isLoadingUserData,
    prices: () => Data.isLoadingPrices
};

export const refresh_actions = {
    investments: () => {
        return Data.loadTokenPrices().then(Data.loadUserData);
    },
    ranking: () => {
        return Data.loadTokenPrices().then(Data.loadRanking);
    },
    records: () => {
        return Data.loadUserData().then(Data.loadTxHistory);
    },
    prices: () => {
        return Data.loadTokenPrices();
    },
    stats: () => {
        return Data.loadTokenPrices().then(Data.loadRanking).then(Data.loadUserData).then(Data.loadStats);
    },
    reload_all: () => {
        const betoken = new Betoken();
        return betoken.init().then(Data.loadDynamicData);
    }
};

export const investor_actions = {
    // All amounts must be BigNumber, in floating point (no need to multiply by 1e18)
    depositETH: async (amt, pending, confirm, error) => {
        betoken.depositETH(amt, pending, confirm, error);
    },
    depositDAI: async (amt, pending, confirm, error) => {
        betoken.depositDAI(amt, pending, confirm, error);
    },
    depositToken: async (amt, tokenSymbol, pending, confirm, error) => {
        let tokenAddr = Data.assetSymbolToAddress(tokenSymbol);
        betoken.depositToken(tokenAddr, amt, pending, confirm, error);
    },
    withdrawETH: async (amt, pending, confirm, error) => {
        return betoken.withdrawETH(amt, pending, confirm, error);
    },
    withdrawDAI: async (amt, pending, confirm, error) => {
        return betoken.withdrawDAI(amt, pending, confirm, error);
    },
    withdrawToken: async (amt, tokenSymbol, pending, confirm, error) => {
        let tokenAddr = Data.assetSymbolToAddress(tokenSymbol);
        return betoken.withdrawToken(tokenAddr, amt, pending, confirm, error);
    },
    nextPhase: async () => {
        await betoken.nextPhase();
        await Data.loadDynamicData();
    }
};

export const manager_actions = {
    // All amounts must be BigNumber, in floating point (no need to multiply by 1e18)
    new_investment_with_symbol: async function (tokenSymbol, stakeInKRO, minPrice, maxPrice, pending, confirm, error) {
        var tokenAddress = Data.assetSymbolToAddress(tokenSymbol);
        betoken.createInvestment(tokenAddress, stakeInKRO, minPrice, maxPrice, pending, confirm, error);
    },
    new_investment_with_address: async function (tokenAddress, stakeInKRO, minPrice, maxPrice, pending, confirm, error) {
        betoken.createInvestment(tokenAddress, stakeInKRO, minPrice, maxPrice, pending, confirm, error);
    },
    sell_investment: async function (id, percentage, minPrice, maxPrice, pending, confirm, error) {
        return betoken.sellAsset(id, percentage, minPrice, maxPrice, pending, confirm, error);
    },
    new_compound_order: async function (orderType, tokenSymbol, stakeInKRO, minPrice, maxPrice, pending, confirm, error) {
        var tokenAddress = Data.assetSymbolToCTokenAddress(tokenSymbol);
        betoken.createCompoundOrder(orderType, tokenAddress, stakeInKRO, minPrice, maxPrice, pending, confirm, error);
    },
    sell_compound_order: async function (id, minPrice, maxPrice, pending, confirm, error) {
        return betoken.sellCompoundOrder(id, minPrice, maxPrice, pending, confirm, error);
    },
    repay_compound_order: async function (id, amountInDAI, pending, confirm, error) {
        return betoken.repayCompoundOrder(id, amountInDAI, pending, confirm, error);
    },
    redeem_commission: async function (inShares, pending, confirm, error) {
        return betoken.redeemCommission(inShares, pending, confirm, error);
    },
    redeem_commission_for_cycle: async function (inShares, cycle, pending, confirm, error) {
        return betoken.redeemCommissionForCycle(inShares, cycle, pending, confirm, error);
    },
    nextPhase: async () => {
        await betoken.nextPhase();
        await Data.loadDynamicData();
    },
    register_with_DAI: async (amountInDAI, pending, confirm, error) => {
        return betoken.registerWithDAI(amountInDAI, pending, confirm, error);
    },
    register_with_ETH: async (amountInETH, pending, confirm, error) => {
        return betoken.registerWithETH(amountInETH, pending, confirm, error);
    },
    register_with_token: async (amountInToken, symbol, pending, confirm, error) => {
        let tokenAddr = Data.assetSymbolToAddress(symbol);
        return betoken.registerWithToken(tokenAddr, amountInToken, pending, confirm, error);
    }
};