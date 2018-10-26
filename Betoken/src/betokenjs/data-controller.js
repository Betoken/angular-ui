// imports
import { getDefaultAccount } from './betoken-obj';
import ReactiveVar from "meteor-standalone-reactive-var";
import BigNumber from "bignumber.js";

// constants
const PRECISION = 1e18;
export const TOKENS = require("./kn_token_symbols.json");
const DEPLOYED_BLOCK = 2721413;

// instance variables
// user info
export var userAddress = new ReactiveVar("0x0");
export var kairoBalance = new ReactiveVar(BigNumber(0));
export var sharesBalance = new ReactiveVar(BigNumber(0));
export var investmentBalance = new ReactiveVar(BigNumber(0));
export var investmentList = new ReactiveVar([]);
export var lastCommissionRedemption = new ReactiveVar(0);
export var managerROI = new ReactiveVar(BigNumber(0));
export var transactionHistory = new ReactiveVar([]);

// fund metadata
export var kairoTotalSupply = new ReactiveVar(BigNumber(0));
export var sharesTotalSupply = new ReactiveVar(BigNumber(0));
export var totalFunds = new ReactiveVar(BigNumber(0));
export var commissionRate = new ReactiveVar(BigNumber(0));
export var assetFeeRate = new ReactiveVar(BigNumber(0));

// fund stats
export var fundValue = new ReactiveVar(BigNumber(0));
export var prevROI = new ReactiveVar(BigNumber(0));
export var avgROI = new ReactiveVar(BigNumber(0));
export var prevCommission = new ReactiveVar(BigNumber(0));
export var historicalTotalCommission = new ReactiveVar(BigNumber(0));
export var cycleTotalCommission = new ReactiveVar(BigNumber(0));
export var ROIArray = new ReactiveVar([]);

// cycle timekeeping
export var cycleNumber = new ReactiveVar(0);
export var cyclePhase = new ReactiveVar(0);
export var phaseLengths = new ReactiveVar([]);
export var startTimeOfCyclePhase = new ReactiveVar(0);
export var countdownDay = new ReactiveVar(0);
export var countdownHour = new ReactiveVar(0);
export var countdownMin = new ReactiveVar(0);
export var countdownSec = new ReactiveVar(0);

// ranking
export var kairoRanking = new ReactiveVar([]);

// token data
export var tokenPrices = new ReactiveVar([]);
export var tokenAddresses = new ReactiveVar([]);

// loading indicator
export var isLoadingRecords = new ReactiveVar(true);
export var isLoadingRanking = new ReactiveVar(true);

// network info
export var networkName = new ReactiveVar("");
export var networkPrefix = new ReactiveVar("");

// helpers
const assetSymbolToPrice = function(_symbol) {
    return tokenPrices.get()[TOKENS.indexOf(_symbol)];
};

const assetAddressToSymbol = function(_addr) {
    return TOKENS[tokenAddresses.get().indexOf(_addr)];
};

const assetSymbolToAddress = function(_symbol) {
    return tokenAddresses.get()[TOKENS.indexOf(_symbol)];
};

const clock = () => {
    setInterval(() => {
        var days, distance, hours, minutes, now, seconds, target;
        now = Math.floor(new Date().getTime() / 1000);
        target = startTimeOfCyclePhase.get() + phaseLengths.get()[cyclePhase.get()];
        distance = target - now;
        if (distance > 0) {
            days = Math.floor(distance / (60 * 60 * 24));
            hours = Math.floor((distance % (60 * 60 * 24)) / (60 * 60));
            minutes = Math.floor((distance % (60 * 60)) / 60);
            seconds = Math.floor(distance % 60);
            countdownDay.set(days);
            countdownHour.set(hours);
            countdownMin.set(minutes);
            countdownSec.set(seconds);
        }
    }, 1000);
};

// data loaders
export const loadMetadata = () => {
    // get params
    phaseLengths.set(betoken.getPrimitiveVar("getPhaseLengths").map((x) => +x));
    commissionRate.set(BigNumber(betoken.getPrimitiveVar("commissionRate")).div(PRECISION));
    assetFeeRate.set(BigNumber(betoken.getPrimitiveVar("assetFeeRate")).div(PRECISION));
    tokenAddresses.set(TOKENS.map((_token) => betoken.tokenSymbolToAddress(_token)));
};

