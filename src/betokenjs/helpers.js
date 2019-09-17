// imports
import BigNumber from "bignumber.js";
import {Betoken} from "./betoken-obj";
import 'list.js';
const Data = require("./data-controller");

// constants
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
    token_balance: async (tokenSymbol) => {
        let balance = await betoken.getTokenBalance(Data.assetSymbolToAddress(tokenSymbol), Data.userAddress);
        let decimals = Data.TOKEN_DATA.find((x) => x.symbol === tokenSymbol).decimals;
        return BigNumber(balance).div(Math.pow(10, decimals));
    },
    commission_rate: () => Data.commissionRate,
    asset_fee_rate: () => Data.assetFeeRate
};

export const stats = {
    is_supporter: (_addr) => Data.isSupporter(_addr)
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
    asset_symbol_to_address: (_symbol) => Data.assetSymbolToAddress(_symbol),
    get_ptoken_price: (_addr) => betoken.getPTokenPrice(_addr), // returns promise
    get_token_price: (_addr, _amount) => betoken.getTokenPrice(_addr, _amount),
    not_stablecoin: (_symbol) => Data.notStablecoin(_symbol),
    is_compound_token: (_symbol) => Data.isCompoundToken(_symbol),
    is_fulcrum_token: (_symbol) => Data.isFulcrumToken(_symbol),
    fulcrum_min_stake: (_symbol, _isShort, _kairoPrice) => Data.fulcrumMinStake(_symbol, _isShort, _kairoPrice),
    asset_address_to_symbol: (_addr) => Data.assetAddressToSymbol(_addr),
    ctoken_address_to_symbol: (_addr) => Data.assetCTokenAddressToSymbol(_addr),
    ptoken_address_to_symbol: (_addr) => Data.assetPTokenAddressToSymbol(_addr),
    ptoken_address_to_info: (_addr) => Data.assetPTokenAddressToInfo(_addr),
    getAssetPriceAtTimestamp: (symbol, timestamp) => Data.getAssetPriceAtTimestamp(symbol, timestamp)
};

export const loading = {
    prices: () => Data.isLoadingPrices
};

export const refresh_actions = {
    prices: () => {
        return Data.loadTokenPrices();
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