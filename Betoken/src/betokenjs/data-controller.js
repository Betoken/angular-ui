// imports
import { getDefaultAccount } from './betoken-obj';
import ReactiveVar from "meteor-standalone-reactive-var";
import BigNumber from "bignumber.js";
import https from "https";

// constants
const PRECISION = 1e18;
export const TOKENS = require("./kn_token_symbols.json");
const DEPLOYED_BLOCK = 2721413;
const DAI_ADDR = "0x6f2d6ff85efca691aad23d549771160a12f0a0fc";

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
export var portfolioValue = new ReactiveVar(BigNumber(0));

// fund metadata
export var kairoTotalSupply = new ReactiveVar(BigNumber(0));
export var sharesTotalSupply = new ReactiveVar(BigNumber(0));
export var totalFunds = new ReactiveVar(BigNumber(0));
export var commissionRate = new ReactiveVar(BigNumber(0));
export var assetFeeRate = new ReactiveVar(BigNumber(0));

// fund stats
export var fundValue = new ReactiveVar(BigNumber(0));
export var currROI = new ReactiveVar(BigNumber(0));
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
export var tokenDailyPriceChanges = new ReactiveVar([]);
export var tokenWeeklyPriceChanges = new ReactiveVar([]);
export var tokenMonthlyPriceChanges = new ReactiveVar([]);

// loading indicator
export var isLoadingRanking = new ReactiveVar(true);
export var isLoadingInvestments = new ReactiveVar(true);
export var isLoadingRecords = new ReactiveVar(true);
export var isLoadingPrices = new ReactiveVar(true);

// network info
export var networkName = new ReactiveVar("");
export var networkPrefix = new ReactiveVar("");

// helpers
export const assetSymbolToPrice = function(_symbol) {
    return tokenPrices.get()[TOKENS.indexOf(_symbol)];
};

export const assetAddressToSymbol = function(_addr) {
    return TOKENS[tokenAddresses.get().indexOf(_addr)];
};

export const assetSymbolToAddress = function(_symbol) {
    return tokenAddresses.get()[TOKENS.indexOf(_symbol)];
};

export const assetSymbolToDailyPriceChange = function(_symbol) {
    return tokenDailyPriceChanges.get()[TOKENS.indexOf(_symbol)];
};

export const assetSymbolToWeeklyPriceChange = function(_symbol) {
    return tokenWeeklyPriceChanges.get()[TOKENS.indexOf(_symbol)];
};

export const assetSymbolToMonthlyPriceChange = function(_symbol) {
    return tokenMonthlyPriceChanges.get()[TOKENS.indexOf(_symbol)];
};

const clock = () => {
    const timeKeeper = setInterval(() => {
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
        } else {
            clearInterval(timeKeeper);
        }
    }, 1000);
};

// data loaders
export const loadMetadata = async () => {
    return Promise.all([
        // get params
        phaseLengths.set(((await betoken.getPrimitiveVar("getPhaseLengths"))).map(x => +x)),
        commissionRate.set(BigNumber((await betoken.getPrimitiveVar("commissionRate"))).div(PRECISION)),
        assetFeeRate.set(BigNumber((await betoken.getPrimitiveVar("assetFeeRate"))).div(PRECISION)),
        tokenAddresses.set((await Promise.all(TOKENS.map(async (_token) => {
            return await betoken.tokenSymbolToAddress(_token);
        }))))
    ]);
};

