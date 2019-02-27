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
export var commissionHistory = new ReactiveVar([]);
export var portfolioValue = new ReactiveVar(BigNumber(0));
export var currentStake = new ReactiveVar(BigNumber(0));

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
export var ROIArray = new ReactiveVar([]);
export var cycleTotalCommission = new ReactiveVar(BigNumber(0));

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
export var tokenMetadata = new ReactiveVar([]);
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

export const assetSymbolToMetadata = (_symbol) => {
    return tokenMetadata.get()[TOKENS.indexOf(_symbol)];
}

export const httpsGet = async (apiStr) => {
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
    return data;
}

export const getCommissionHistoryOf = async (addr) => {
    let events = (await betoken.contracts.BetokenFund.getPastEvents("CommissionPaid", {
        fromBlock: DEPLOYED_BLOCK,
        filter: {
            _sender: addr
        }
    }));
    let commissionHistoryArray = [];
    for (let event of events) {
        let entry = {
            cycle: event.returnValues._cycleNumber,
            amount: BigNumber(event.returnValues._commission).div(10 ** 18),
            timestamp: new Date((await web3.eth.getBlock(event.blockNumber)).timestamp * 1e3).toLocaleString(),
            txHash: event.transactionHash
        };
        commissionHistoryArray.push(entry);
    }
    return commissionHistoryArray;
}

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
        })))),
        loadTokenMetadata()
    ]);
};

