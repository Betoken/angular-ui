// imports
import BigNumber from "bignumber.js";
const Data = require("./data-controller");
import { ROIArray, TOKENS, tokenPrices, userAddress, avgROI, fundValue, totalFunds } from "./data-controller";

// constants
const WRONG_NETWORK_ERR = "Please switch to Rinkeby Testnet in order to use Betoken Omen.";
const SEND_TX_ERR = "There was an error during sending your transaction to the Ethereum blockchain. Please check that your inputs are valid and try again later.";
const INPUT_ERR = "There was an error in your input. Please fix it and try again.";
const NO_WEB3_ERR = "Betoken can only be used in a Web3 enabled browser. Please install <a target=\"_blank\" href=\"https://metamask.io/\">MetaMask</a> or switch to another browser that supports Web3. You can currently view the fund's data, but cannot make any interactions.";
const METAMASK_LOCKED_ERR = "Your browser seems to be Web3 enabled, but you need to unlock your account to interact with Betoken.";

// helpers
const checkKairoAmountError = (kairoAmountInWeis) => {
    if (!kairoAmountInWeis.gt(0)) {
        throw new Error("Stake amount should be positive.");
    }
    if (kairoAmountInWeis.gt(kairoBalance.get())) {
        throw new Error("You can't stake more Kairos than you have!");
    }
};

// exports
export var network = {
    network_prefix: () => Data.networkPrefix.get(),
    network_name: () => Data.networkName.get(),
    has_web3: () => betoken.hasWeb3
};

export var timer = {
    day: () => Data.countdownDay.get(),
    hour: () => Data.countdownHour.get(),
    minute: () => Data.countdownMin.get(),
    second: () => Data.countdownSec.get(),
    phase: () => Data.cyclePhase.get()
}

export var user = {
    address: () => Data.userAddress.get(),
    share_balance: () => Data.investmentBalance.get(),
    kairo_balance: () => Data.kairoBalance.get(),
    can_redeem_commission: () => Data.cyclePhase.get() === 2 && Data.lastCommissionRedemption.get() < Data.cycleNumber.get(),
    expected_commission: function () {
        var roi;
        if (Data.kairoTotalSupply.get().greaterThan(0)) {
            if (Data.cyclePhase.get() === 2) {
                // Actual commission that will be redeemed
                return Data.kairoBalance.get().div(Data.kairoTotalSupply.get()).mul(Data.cycleTotalCommission.get()).toFormat(18);
            }
            // Expected commission based on previous average ROI
            roi = Data.avgROI.get().gt(0) ? Data.avgROI.get() : BigNumber(0);
            return Data.kairoBalance.get().div(Data.kairoTotalSupply.get()).mul(Data.totalFunds.get()).mul(Data.roi.div(100).mul(Data.commissionRate.get()).add(Data.assetFeeRate.get()));
        }
        return BigNumber(0);
    },
    transaction_history: () => Data.transactionHistory.get(),
    investment_list: () => Data.investmentList.get(),
    rank: async function () {
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
    portfolio_value: function () {
        var entry, j, len, ref;
        ref = Data.kairoRanking.get();
        for (j = 0, len = ref.length; j < len; j++) {
            entry = ref[j];
            if (entry.address === Data.userAddress.get()) {
                return BigNumber(entry.kairoBalance).toFixed(10);
            }
        }
        return "N/A";
    }
}

export var stats = {
    cycle_length: () => {
        if (Data.phaseLengths.get().length > 0) {
            return BigNumber(Data.phaseLengths.get().reduce(function (t, n) {
                return t + n;
            })).div(24 * 60 * 60).toDigits(3);
        }
    },
    total_funds: () => Data.totalFunds.get(),
    prev_roi: () => Data.prevROI.get(),
    avg_roi: () => Data.avgROI.get(),
    fund_value: () => Data.fundValue.get(),
    cycle_roi: () => Data.fundValue.get().sub(Data.totalFunds.get()).div(Data.totalFunds.get()).mul(100),
    raw_roi_data: () => Data.ROIArray.get(),
    ranking: () => Data.kairoRanking.get()
}

export var tokens = {
    token_list: () => TOKENS,
    token_prices: () => Data.tokenPrices.get()
}

export var loading = {
    investments: () => Data.isLoadingInvestments.get(),
    rankings: () => Data.isLoadingRanking.get(),
    records: () => Data.isLoadingRecords.get(),
    prices: () => Data.isLoadingPrices.get()
}

export var investor_actions = {
    deposit_button: async function (amt, tokenSymbol, pending, confirm, handledataSuccess, handledataError) {
        var amount, tokenAddr, tokenSymbol;
        try {
            amount = BigNumber(amt);
            if (!amount.gt(0)) {
                handledataError('Amount must be greater than zero.');
                return;
            }
            tokenAddr = betoken.tokenSymbolToAddress(tokenSymbol);
            handledataSuccess(betoken.depositToken(tokenAddr, amount, pending, confirm));
            return;
        } catch (error1) {
            handledataError(error1);
            return;
        }
    },
    withdraw_button: async function (amt, tokenSymbol, pending, confirm, handledataSuccess, handledataError) {
        var amount, error, tokenAddr, tokenSymbol;
        try {
            amount = BigNumber(amt);
            if (!amount.greaterThan(0)) {
                handledataError('Amount must be greater than zero.');
                return;
            }
            tokenAddr = betoken.tokenSymbolToAddress(tokenSymbol);
            handledataSuccess(betoken.withdrawToken(tokenAddr, amount, pending, confirm));
            return;
        } catch (error1) {
            handledataError(error1);
            return;
        }
    }
}

export var manager_actions = {
    sell_investment: async function (id, pending, confirm) {
        if (Data.cyclePhase.get() === 1) {
            return betoken.sellAsset(id, pending, confirm);
        }
    },
    new_investment: async function (tokenSymbol, amt, pending, confirm) {
        var address, error, kairoAmountInWeis, tokenSymbol;
        try {
            address = (await betoken.tokenSymbolToAddress(tokenSymbol));
            kairoAmountInWeis = BigNumber(amt).times("1e18");
            checkKairoAmountError(kairoAmountInWeis);
            betoken.createInvestment(address, kairoAmountInWeis, pending, confirm);
            return;
        } catch (error1) {
            console.log(error1);
            showError(error1.toString() || INPUT_ERR);
        }
    },
    redeem_commission: async function (pending, confirm) {
        return betoken.redeemCommission(showTransaction, loadUserData, pending, confirm);
    },

    redeem_commission_in_shares: async function (pending, confirm) {
        return betoken.redeemCommissionInShares(showTransaction, loadDynamicData, pending, confirm);
    }
}