export const loadFundData = async () => {
    return Promise.all([
        cycleNumber.set(+((await betoken.getPrimitiveVar("cycleNumber")))),
        cyclePhase.set(+((await betoken.getPrimitiveVar("cyclePhase")))), 
        startTimeOfCyclePhase.set(+((await betoken.getPrimitiveVar("startTimeOfCyclePhase")))),
        sharesTotalSupply.set(BigNumber((await betoken.getShareTotalSupply())).div(PRECISION)),
        totalFunds.set(BigNumber((await betoken.getPrimitiveVar("totalFundsInDAI"))).div(PRECISION)),
        kairoTotalSupply.set(BigNumber((await betoken.getKairoTotalSupply())).div(PRECISION))
    ]).then(() => {
        if (countdownDay.get() == 0 && countdownHour.get() == 0 && countdownMin.get() == 0 && countdownSec.get() == 0) {
            clock();
        }
    });
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
            sharesBalance.set(BigNumber((await betoken.getShareBalance(userAddr))));
            if (!sharesTotalSupply.get().isZero()) {
                investmentBalance.set(sharesBalance.get().div(sharesTotalSupply.get()).mul(totalFunds.get()));
            }

            // Get user's Kairo balance
            kairoBalance.set(BigNumber((await betoken.getKairoBalance(userAddr))).div(PRECISION));

            // Get last commission redemption cycle number
            lastCommissionRedemption.set(+((await betoken.getMappingOrArrayItem("lastCommissionRedemption", userAddr))));

            // Get list of user's investments
            isLoadingInvestments.set(true);
            var investments = await betoken.getInvestments(userAddr);
            var stake = BigNumber(0);
            if (investments.length > 0) {
                investments = investments.filter((x) => +x.cycleNumber == cycleNumber.get());
                const handleProposal = (id) => {
                    return betoken.getTokenSymbol(investments[id].tokenAddress).then(function(_symbol) {
                        investments[id].id = id;
                        investments[id].tokenSymbol = _symbol;
                        investments[id].investment = BigNumber(investments[id].stake).div(kairoTotalSupply.get()).mul(totalFunds.get()).div(PRECISION);
                        investments[id].stake = BigNumber(investments[id].stake).div(PRECISION);
                        investments[id].buyPrice = BigNumber(investments[id].buyPrice).div(PRECISION);
                        investments[id].sellPrice = investments[id].isSold ? BigNumber(investments[id].sellPrice).div(PRECISION) : assetSymbolToPrice(_symbol);
                        investments[id].ROI = BigNumber(investments[id].sellPrice).sub(investments[id].buyPrice).div(investments[id].buyPrice).mul(100);
                        investments[id].kroChange = BigNumber(investments[id].ROI).mul(investments[id].stake).div(100);
                        investments[id].currValue = BigNumber(investments[id].kroChange).add(investments[id].stake);

                        if (!investments[id].isSold && +investments[id].cycleNumber === cycleNumber.get()) {
                            var currentStakeValue = assetSymbolToPrice(assetAddressToSymbol(investments[id].tokenAddress))
                                .sub(investments[id].buyPrice).div(investments[id].buyPrice).mul(investments[id].stake).add(investments[id].stake);
                            stake = stake.add(currentStakeValue);
                        }
                    });
                };
                const handleAllProposals = () => {
                    var results = [];
                    for (var i = 0; i < investments.length; i++) {
                        results.push(handleProposal(i));
                    }
                    return results;
                };
                await Promise.all(handleAllProposals());
                investmentList.set(investments);
                var totalKROChange = investments.map((x) => BigNumber(x.kroChange)).reduce((x, y) => x.add(y));
                var totalStake = investments.map((x) => BigNumber(x.stake)).reduce((x, y) => x.add(y));
                managerROI.set(totalKROChange.div(totalStake).mul(100));
            }
            isLoadingInvestments.set(false);
        }
        portfolioValue.set(stake.add(kairoBalance.get()));
    }
};