export const loadTokenMetadata = async () => {
    const apiStr = `https://min-api.cryptocompare.com/data/coin/generalinfo?fsyms=${TOKENS.join()}&tsym=BTC`;
    const data = (await httpsGet(apiStr)).Data;
    let result = data.map((x) => {
        return {
            name: x.CoinInfo.FullName,
            logoUrl: `https://cryptocompare.com${x.CoinInfo.ImageUrl}`
        }
    });
    tokenMetadata.set(result);
}

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
                investmentBalance.set(sharesBalance.get().div(sharesTotalSupply.get()).times(totalFunds.get()));
            }

            // Get user's Kairo balance
            kairoBalance.set(BigNumber((await betoken.getKairoBalance(userAddr))).div(PRECISION));

            // Get last commission redemption cycle number
            lastCommissionRedemption.set(+((await betoken.getMappingOrArrayItem("lastCommissionRedemption", userAddr))));
            cycleTotalCommission.set(BigNumber((await betoken.getMappingOrArrayItem("totalCommissionOfCycle", cycleNumber.get()))).div(PRECISION));

            // Get list of user's investments
            isLoadingInvestments.set(true);
            var investments = await betoken.getInvestments(userAddr);
            var stake = BigNumber(0);
            if (investments.length > 0) {
                const handleProposal = (id) => {
                    return betoken.getTokenSymbol(investments[id].tokenAddress).then(function(_symbol) {
                        investments[id].id = id;
                        investments[id].tokenSymbol = _symbol;
                        investments[id].investment = BigNumber(investments[id].stake).div(kairoTotalSupply.get()).times(totalFunds.get()).div(PRECISION);
                        investments[id].stake = BigNumber(investments[id].stake).div(PRECISION);
                        investments[id].buyPrice = BigNumber(investments[id].buyPrice).div(PRECISION);
                        investments[id].sellPrice = investments[id].isSold ? BigNumber(investments[id].sellPrice).div(PRECISION) : assetSymbolToPrice(_symbol);
                        investments[id].ROI = BigNumber(investments[id].sellPrice).minus(investments[id].buyPrice).div(investments[id].buyPrice).times(100);
                        investments[id].kroChange = BigNumber(investments[id].ROI).times(investments[id].stake).div(100);
                        investments[id].currValue = BigNumber(investments[id].kroChange).plus(investments[id].stake);

                        if (!investments[id].isSold && +investments[id].cycleNumber === cycleNumber.get()) {
                            var currentStakeValue = assetSymbolToPrice(assetAddressToSymbol(investments[id].tokenAddress))
                                .minus(investments[id].buyPrice).div(investments[id].buyPrice).times(investments[id].stake).plus(investments[id].stake);
                            stake = stake.plus(currentStakeValue);
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
                investments = investments.filter((x) => +x.cycleNumber == cycleNumber.get());
                investmentList.set(investments);

                var totalKROChange = investments.map((x) => BigNumber(x.kroChange)).reduce((x, y) => x.plus(y));
                var totalStake = investments.map((x) => BigNumber(x.stake)).reduce((x, y) => x.plus(y), BigNumber(0));
                var totalCurrentStake = investments.filter((x) => x.isSold == false).map((x) => BigNumber(x.currValue)).reduce((x, y) => x.plus(y), BigNumber(0));
                managerROI.set(totalStake.gt(0) ? totalKROChange.div(totalStake).times(100) : BigNumber(0));
                currentStake.set(totalCurrentStake);
            }

            portfolioValue.set(stake.plus(kairoBalance.get()));

            isLoadingInvestments.set(false);
        }
    }
};

export const loadTxHistory = async () => {
    isLoadingRecords.set(true);
    // Get commission history
    commissionHistory.set(await getCommissionHistoryOf(userAddress.get()));
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
        const data = await httpsGet(apiStr);

        for (var t in tokens) {
            const _token = tokens[t];
            const pastPrice = BigNumber(1).div(data.DAI[_token]);
            result.push(assetSymbolToPrice(_token).minus(pastPrice).div(pastPrice).times(100));
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
                // calculate kairo balance
                if (!inv.isSold && +inv.cycleNumber === cycleNumber.get() && cyclePhase.get() == 1) {
                    var currentStakeValue = assetSymbolToPrice(assetAddressToSymbol(inv.tokenAddress))
                        .minus(inv.buyPrice).div(inv.buyPrice).times(inv.stake).plus(inv.stake);
                    stake = stake.plus(currentStakeValue);
                }
                // calculate roi
                if (+inv.cycleNumber === cycleNumber.get() && (cyclePhase.get() == 1 || inv.isSold)) {
                    var _symbol = await betoken.getTokenSymbol(inv.tokenAddress);
                    var _stake = BigNumber(inv.stake).div(PRECISION);
                    var _buyPrice = BigNumber(inv.buyPrice).div(PRECISION);
                    var _sellPrice = inv.isSold ? BigNumber(inv.sellPrice).div(PRECISION) : assetSymbolToPrice(_symbol);
                    var _ROI = BigNumber(_sellPrice).minus(_buyPrice).div(_buyPrice);
                    var _kroChange = BigNumber(_ROI).times(_stake);

                    totalKROChange = totalKROChange.plus(_kroChange);
                    totalStake = totalStake.plus(_stake);
                }
            }

            var history = await getCommissionHistoryOf(_addr);
            var totalCommission = BigNumber(0);
            history.forEach(element => {
                totalCommission = totalCommission.plus(element['amount']);
            });

            return {
                // format rank object
                rank: 0,
                address: _addr,
                kairoBalance: BigNumber(await betoken.getKairoBalance(_addr)).div(PRECISION).plus(stake),
                cycleROI: totalStake.isZero() ? BigNumber(0) : totalKROChange.div(totalStake).times(100),
                commission: totalCommission
            };
        });
    }));

    // sort entries
    ranking.sort((a, b) => BigNumber(b.kairoBalance).minus(a.kairoBalance).toNumber());
    ranking = ranking.filter((x) => BigNumber(x.kairoBalance).gt(0));

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
    const getTokenValue = async (i) => {
        var _token = TOKENS[i];
        var balance = BigNumber(await betoken.getTokenBalance(assetSymbolToAddress(_token), betoken.contracts.BetokenFund.options.address))
            .div(BigNumber(10).pow(await betoken.getTokenDecimals(assetSymbolToAddress(_token))));
        var value = balance.times(assetSymbolToPrice(_token));
        _fundValue = _fundValue.plus(value);
    };
    const getAllTokenValues = () => {
        var result = [];
        for (var i = 0; i < TOKENS.length; i++) {
            result.push(getTokenValue(i));
        }
        return result;
    }
    await Promise.all(getAllTokenValues());
    var totalDAI = BigNumber(await betoken.getTokenBalance(DAI_ADDR, betoken.contracts.BetokenFund.options.address)).minus(await betoken.getPrimitiveVar("totalCommissionLeft")).div(PRECISION);
    _fundValue = _fundValue.plus(totalDAI);
    fundValue.set(_fundValue);

    // get stats
    var rois = [];
    currROI.set(BigNumber(0));
    avgROI.set(BigNumber(0));
    return betoken.contracts.BetokenFund.getPastEvents("ROI",
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
                ROI = BigNumber(data._afterTotalFunds).minus(data._beforeTotalFunds).div(data._beforeTotalFunds).times(100);
                // Update chart data
                rois.push(ROI.toNumber());
                
                if (+data._cycleNumber === cycleNumber.get()) {
                    currROI.set(ROI);
                }
            }
        }).then(() => {
            // Take current cycle's ROI into consideration
            if (cyclePhase.get() === 1) {
                rois.push(fundValue.get().minus(totalFunds.get()).div(totalFunds.get()).times(100));
            }
            ROIArray.set(rois);
            const convertToCumulative = (list) => {
                var tmp = BigNumber(1);
                var tmpArray = [BigNumber(0)];
                for (let roi of list) {
                    tmp = BigNumber(roi).div(100).plus(1).times(tmp);
                    tmpArray.push(tmp.times(100).minus(100));
                }
                return tmpArray;
            }
            
            let cumulative = convertToCumulative(rois);
            avgROI.set(cumulative[cumulative.length - 1]);
        });
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