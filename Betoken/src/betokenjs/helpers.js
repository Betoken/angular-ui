// imports
import BigNumber from "bignumber.js";
import {Betoken} from "./betoken-obj";
const Data = require("./data-controller");

// constants
const SEND_TX_ERR = "There was an error during sending your transaction to the Ethereum blockchain. Please check that your inputs are valid and try again later.";
const NO_WEB3_ERR = "Betoken can only be used in a Web3 enabled browser. Please install MetaMask or switch to another browser that supports Web3. You can currently view the fund's data, but cannot make any interactions.";
const WRONG_NETWORK_ERR = "Please switch to the Ropsten Test network.";
var error_msg = "";

// exports

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
}

export const network = {
    network_prefix: () => Data.networkPrefix.get(),
    network_name: () => Data.networkName.get(),
    has_web3: () => betoken.hasWeb3,
    wrong_network: () => betoken.wrongNetwork
}

export const timer = {
    day: () => Data.countdownDay.get(),
    hour: () => Data.countdownHour.get(),
    minute: () => Data.countdownMin.get(),
    second: () => Data.countdownSec.get(),
    phase: () => Data.cyclePhase.get(),
    phase_start_time: () => Data.startTimeOfCyclePhase.get(),
    phase_lengths: () => Data.phaseLengths.get()
}

export const user = {
    address: () => Data.userAddress.get(),
    shares_balance: () => Data.sharesBalance.get(),
    investment_balance: () => Data.investmentBalance.get(),
    kairo_balance: () => Data.kairoBalance.get(),
    token_balance: async (tokenSymbol) => {
        let balance = await betoken.getTokenBalance(Data.assetSymbolToAddress(tokenSymbol), Data.userAddress.get());
        let decimals = Data.TOKEN_DATA.get().find((x) => x.symbol === tokenSymbol).decimals;
        return BigNumber(balance).div(Math.pow(10, decimals));
    },
    monthly_roi: () => Data.managerROI.get(),
    can_redeem_commission: () => {
        return betoken.hasWeb3 && Data.cyclePhase.get() === 0 && Data.lastCommissionRedemption.get() < Data.cycleNumber.get();
    },
    expected_commission: function () {
        if (Data.kairoTotalSupply.get().gt(0)) {
            if (Data.cyclePhase.get() === 0) {
                // Actual commission that will be redeemed
                return Data.kairoBalance.get().div(Data.kairoTotalSupply.get()).times(Data.cycleTotalCommission.get());
            }
            // Expected commission based on previous average ROI
            var roi = stats.cycle_roi().gt(0) ? stats.cycle_roi() : BigNumber(0);
            return user.portfolio_value().div(Data.kairoTotalSupply.get()).times(Data.totalFunds.get()).times(roi.div(100).times(Data.commissionRate.get()).plus(Data.assetFeeRate.get())).times(Data.riskTakenPercentage.get());
        }
        return BigNumber(0);
    },
    commission_history: () => Data.commissionHistory.get(),
    deposit_withdraw_history: () => Data.depositWithdrawHistory,
    investment_list: () => Data.cyclePhase.get() == 1 ? Data.investmentList.get() : [],
    rank: () => {
        var entry, j, len, ref;
        ref = Data.kairoRanking.get();
        for (j = 0, len = ref.length; j < len; j++) {
            entry = ref[j];
            if (entry.address === Data.userAddress.get()) {
                return entry.rank;
            }
        }
        return "N/A";
    },
    portfolio_value: () => Data.portfolioValue.get(),
    portfolio_value_in_dai: () => {
        return Data.portfolioValue.get().times(Data.totalFunds.get()).div(Data.kairoTotalSupply.get());
    },
    risk_taken_percentage: () => Data.riskTakenPercentage.get(),
}

export const stats = {
    cycle_length: () => {
        if (Data.phaseLengths.get().length > 0) {
            return BigNumber(Data.phaseLengths.get().reduce(function (t, n) {
                return t + n;
            })).div(24 * 60 * 60).toDigits(3);
        }
    },
    total_funds: () => Data.totalFunds.get(),
    avg_roi: () => Data.avgROI.get(),
    cycle_roi: () => {
        switch (Data.cyclePhase.get()) {
            case 0:
                return BigNumber(0);
            case 1:
                return Data.currROI.get();
        }
    },
    raw_roi_data: () => Data.ROIArray.get(),
    ranking: () => Data.kairoRanking.get(),
    shares_price: () => Data.sharesPrice.get(),
    kairo_price: () => Data.kairoPrice.get()
}

export const tokens = {
    token_data: () => Data.TOKEN_DATA,
    asset_symbol_to_daily_price_change: (_symbol) => Data.assetSymbolToDailyPriceChange(_symbol),
    asset_symbol_to_weekly_price_change: (_symbol) => Data.assetSymbolToWeeklyPriceChange(_symbol),
    asset_symbol_to_monthly_price_change: (_symbol) => Data.assetSymbolToMonthlyPriceChange(_symbol),
    asset_symbol_to_price: (_symbol) => Data.assetSymbolToPrice(_symbol),
    asset_symbol_to_name: (_symbol) => Data.assetSymbolToName(_symbol),
    asset_symbol_to_logo_url: (_symbol) => Data.assetSymbolToLogoUrl(_symbol),
    not_stablecoin: (_symbol) => Data.notStablecoin(_symbol),
    is_compound_token: (_symbol) => Data.isCompoundToken(_symbol)
}