export const loadFundData = () => {
    cycleNumber.set(+(betoken.getPrimitiveVar("cycleNumber")));
    cyclePhase.set(+(betoken.getPrimitiveVar("cyclePhase")));
    startTimeOfCyclePhase.set(+(betoken.getPrimitiveVar("startTimeOfCyclePhase")));
    sharesTotalSupply.set(BigNumber(betoken.getShareTotalSupply()).div(PRECISION));
    totalFunds.set(BigNumber(betoken.getPrimitiveVar("totalFundsInDAI")).div(PRECISION));
    kairoTotalSupply.set(BigNumber(betoken.getKairoTotalSupply()).div(PRECISION));

    if (countdownDay.get() == 0 && countdownHour.get() == 0 && countdownMin.get() == 0 && countdownSec.get() == 0) {
        clock();
    }
};

export const loadUserData = async () => {
    if (betoken.hasWeb3) {
        // get network info
        const netID = (await web3.eth.net.getId());
        var net, pre;
        switch (netID) {
            case 1:
            net = "Main Ethereum Network";
            pre = "Main";
            break;
            case 3:
            net = "Ropsten Testnet";
            pre = "Ropsten";
            break;
            case 4:
            net = "Rinkeby Testnet";
            pre = "Rinkeby";
            break;
            case 42:
            net = "Kovan Testnet";
            pre = "Kovan";
            break;
            default:
            net = "Unknown Network";
            pre = "Unknown";
        }
        networkName.set(net);
        networkPrefix.set(pre);

        // Get user address
        await getDefaultAccount();
        const userAddr = web3.eth.defaultAccount;
        if (typeof userAddr !== "undefined") {
            userAddress.set(userAddr);

            // Get shares balance
            sharesBalance.set(BigNumber(betoken.getShareBalance(userAddr)).div(PRECISION));
            if (!sharesTotalSupply.get().isZero()) {
                investmentBalance.set(sharesBalance.get().div(sharesTotalSupply.get()).mul(totalFunds.get()));
            }

            // Get user's Kairo balance
            kairoBalance.set(BigNumber(betoken.getKairoBalance(userAddr)).div(PRECISION));

            // Get last commission redemption cycle number
            lastCommissionRedemption.set(+(betoken.getMappingOrArrayItem("lastCommissionRedemption", userAddr)));

            // Get list of user's investments
            var investments = betoken.getInvestments(userAddress.get());
            for (var id = 0; id < investments.length; i++) {
                const _symbol = betoken.getTokenSymbol(investments[id].tokenAddress);
                investments[id].id = id;
                investments[id].tokenSymbol = _symbol;
                investments[id].investment = BigNumber(investments[id].stake).div(kairoTotalSupply.get()).mul(totalFunds.get()).div(PRECISION);
                investments[id].stake = BigNumber(investments[id].stake).div(PRECISION);
                investments[id].buyPrice = BigNumber(investments[id].buyPrice).div(PRECISION);
                investments[id].sellPrice = investments[id].isSold ? BigNumber(investments[id].sellPrice).div(PRECISION) : assetSymbolToPrice(_symbol);
                investments[id].ROI = BigNumber(investments[id].sellPrice).sub(investments[id].buyPrice).div(investments[id].buyPrice).mul(100);
                investments[id].kroChange = BigNumber(investments[id].ROI).mul(investments[id].stake).div(100);
                investments[id].currValue = BigNumber(investments[id].kroChange).add(investments[id].stake);
            }
            investmentList.set(investments);
            var totalKROChange = investments.map((x) => BigNumber(x.kroChange)).reduce((x, y) => x.add(y));
            var totalStake = investments.map((x) => BigNumber(x.stake)).reduce((x, y) => x.add(y));
            managerROI.set(totalKROChange.div(totalStake).mul(100));
        }
    }
};

