// imports
import BigNumber from "bignumber.js";
const Data = require("./data-controller");

// constants
const SEND_TX_ERR = "There was an error during sending your transaction to the Ethereum blockchain. Please check that your inputs are valid and try again later.";
const NO_WEB3_ERR = "Betoken can only be used in a Web3 enabled browser. Please install MetaMask or switch to another browser that supports Web3. You can currently view the fund's data, but cannot make any interactions.";
const DEPENDENCY_ERR = "Please enable MetaMask or visit this page in a Web3 browser to interact with Betoken on Ropsten Testnet."
var error_msg = "";

// exports

export const error_notifications = {
    get_error_msg: () => error_msg,
    set_error_msg: (msg) => {
        error_msg = msg;
    },
    check_dependency: () => {
        if (typeof betoken === "undefined") {
            error_notifications.set_error_msg(DEPENDENCY_ERR);
        }
        else {
            if (network.has_web3() === false) {
                error_notifications.set_error_msg(NO_WEB3_ERR);
            } else {
                error_notifications.set_error_msg('');
            }
        }
    }
}

export const network = {
    network_prefix: () => Data.networkPrefix.get(),
    network_name: () => Data.networkName.get(),
    has_web3: () => betoken.hasWeb3
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
    monthly_roi: () => Data.managerROI.get(),
    can_redeem_commission: () => {
        return betoken.hasWeb3 && Data.cyclePhase.get() === 2 && Data.lastCommissionRedemption.get() < Data.cycleNumber.get();
    },
    expected_commission: function () {
        if (Data.kairoTotalSupply.get().gt(0)) {
            if (Data.cyclePhase.get() === 2) {
                // Actual commission that will be redeemed
                return Data.kairoBalance.get().div(Data.kairoTotalSupply.get()).times(Data.cycleTotalCommission.get());
            }
            // Expected commission based on previous average ROI
            var roi = stats.cycle_roi().gt(0) ? stats.cycle_roi() : BigNumber(0);
            return Data.kairoBalance.get().div(Data.kairoTotalSupply.get()).times(Data.totalFunds.get()).times(roi.div(100).times(Data.commissionRate.get()).plus(Data.assetFeeRate.get()));
        }
        return BigNumber(0);
    },
    commission_history: () => Data.commissionHistory.get(),
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
        return Data.portfolioValue.get().times(Data.fundValue.get()).div(Data.kairoTotalSupply.get());
    },
    current_stake: () => Data.currentStake.get()
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
    fund_value: () => Data.fundValue.get(),
    cycle_roi: () => {
        switch (Data.cyclePhase.get()) {
            case 0:
                return BigNumber(0);
            case 1:
                return Data.fundValue.get().minus(Data.totalFunds.get()).div(Data.totalFunds.get()).times(100);
            case 2:
                return Data.currROI.get();
        }
    },
    raw_roi_data: () => Data.ROIArray.get(),
    ranking: () => Data.kairoRanking.get(),
    shares_price: () => Data.sharesPrice.get()
}

export const tokens = {
    token_data: () => Data.TOKEN_DATA,
    asset_symbol_to_daily_price_change: (_symbol) => Data.assetSymbolToDailyPriceChange(_symbol),
    asset_symbol_to_weekly_price_change: (_symbol) => Data.assetSymbolToWeeklyPriceChange(_symbol),
    asset_symbol_to_monthly_price_change: (_symbol) => Data.assetSymbolToMonthlyPriceChange(_symbol),
    asset_symbol_to_price: (_symbol) => Data.assetSymbolToPrice(_symbol),
    asset_symbol_to_name: (_symbol) => Data.assetSymbolToName(_symbol),
    asset_symbol_to_logo_url: (_symbol) => Data.assetSymbolToLogoUrl(_symbol)
}