export const loading = {
    investments: () => Data.isLoadingInvestments.get(),
    ranking: () => Data.isLoadingRanking.get(),
    records: () => Data.isLoadingRecords.get(),
    prices: () => Data.isLoadingPrices.get()
}

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
        return Data.loadUserData().then(Data.loadStats);
    },
    reload_all: () => {
        const betoken = new Betoken();
        return betoken.init().then(Data.loadDynamicData);
    }
}

export const investor_actions = {
    // All amounts must be BigNumber, in floating point (no need to multiply by 1e18)
    depositETH: async (amt, pending, confirm) => {
        try {
            betoken.depositETH(amt, pending, confirm);
        } catch (error) {
            error_notifications.set_error_msg(error);
        }
    },
    depositDAI: async (amt, pending, confirm) => {
        try {
            betoken.depositDAI(amt, pending, confirm);
        } catch (error) {
            error_notifications.set_error_msg(error);
        }
    },
    depositToken: async (amt, tokenSymbol, pending, confirm) => {
        try {
            let tokenAddr = Data.assetSymbolToAddress(tokenSymbol);
            betoken.depositToken(tokenAddr, amt, pending, confirm);
        } catch (error) {
            error_notifications.set_error_msg(error);
        }
    },
    withdrawETH: async (amt, pending, confirm) => {
        try {
            return betoken.withdrawETH(amt, pending, confirm);
        } catch (error) {
            error_notifications.set_error_msg(error);
        }
    },
    withdrawDAI: async (amt, pending, confirm) => {
        try {
            return betoken.withdrawDAI(amt, pending, confirm);
        } catch (error) {
            error_notifications.set_error_msg(error);
        }
    },
    withdrawToken: async (amt, tokenSymbol, pending, confirm) => {
        try {
            let tokenAddr = Data.assetSymbolToAddress(tokenSymbol);
            return betoken.withdrawToken(tokenAddr, amt, pending, confirm);
        } catch (error) {
            error_notifications.set_error_msg(error);
        }
    },
    nextPhase: async () => {
        await betoken.nextPhase();
        await Data.loadDynamicData();
    }
}

export const manager_actions = {
    // All amounts must be BigNumber, in floating point (no need to multiply by 1e18)
    new_investment: async function (tokenSymbol, stakeInKRO, minPrice, maxPrice, pending, confirm) {
        try {
            var tokenAddress = Data.assetSymbolToAddress(tokenSymbol);
            betoken.createInvestment(tokenAddress, stakeInKRO, minPrice, maxPrice, pending, confirm);
        } catch (error) {
            error_notifications.set_error_msg(SEND_TX_ERR);
        }
    },
    sell_investment: async function (id, percentage, minPrice, maxPrice, pending, confirm) {
        try {
            return betoken.sellAsset(id, percentage, minPrice, maxPrice, pending, confirm);
        } catch(error) {
            error_notifications.set_error_msg(SEND_TX_ERR);
        }
    },
    new_compound_order: async function (orderType, tokenSymbol, stakeInKRO, minPrice, maxPrice, pending, confirm) {
        try {
            var tokenAddress = Data.assetSymbolToCTokenAddress(tokenSymbol);
            betoken.createCompoundOrder(orderType, tokenAddress, stakeInKRO, minPrice, maxPrice, pending, confirm);
        } catch (error) {
            error_notifications.set_error_msg(SEND_TX_ERR);
        }
    },
    sell_compound_order: async function (id, minPrice, maxPrice, pending, confirm) {
        try {
            return betoken.sellCompoundOrder(id, minPrice, maxPrice, pending, confirm);
        } catch(error) {
            error_notifications.set_error_msg(SEND_TX_ERR);
        }
    },
    repay_compound_order: async function (id, amountInDAI, pending, confirm) {
        try {
            return betoken.repayCompoundOrder(id, amountInDAI, pending, confirm);
        } catch(error) {
            error_notifications.set_error_msg(SEND_TX_ERR);
        }
    },
    redeem_commission: async function (pending, confirm) {
        try {
            return betoken.redeemCommission(false, pending, confirm);
        } catch(error) {
            error_notifications.set_error_msg(SEND_TX_ERR);
        }
    },
    redeem_commission_in_shares: async function (pending, confirm) {
        try {
            return betoken.redeemCommission(true, pending, confirm);
        } catch (error) {
            error_notifications.set_error_msg(SEND_TX_ERR);
        }
    },
    nextPhase: async () => {
        await betoken.nextPhase();
        await Data.loadDynamicData();
    },
    register_with_DAI: async (amountInDAI, pending, confirm) => {
        try {
            return betoken.registerWithDAI(amountInDAI, pending, confirm);
        } catch (error) {
            error_notifications.set_error_msg(SEND_TX_ERR);
        }
    },
    register_with_ETH: async (amountInETH, pending, confirm) => {
        try {
            return betoken.registerWithETH(amountInETH, pending, confirm);
        } catch (error) {
            error_notifications.set_error_msg(SEND_TX_ERR);
        }
    },
    register_with_token: async (tokenAddr, amountInToken, pending, confirm) => {
        try {
            return betoken.registerWithToken(tokenAddr, amountInToken, pending, confirm);
        } catch (error) {
            error_notifications.set_error_msg(SEND_TX_ERR);
        }
    }
}