export const loadTxHistory = async () => {
    isLoadingRecords.set(true);
    // Get deposit and withdraw history
    transactionHistory.set([]);
    const userAddr = userAddress.get();
    const getDepositWithdrawHistory = async function(_type) {
        var data, entry, event, events, j, len, results, tmp;
        events = (await betoken.drizzle.contracts.BetokenFund.getPastEvents(_type, {
            fromBlock: DEPLOYED_BLOCK,
            filter: {
                _sender: userAddr
            }
        }));
        for (j = 0, len = events.length; j < len; j++) {
            event = events[j];
            data = event.returnValues;
            entry = {
                type: _type,
                timestamp: new Date(+data._timestamp * 1e3).toLocaleString(),
                token: betoken.getTokenSymbol(data._tokenAddress),
                amount: BigNumber(data._tokenAmount).div(10 ** (+(betoken.getTokenDecimals(data._tokenAddress)))).toFormat(4),
                txHash: event.transactionHash
            };
            tmp = transactionHistory.get();
            tmp.push(entry);
            transactionHistory.set(tmp);
        }
    };
    // Get token transfer history
    const getTransferHistory = async function(token, isIn) {
        var _event, data, entry, events, j, len, tokenContract;
        tokenContract = (() => {
            switch (token) {
                case "KRO":
                    return betoken.drizzle.contracts.Kairo;
                case "BTKS":
                    return betoken.drizzle.contracts.Shares;
                default:
                    return null;
            }
        })();
        events = (await tokenContract.getPastEvents("Transfer", {
            fromBlock: DEPLOYED_BLOCK,
            filter: isIn ? {
                to: userAddr
            } : {
                from: userAddr
            }
        }));
        for (j = 0, len = events.length; j < len; j++) {
            _event = events[j];
            if (_event == null) {
                continue;
            }
            data = _event.returnValues;
            if ((isIn && data._to !== userAddr) || (!isIn && data._from !== userAddr)) {
                continue;
            }
            entry = {
                type: "Transfer " + (isIn ? "In" : "Out"),
                token: token,
                amount: BigNumber(data._amount).div(1e18).toFormat(4),
                timestamp: new Date(((await web3.eth.getBlock(_event.blockNumber))).timestamp * 1e3).toLocaleString(),
                txHash: _event.transactionHash
            };
            tmp = transactionHistory.get();
            tmp.push(entry);
            transactionHistory.set(tmp);
        }
    };
    await Promise.all([getDepositWithdrawHistory("Deposit"), getDepositWithdrawHistory("Withdraw"), getTransferHistory("BTKS", true), getTransferHistory("BTKS", false)]);
    var tmp = transactionHistory.get();
    tmp.sort((x, y) => {
        return (new Date(x.timestamp)) < (new Date(y.timestamp));
    })
    transactionHistory.set(tmp);
    isLoadingRecords.set(false);
};

export const loadTokenPrices = () => {
    tokenPrices.set(TOKENS.map((_token) => BigNumber(betoken.getTokenPrice(_token)).div(PRECISION)));
};

export const loadRanking = async () => {
    // activate loader
    isLoadingRanking.set(true);

    // load NewUser events to get list of users
    var events = (await betoken.drizzle.contracts.BetokenFund.getPastEvents("NewUser", {
        fromBlock: DEPLOYED_BLOCK
    }));

    // fetch addresses
    var addresses = events.map((_event) => _event.returnValues._user);
    addresses = Array.from(new Set(addresses)); // remove duplicates
    
    // fetch KRO balances
    var ranking = addresses.map((_addr) => {
        var stake = BigNumber(0);
        var investments = betoken.getInvestments(_addr);
        var addStake, i;
        for (var i = 0; i < investments.length; i++) {
            var inv = investments[i];
            if (!inv.isSold && +inv.cycleNumber === cycleNumber.get()) {
                var currentStakeValue = assetSymbolToPrice(assetAddressToSymbol(inv.tokenAddress))
                    .sub(inv.buyPrice).div(inv.buyPrice).mul(inv.stake).add(inv.stake);
                stake = stake.add(currentStakeValue);
            }
        }
        return {
            // format rank object
            rank: 0,
            address: _addr,
            kairoBalance: BigNumber(betoken.getKairoBalance(_addr)).div(PRECISION).add(stake).toFixed(10)
        };
    });

    // sort entries
    ranking.sort((a, b) => BigNumber(b.kairoBalance).sub(a.kairoBalance).toNumber());

    // give ranks
    ranking = ranking.map((_entry, _id) => {
        _entry.rank = _id + 1;
        return _entry;
    });
    
    // display ranking
    kairoRanking.set(ranking);

    // deactivate loader
    isLoadingRanking.set(false);
};