export const loading = {
    investments: () => Data.isLoadingInvestments.get(),
    ranking: () => Data.isLoadingRanking.get(),
    records: () => Data.isLoadingRecords.get(),
    prices: () => Data.isLoadingPrices.get()
}

export const refresh_actions = {
    investments: () => {
        Data.loadTokenPrices().then(Data.loadUserData);
    },
    ranking: () => {
        Data.loadTokenPrices().then(Data.loadRanking);
    },
    records: () => {
        Data.loadUserData().then(Data.loadTxHistory);
    },
    prices: () => {
        Data.loadTokenPrices();
    }
}

export const investor_actions = {
    depositETH: async (amt, pending, confirm) => {
        var amount;
        try {
            amount = BigNumber(amt);
            betoken.depositETH(amount, pending, confirm);
        } catch (error) {
            error_notifications.set_error_msg(error);
        }
    },
    depositDAI: async (amt, pending, confirm) => {
        var amount;
        try {
            amount = BigNumber(amt);
            betoken.depositDAI(amount, pending, confirm);
        } catch (error) {
            error_notifications.set_error_msg(error);
        }
    },
    depositToken: async (amt, tokenSymbol, pending, confirm) => {
        var amount, tokenAddr, tokenSymbol;
        try {
            amount = BigNumber(amt);
            tokenAddr = await betoken.tokenSymbolToAddress(tokenSymbol);
            betoken.depositToken(tokenAddr, amount, pending, confirm);
        } catch (error) {
            error_notifications.set_error_msg(error);
        }
    },
    withdrawETH: async (amt, pending, confirm) => {
        var amount;
        try {
            amount = BigNumber(amt);
            return betoken.withdrawETH(amount, pending, confirm);
        } catch (error) {
            error_notifications.set_error_msg(error);
        }
    },
    withdrawDAI: async (amt, pending, confirm) => {
        var amount;
        try {
            amount = BigNumber(amt);
            return betoken.withdrawDAI(amount, pending, confirm);
        } catch (error) {
            error_notifications.set_error_msg(error);
        }
    },
    withdrawToken: async (amt, tokenSymbol, pending, confirm) => {
        var amount, tokenAddr, tokenSymbol;
        try {
            amount = BigNumber(amt);
            tokenAddr = betoken.tokenSymbolToAddress(tokenSymbol);
            return betoken.withdrawToken(tokenAddr, amount, pending, confirm);
        } catch (error) {
            error_notifications.set_error_msg(error);
        }
    },
    nextPhase: async () => {
        betoken.nextPhase();
    }
}

export const manager_actions = {
    sell_investment: async function (id, amount, minPrice, maxPrice, pending, confirm) {
        try {
            if (Data.cyclePhase.get() === 1) {
                return betoken.sellAsset(id, amount, minPrice, maxPrice, pending, confirm);
            }
        } catch(error) {
            error_notifications.set_error_msg(SEND_TX_ERR);
        }
    },
    new_investment: async function (tokenSymbol, stakeAmount, minPrice, maxPrice, pending, confirm) {
        var address, kairoAmountInWeis, tokenSymbol;

        try {
            address = (await betoken.tokenSymbolToAddress(tokenSymbol));
            kairoAmountInWeis = BigNumber(stakeAmount).times(1e18);
            betoken.createInvestment(address, kairoAmountInWeis, minPrice, maxPrice, pending, confirm);
        } catch (error) {
            error_notifications.set_error_msg(SEND_TX_ERR);
        }
    },
    redeem_commission: async function (pending, confirm) {
        try {
            return betoken.redeemCommission(pending, confirm);
        } catch(error) {
            error_notifications.set_error_msg(SEND_TX_ERR);
        }
    },

    redeem_commission_in_shares: async function (pending, confirm) {
        try {
            return betoken.redeemCommissionInShares(pending, confirm);
        } catch (error) {
            error_notifications.set_error_msg(SEND_TX_ERR);
        }
    },
    nextPhase: async () => {
        betoken.nextPhase();
    }
}