export const loadTxHistory = async () => {
    isLoadingRecords.set(true);
    // Get deposit and withdraw history
    transactionHistory.set([]);
    const userAddr = userAddress.get();
    const getDepositWithdrawHistory = async function(_type) {
        var data, entry, event, events, j, len, tmp;
        events = (await betoken.contracts.BetokenFund.getPastEvents(_type, {
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
                token: await betoken.getTokenSymbol(data._tokenAddress),
                amount: BigNumber(data._tokenAmount).div(10 ** (+(await betoken.getTokenDecimals(data._tokenAddress)))).toFormat(4),
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
                    return betoken.contracts.Kairo;
                case "BTKS":
                    return betoken.contracts.Shares;
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
    tmp.sort((x, y) => new Date(y.timestamp) - new Date(x.timestamp));
    transactionHistory.set(tmp);
    isLoadingRecords.set(false);
};

export const loadTokenPrices = async () => {
    isLoadingPrices.set(true);

    tokenPrices.set(await Promise.all(TOKENS.map(async (_token) => {
        return betoken.getTokenPrice(_token).then((_price) => {
            return BigNumber(_price).div(PRECISION);
        });
    })));

    loadPriceChanges(1).then((changes) => {
        tokenDailyPriceChanges.set(changes);
    });
    loadPriceChanges(7).then((changes) => {
        tokenWeeklyPriceChanges.set(changes);
    });
    loadPriceChanges(30).then((changes) => {
        tokenMonthlyPriceChanges.set(changes);
    });
    
    isLoadingPrices.set(false);
};

const loadPriceChanges = async (_daysInPast) => {
    var i = 0;
    var result = [];
    while (i < TOKENS.length) {
        var tokens = [];
        while (i < TOKENS.length && tokens.join().length + TOKENS[i].length + 1 <= 30) {
            tokens.push(TOKENS[i]);
            i++;
        }

        const apiStr = `https://min-api.cryptocompare.com/data/pricehistorical?fsym=DAI&tsyms=${tokens.join()}&ts=${Math.floor(Date.now() / 1000 - 86400 * _daysInPast)}`;
        const data = await (new Promise((resolve, reject) => {
            https.get(apiStr, (res) => {
                var rawData = "";
                res.on("data", (chunk) => {
                    rawData += chunk;
                });
                res.on("end", () => {
                    var parsedData = JSON.parse(rawData);
                    resolve(parsedData);
                });
            }).on("error", reject);
        }));

        for (var t in tokens) {
            const _token = tokens[t];
            const pastPrice = BigNumber(1).div(data.DAI[_token]);
            result.push(assetSymbolToPrice(_token).sub(pastPrice).div(pastPrice).mul(100));
        }
    }
    return result;
}

export const loadRanking = async () => {
    // activate loader
    isLoadingRanking.set(true);
    kairoRanking.set([]);
    
    // load NewUser events to get list of users
    var events = await betoken.contracts.BetokenFund.getPastEvents("NewUser", {
        fromBlock: DEPLOYED_BLOCK
    });

    // fetch addresses
    var addresses = events.map((_event) => _event.returnValues._user);
    addresses = Array.from(new Set(addresses)); // remove duplicates

    // fetch KRO balances
    var ranking = await Promise.all(addresses.map((_addr) => {
        var stake = BigNumber(0);
        return betoken.getInvestments(_addr).then(async (investments) => {
            var totalKROChange = BigNumber(0);
            var totalStake = BigNumber(0);
            for (var i = 0; i < investments.length; i++) {
                var inv = investments[i];
                if (!inv.isSold && +inv.cycleNumber === cycleNumber.get()) {
                    var currentStakeValue = assetSymbolToPrice(assetAddressToSymbol(inv.tokenAddress))
                        .sub(inv.buyPrice).div(inv.buyPrice).mul(inv.stake).add(inv.stake);
                    stake = stake.add(currentStakeValue);
                }
                if (+inv.cycleNumber === cycleNumber.get()) {
                    var _symbol = await betoken.getTokenSymbol(inv.tokenAddress);
                    var _stake = BigNumber(inv.stake).div(PRECISION);
                    var _buyPrice = BigNumber(inv.buyPrice).div(PRECISION);
                    var _sellPrice = inv.isSold ? BigNumber(inv.sellPrice).div(PRECISION) : assetSymbolToPrice(_symbol);
                    var _ROI = BigNumber(_sellPrice).sub(_buyPrice).div(_buyPrice);
                    var _kroChange = BigNumber(_ROI).mul(_stake);

                    totalKROChange = totalKROChange.add(_kroChange);
                    totalStake = totalStake.add(_stake);
                }
            }

            return {
                // format rank object
                rank: 0,
                address: _addr,
                kairoBalance: BigNumber(await betoken.getKairoBalance(_addr)).div(PRECISION).add(stake).toFormat(10),
                cycleROI: totalStake.isZero() ? BigNumber(0).toFormat(4) : totalKROChange.div(totalStake).mul(100).toFormat(4)
            };
        });
    }));

    // sort entries
    ranking.sort((a, b) => BigNumber(b.kairoBalance).sub(a.kairoBalance).toNumber());
    ranking = ranking.filter((x) => +x.kairoBalance > 0);

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
    // Get commissions
    Promise.all([
        cycleTotalCommission.set(BigNumber((await betoken.getMappingOrArrayItem("totalCommissionOfCycle", cycleNumber.get()))).div(PRECISION)),
        prevCommission.set(BigNumber((await betoken.getMappingOrArrayItem("totalCommissionOfCycle", cycleNumber.get() - 1))).div(PRECISION))
    ]);

    // calculate fund value
    var _fundValue = BigNumber(0);
    const getTokenValue = async (i) => {
        var _token = TOKENS[i];
        var balance = BigNumber(await betoken.getTokenBalance(assetSymbolToAddress(_token), betoken.contracts.BetokenFund.options.address))
            .div(BigNumber(10).toPower(await betoken.getTokenDecimals(assetSymbolToAddress(_token))));
        var value = balance.mul(assetSymbolToPrice(_token));
        _fundValue = _fundValue.add(value);
    };
    const getAllTokenValues = () => {
        var result = [];
        for (var i = 0; i < TOKENS.length; i++) {
            result.push(getTokenValue(i));
        }
        return result;
    }
    await Promise.all(getAllTokenValues());
    var totalDAI = BigNumber(await betoken.getTokenBalance(DAI_ADDR, betoken.contracts.BetokenFund.options.address)).sub(await betoken.getPrimitiveVar("totalCommissionLeft")).div(PRECISION);
    _fundValue = _fundValue.add(totalDAI);
    fundValue.set(_fundValue);

    // get stats
    var rois = [];
    var totalInputFunds = BigNumber(0);
    var totalOutputFunds = BigNumber(0);
    currROI.set(BigNumber(0));
    avgROI.set(BigNumber(0));
    historicalTotalCommission.set(BigNumber(0));
    return Promise.all([
        /*betoken.contracts.BetokenFund.getPastEvents("TotalCommissionPaid",
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
        }),*/
        betoken.contracts.BetokenFund.getPastEvents("ROI",
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
                rois.push([+data._cycleNumber, ROI.toNumber()]);
                
                if (+data._cycleNumber === cycleNumber.get()) {
                    currROI.set(ROI);
                }

                // Update average ROI
                totalInputFunds = totalInputFunds.add(BigNumber(data._beforeTotalFunds).div(PRECISION));
                totalOutputFunds = totalOutputFunds.add(BigNumber(data._afterTotalFunds).div(PRECISION));
            }
            ROIArray.set(rois);
        }).then(() => {
            // Take current cycle's ROI into consideration
            if (cyclePhase.get() !== 2) {
                totalInputFunds = totalInputFunds.add(totalFunds.get());
                totalOutputFunds = totalOutputFunds.add(fundValue.get());
            }
            avgROI.set(totalOutputFunds.sub(totalInputFunds).div(totalInputFunds).mul(100));
        })
    ]);
};

export const loadAllData = async function() {
    return loadMetadata().then(loadDynamicData);
};

export const loadDynamicData = async () => {
    return loadFundData().then(loadTokenPrices).then(() => Promise.all(
        [
            loadUserData().then(loadTxHistory),
            loadRanking(),
            loadStats()
        ]
    ));
};