export const loadStats = async () => {
    // calculate fund value
    var _fundValue = BigNumber(0);
    for (var i = 0; i < TOKENS.length; i++) {
        var _token = TOKENS[i];
        var balance = BigNumber(betoken.getTokenBalance(assetSymbolToAddress(_token), betoken.drizzle.contracts.BetokenFund.address))
            .div(BigNumber(10).toPower(betoken.getTokenDecimals(assetSymbolToAddress(_token))));
        var value = balance.mul(assetSymbolToPrice(_token));
        _fundValue = _fundValue.add(value);
    };
    _fundValue = _fundValue.add(totalFunds.get());
    fundValue.set(_fundValue);

    // Get commissions
    cycleTotalCommission.set(BigNumber(betoken.getMappingOrArrayItem("totalCommissionOfCycle", cycleNumber.get())).div(PRECISION));
    prevCommission.set(BigNumber(betoken.getMappingOrArrayItem("totalCommissionOfCycle", cycleNumber.get() - 1)).div(PRECISION));
    
    // get stats
    var ROIArray = [];
    var totalInputFunds = BigNumber(0);
    var totalOutputFunds = BigNumber(0);
    prevROI.set(BigNumber(0));
    avgROI.set(BigNumber(0));
    historicalTotalCommission.set(BigNumber(0));
    return (await Promise.all([
        betoken.drizzle.contracts.BetokenFund.getPastEvents("TotalCommissionPaid",
        {
            fromBlock: DEPLOYED_BLOCK
        }).then(function(events) {
            var _event,
            commission,
            j,
            len;
            for (j = 0, len = events.length; j < len; j++) {
                _event = events[j];
                commission = BigNumber(_event.returnValues._totalCommissionInDAI).div(PRECISION);
                historicalTotalCommission.set(historicalTotalCommission.get().add(commission));
            }
        }),
        betoken.drizzle.contracts.BetokenFund.getPastEvents("ROI",
        {
            fromBlock: DEPLOYED_BLOCK
        }).then(function(events) {
            var ROI,
            _event,
            data,
            j,
            len;
            for (j = 0, len = events.length; j < len; j++) {
                _event = events[j];
                data = _event.returnValues;
                ROI = BigNumber(data._afterTotalFunds).minus(data._beforeTotalFunds).div(data._beforeTotalFunds).mul(100);
                // Update chart data
                ROIArray.push([+data._cycleNumber, ROI.toNumber()]);
                
                if (+data._cycleNumber === cycleNumber.get() - 1) {
                    prevROI.set(ROI);
                }

                // Update average ROI
                totalInputFunds = totalInputFunds.add(BigNumber(data._beforeTotalFunds).div(PRECISION));
                totalOutputFunds = totalOutputFunds.add(BigNumber(data._afterTotalFunds).div(PRECISION));
            }
            ROIArrayLoaded = true;
        }).then(() => {
            // Take current cycle's ROI into consideration
            if (cyclePhase.get() !== 2) {
                totalInputFunds = totalInputFunds.add(totalFunds.get());
                totalOutputFunds = totalOutputFunds.add(fundValue.get());
            }
            avgROI.set(totalOutputFunds.sub(totalInputFunds).div(totalInputFunds).mul(100));
        })
    ]));
};

export const loadAllData = async function() {
    loadMetadata();
    return loadDynamicData();
};

export const loadDynamicData = async () => {
    loadFundData();
    loadTokenPrices();
    return Promise.all(
        [
            loadUserData().then(loadTxHistory),
            loadRanking(),
            loadStats()
        ]
    );
};