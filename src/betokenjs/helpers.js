// imports
import BigNumber from "bignumber.js";
import { Betoken, PRECISION } from "./betoken-obj";
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
    asset_fee_rate: () => Data.assetFeeRate,
    commission_balance: () => Data.commissionBalance
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
    fulcrum_min_stake: (_addr, _kairoPrice) => Data.fulcrumMinStake(_addr, _kairoPrice),
    asset_address_to_symbol: (_addr) => Data.assetAddressToSymbol(_addr),
    ctoken_address_to_symbol: (_addr) => Data.assetCTokenAddressToSymbol(_addr),
    ptoken_address_to_symbol: (_addr) => Data.assetPTokenAddressToSymbol(_addr),
    ptoken_address_to_info: (_addr) => Data.assetPTokenAddressToInfo(_addr),
    getAssetPriceAtTimestamp: (symbol, timestamp) => Data.getAssetPriceAtTimestamp(symbol, timestamp)
};

export const governance = {
    chunk: () => Data.chunk,
    subchunk: () => Data.subchunk,
    totalVotingWeight: () => Data.totalVotingWeight,
    getVotingWeight: async (addr) => new BigNumber(await betoken.getMappingOrArrayItem('getVotingWeight', addr)).div(PRECISION),
    getUpgradeHistory: () => betoken.getUpgradeHistory(),
    signalUpgrade: (_inSupport, _onTxHash, _onReceipt, _onError) => betoken.signalUpgrade(_inSupport, _onTxHash, _onReceipt, _onError),
    proposeCandidate: (_chunkNumber, _candidate, _onTxHash, _onReceipt, _onError) => betoken.proposeCandidate(_chunkNumber, _candidate, _onTxHash, _onReceipt, _onError),
    voteOnCandidate: (_chunkNumber, _inSupport, _onTxHash, _onReceipt, _onError) => betoken.voteOnCandidate(_chunkNumber, _inSupport, _onTxHash, _onReceipt, _onError),
    finalizeSuccessfulVote: (_chunkNumber, _onTxHash, _onReceipt, _onError) => betoken.finalizeSuccessfulVote(_chunkNumber, _onTxHash, _onReceipt, _onError),
}

export const loading = {
    prices: () => Data.isLoadingPrices
};

export const refresh_actions = {
    prices: () => {
        return Data.loadTokenPrices();
    },
    reload_all: () => {
        return betoken.init(false).then(Data.loadDynamicData);
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
    new_investment_with_symbol: async function (tokenSymbol, stakeInKRO, minPrice, maxPrice, useKyber, kairoPrice, pending, confirm, error) {
        let tokenAddress = Data.assetSymbolToAddress(tokenSymbol);
        let calldata = await Data.generateBuyDexagCalldata(tokenSymbol, stakeInKRO, kairoPrice);
        betoken.createInvestmentV2(tokenAddress, stakeInKRO, minPrice, maxPrice, calldata, useKyber, pending, confirm, error);
    },
    new_investment_with_address: async function (tokenAddress, stakeInKRO, minPrice, maxPrice, pending, confirm, error) {
        betoken.createInvestment(tokenAddress, stakeInKRO, minPrice, maxPrice, pending, confirm, error);
    },
    sell_investment: async function (id, percentage, minPrice, maxPrice, pending, confirm, error) {
        return betoken.sellAsset(id, percentage, minPrice, maxPrice, pending, confirm, error);
    },
    sell_investment_v2: async function (id, percentage, minPrice, maxPrice, useKyber, pending, confirm, error) {
        let investment = await betoken.getDoubleMapping("userInvestments", betoken.accountState.address, id);
        let sellTokenAddress = investment.tokenAddress;
        let sellTokenDecimals = +(await betoken.getTokenDecimals(sellTokenAddress));
        let sellTokenAmount = BigNumber(investment.tokenAmount).times(percentage).div(BigNumber(10).pow(sellTokenDecimals));
        let calldata = await Data.generateSellDexagCalldata(Data.assetAddressToSymbol(sellTokenAddress), sellTokenAmount);
        return betoken.sellAssetV2(id, percentage, minPrice, maxPrice, calldata, useKyber, pending, confirm, error);
    },
    new_compound_order: async function (orderType, tokenSymbol, stakeInKRO, minPrice, maxPrice, pending, confirm, error) {
        let tokenAddress = Data.assetSymbolToCTokenAddress(tokenSymbol);
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

export const utils = {
    toKairoROI: function (investmentROI) {
        let punishmentThreshold = -0.1;
        let burnThreshold = -0.25;
        let punishmentSlope = 6;
        let punishmentBias = 0.5;
        if (investmentROI.gte(punishmentThreshold)) {
            // no punishment
            return investmentROI;
        } else if (investmentROI.lt(punishmentThreshold) && investmentROI.gt(burnThreshold)) {
            // punishment
            return investmentROI.times(punishmentSlope).plus(punishmentBias);
        } else {
            // burn
            return BigNumber(-1);
        }
    },
};