// imports
import { getDefaultAccount, DAI_ADDR, CompoundOrder } from './betoken-obj';
import ReactiveVar from "meteor-standalone-reactive-var";
import BigNumber from "bignumber.js";
import https from "https";
import { isUndefined } from 'util';

// constants
const PRECISION = 1e18;
const DEPLOYED_BLOCK = 5168545;
const ZERO_ADDR = '0x0000000000000000000000000000000000000000';
const CTOKENS = require('./compound_tokens.json');
const STABLECOINS = require('./stablecoins.json');
const UNSAFE_COL_RATIO = 1.65;

// instance variables
// user info
export var userAddress = new ReactiveVar(ZERO_ADDR);
export var kairoBalance = new ReactiveVar(BigNumber(0));
export var sharesBalance = new ReactiveVar(BigNumber(0));
export var investmentBalance = new ReactiveVar(BigNumber(0));
export var investmentList = new ReactiveVar([]);
export var lastCommissionRedemption = new ReactiveVar(0);
export var managerROI = new ReactiveVar(BigNumber(0));
export var commissionHistory = new ReactiveVar([]);
export var depositWithdrawHistory = new ReactiveVar([]);
export var portfolioValue = new ReactiveVar(BigNumber(0));
export var riskTakenPercentage = new ReactiveVar(BigNumber(0));

// fund metadata
export var kairoTotalSupply = new ReactiveVar(BigNumber(0));
export var sharesTotalSupply = new ReactiveVar(BigNumber(0));
export var totalFunds = new ReactiveVar(BigNumber(0));
export var commissionRate = new ReactiveVar(BigNumber(0));
export var assetFeeRate = new ReactiveVar(BigNumber(0));

// fund stats
export var currROI = new ReactiveVar(BigNumber(0));
export var avgROI = new ReactiveVar(BigNumber(0));
export var ROIArray = new ReactiveVar([]);
export var cycleTotalCommission = new ReactiveVar(BigNumber(0));
export var sharesPrice = new ReactiveVar(BigNumber(0));
export var kairoPrice = new ReactiveVar(BigNumber(0));

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
export var TOKEN_DATA = new ReactiveVar([]);

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
    return TOKEN_DATA.get().find((x) => x.symbol === _symbol).price;
};

export const assetAddressToSymbol = function(_addr) {
    return TOKEN_DATA.get().find((x) => x.address === _addr).symbol;
};

export const assetSymbolToAddress = function(_symbol) {
    return TOKEN_DATA.get().find((x) => x.symbol === _symbol).address;
};

export const assetSymbolToCTokenAddress = (_symbol) => {
    return CTOKENS.find((x) => x.symbol === _symbol).address;
}

export const assetCTokenAddressToSymbol = (_addr) => {
    return CTOKENS.find((x) => x.address === _addr).symbol;
}

export const assetSymbolToDailyPriceChange = function(_symbol) {
    return TOKEN_DATA.get().find((x) => x.symbol === _symbol).dailyPriceChange;
};

export const assetSymbolToWeeklyPriceChange = function(_symbol) {
    return TOKEN_DATA.get().find((x) => x.symbol === _symbol).weeklyPriceChange;
};

export const assetSymbolToMonthlyPriceChange = function(_symbol) {
    return TOKEN_DATA.get().find((x) => x.symbol === _symbol).monthlyPriceChange;
};

export const assetSymbolToName = (_symbol) => {
    return TOKEN_DATA.get().find((x) => x.symbol === _symbol).name;
}

export const assetSymbolToLogoUrl = (_symbol) => {
    return TOKEN_DATA.get().find((x) => x.symbol === _symbol).logoUrl;
}

export const notStablecoin = (_symbol) => {
    return !STABLECOINS.includes(_symbol);
}

export const isCompoundToken = (_symbol) => {
    const result = CTOKENS.find((x) => x.symbol === _symbol);
    return !isUndefined(result);
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
        commissionRate.set(BigNumber((await betoken.getPrimitiveVar("COMMISSION_RATE"))).div(PRECISION)),
        assetFeeRate.set(BigNumber((await betoken.getPrimitiveVar("ASSET_FEE_RATE"))).div(PRECISION)),
        loadTokenMetadata()
    ]);
};

export const loadTokenMetadata = async () => {
    // fetch token data from Kyber API
    let apiStr = `https://ropsten-api.kyber.network/currencies`;
    let rawData = (await httpsGet(apiStr)).data;
    let tokenData = rawData.map((x) => {
        return {
            name: x.name,
            symbol: x.symbol,
            address: web3.utils.toChecksumAddress(x.address),
            decimals: x.decimals,
            logoUrl: '',
            price: BigNumber(0),
            dailyPriceChange: BigNumber(0),
            weeklyPriceChange: BigNumber(0),
            monthlyPriceChange: BigNumber(0)
        }
    });

    // fetch token metadata from CryptoCompare API
    apiStr = `https://min-api.cryptocompare.com/data/coin/generalinfo?fsyms=${tokenData.map((x) => x.symbol).join()}&tsym=BTC`;
    rawData = (await httpsGet(apiStr)).Data;
    let tokenLogos = rawData.map((x) => `https://cryptocompare.com${x.CoinInfo.ImageUrl}`);
    tokenData = tokenData.map((x, i) => {
        x.logoUrl = tokenLogos[i];
        return x;
    });

    TOKEN_DATA.set(tokenData);
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
            net = "Ropsten Testnet";
            pre = "Ropsten";
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
            sharesBalance.set(BigNumber((await betoken.getShareBalance(userAddr))).div(PRECISION));
            if (!sharesTotalSupply.get().isZero()) {
                investmentBalance.set(sharesBalance.get().div(sharesTotalSupply.get()).times(totalFunds.get()));
            }

            // Get user's Kairo balance
            kairoBalance.set(BigNumber((await betoken.getKairoBalance(userAddr))).div(PRECISION));

            // Get last commission redemption cycle number
            lastCommissionRedemption.set(+((await betoken.getMappingOrArrayItem("lastCommissionRedemption", userAddr))));
            cycleTotalCommission.set(BigNumber((await betoken.getMappingOrArrayItem("totalCommissionOfCycle", cycleNumber.get()))).div(PRECISION));

            // Get user's risk profile
            let risk = BigNumber(await betoken.getRiskTaken(userAddr)).div(await betoken.getRiskThreshold(userAddr));
            risk = BigNumber.min(risk, 1); // Meaningless after exceeding 1
            riskTakenPercentage.set(BigNumber(await betoken.getRiskTaken(userAddr)).div(await betoken.getRiskThreshold(userAddr)));

            isLoadingInvestments.set(true);
            var stake = BigNumber(0);
            var totalKROChange = BigNumber(0);

            // Get list of user's investments
            var investments = await betoken.getInvestments(userAddr);
            if (investments.length > 0) {
                const handleProposal = (id) => {
                    return betoken.getTokenSymbol(investments[id].tokenAddress).then(function(_symbol) {
                        investments[id].type = "basic";
                        investments[id].id = id;
                        investments[id].tokenSymbol = _symbol;
                        investments[id].stake = BigNumber(investments[id].stake).div(PRECISION);
                        investments[id].buyPrice = BigNumber(investments[id].buyPrice).div(PRECISION);
                        investments[id].sellPrice = investments[id].isSold ? BigNumber(investments[id].sellPrice).div(PRECISION) : assetSymbolToPrice(_symbol);
                        investments[id].ROI = BigNumber(investments[id].sellPrice).minus(investments[id].buyPrice).div(investments[id].buyPrice).times(100);
                        investments[id].kroChange = BigNumber(investments[id].ROI).times(investments[id].stake).div(100);
                        investments[id].currValue = BigNumber(investments[id].kroChange).plus(investments[id].stake);
                        investments[id].buyTime = new Date(+investments[id].buyTime * 1e3);

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

                totalKROChange = totalKROChange.plus(investments.map((x) => BigNumber(x.kroChange)).reduce((x, y) => x.plus(y), BigNumber(0)));
            }

            // get list of Compound orders
            var compoundOrderAddrs = await betoken.getCompoundOrders(userAddr);
            var compoundOrders = new Array(compoundOrderAddrs.length);
            if (compoundOrderAddrs.length > 0) {
                const properties = ["stake", "cycleNumber", "collateralAmountInDAI", "compoundTokenAddr", "isSold", "orderType", "buyTime", "getCurrentCollateralRatioInDAI", "getCurrentCollateralInDAI", "getCurrentBorrowInDAI", "getCurrentCashInDAI", "getCurrentProfitInDAI", "getCurrentLiquidityInDAI", "getMarketCollateralFactor"];
                const handleProposal = async (id) => {
                    const order = await CompoundOrder(compoundOrderAddrs[id]);
                    let orderData = {"id": id};
                    compoundOrders[id] = orderData;
                    let promises = [];
                    for (let prop of properties) {
                        promises.push(order.methods[prop]().call().then((x) => orderData[prop] = x));
                    }
                    return await Promise.all(promises);
                };
                const handleAllProposals = () => {
                    var results = [];
                    for (var i = 0; i < compoundOrderAddrs.length; i++) {
                        results.push(handleProposal(i));
                    }
                    return results;
                };
                await Promise.all(handleAllProposals());

                // reformat compound order objects
                compoundOrders = compoundOrders.filter((x) => +x.cycleNumber == cycleNumber.get());
                for (let o of compoundOrders) {
                    o.stake = BigNumber(o.stake).div(PRECISION);
                    o.cycleNumber = +o.cycleNumber;
                    o.collateralAmountInDAI = BigNumber(o.collateralAmountInDAI).div(PRECISION);
                    o.buyTime = new Date(+o.buyTime * 1e3);
                    o.collateralRatio = BigNumber(o.getCurrentCollateralRatioInDAI).div(PRECISION);
                    o.currProfit = BigNumber(o.getCurrentProfitInDAI._amount).times(o.getCurrentProfitInDAI._isNegative ? -1 : 1).div(PRECISION);
                    o.currCollateral = BigNumber(o.getCurrentCollateralInDAI).div(PRECISION);
                    o.currBorrow = BigNumber(o.getCurrentBorrowInDAI).div(PRECISION);
                    o.currCash = BigNumber(o.getCurrentCashInDAI).div(PRECISION);
                    o.minCollateralRatio = BigNumber(PRECISION).div(o.getMarketCollateralFactor);
                    o.currLiquidity = BigNumber(o.getCurrentLiquidityInDAI._amount).times(o.getCurrentLiquidityInDAI._isNegative ? -1 : 1).div(PRECISION);
                    
                    o.ROI = o.currProfit.div(o.collateralAmountInDAI).times(100);
                    o.kroChange = o.ROI.times(o.stake).div(100);
                    o.tokenSymbol = assetCTokenAddressToSymbol(o.compoundTokenAddr);
                    o.currValue = o.stake.plus(o.kroChange);
                    o.safety = o.collateralRatio.gt(UNSAFE_COL_RATIO);
                    o.type = "compound";

                    if (!o.isSold && o.cycleNumber === cycleNumber.get()) {
                        var currentStakeValue = o.stake.times(o.ROI.div(100).plus(1));
                        stake = stake.plus(currentStakeValue);
                    }

                    delete o.getCurrentCollateralRatioInDAI;
                    delete o.getCurrentProfitInDAI;
                    delete o.getCurrentCollateralInDAI;
                    delete o.getCurrentBorrowInDAI;
                    delete o.getCurrentCashInDAI;
                    delete o.getMarketCollateralFactor;
                }

                totalKROChange = totalKROChange.plus(compoundOrders.map((x) => BigNumber(x.kroChange)).reduce((x, y) => x.plus(y), BigNumber(0)));
            }
            investmentList.set(investments.concat(compoundOrders));

            portfolioValue.set(stake.plus(kairoBalance.get()));
            var cycleStartKRO = BigNumber(await betoken.getBaseStake(userAddr)).div(PRECISION);
            managerROI.set(cycleStartKRO.gt(0) ? totalKROChange.div(cycleStartKRO).times(100) : BigNumber(0));
        }
    }
    isLoadingInvestments.set(false);
};

export const loadTxHistory = async () => {
    if (userAddress.get() != ZERO_ADDR) {
        isLoadingRecords.set(true);
        // Get commission history
        let events = (await betoken.contracts.BetokenFund.getPastEvents("CommissionPaid", {
            fromBlock: DEPLOYED_BLOCK,
            filter: {
                _sender: userAddress.get()
            }
        }));
        let commissionHistoryArray = [];
        for (let event of events) {
            let entry = {
                cycle: +event.returnValues._cycleNumber,
                amount: BigNumber(event.returnValues._commission).div(10 ** 18),
                timestamp: new Date((await web3.eth.getBlock(event.blockNumber)).timestamp * 1e3).toLocaleString(),
                txHash: event.transactionHash
            };
            commissionHistoryArray.push(entry);
        }
        commissionHistoryArray.sort((a, b) => b.cycle - a.cycle);
        commissionHistory.set(commissionHistoryArray);

        // Get Deposit & Withdraw history
        let depositWithdrawHistoryArray = [];
        const getDepositWithdrawHistory = async function(_type) {
            var data, entry, event, events, j, len;
            events = (await betoken.contracts.BetokenFund.getPastEvents(_type, {
                fromBlock: DEPLOYED_BLOCK,
                filter: {
                    _sender: userAddress.get()
                }
            }));
            for (j = 0, len = events.length; j < len; j++) {
                event = events[j];
                data = event.returnValues;
                let daiAmount = data._daiAmount;
                entry = {
                    type: _type,
                    timestamp: +data._timestamp,
                    token: await betoken.getTokenSymbol(data._tokenAddress),
                    amount: BigNumber(data._tokenAmount).div(10 ** (+(await betoken.getTokenDecimals(data._tokenAddress)))),
                    daiAmount: BigNumber(daiAmount).div(10 ** 18),
                    txHash: event.transactionHash
                };
                depositWithdrawHistoryArray.push(entry);
            }
        };
        await Promise.all([getDepositWithdrawHistory("Deposit"), getDepositWithdrawHistory("Withdraw")]);
        // sort the history, latest entries come first
        depositWithdrawHistoryArray.sort((a, b) => b.timestamp - a.timestamp);
        // convert timestamps to date strings
        for (var entry of depositWithdrawHistoryArray) {
            entry.timestamp = new Date(entry.timestamp * 1e3).toLocaleString();
        }
        depositWithdrawHistory.set(depositWithdrawHistoryArray);
    }
    isLoadingRecords.set(false);
};

export const loadTokenPrices = async () => {
    isLoadingPrices.set(true);

    let tokenPrices = await Promise.all(TOKEN_DATA.get().map(async (_token) => {
        return betoken.getTokenPrice(_token.address);
    }));
    TOKEN_DATA.set(TOKEN_DATA.get().map((x, i) => {
        x.price = tokenPrices[i];
        return x;
    }));

    loadPriceChanges(1).then((changes) => {
        TOKEN_DATA.set(TOKEN_DATA.get().map((x, i) => {
            x.dailyPriceChange = changes[i];
            return x;
        }));
    });
    loadPriceChanges(7).then((changes) => {
        TOKEN_DATA.set(TOKEN_DATA.get().map((x, i) => {
            x.weeklyPriceChange = changes[i];
            return x;
        }));
    });
    loadPriceChanges(30).then((changes) => {
        TOKEN_DATA.set(TOKEN_DATA.get().map((x, i) => {
            x.monthlyPriceChange = changes[i];
            return x;
        }));
    });
    
    isLoadingPrices.set(false);
};

const loadPriceChanges = async (_daysInPast) => {
    var i = 0;
    var result = [];
    while (i < TOKEN_DATA.get().length) {
        var tokens = [];
        while (i < TOKEN_DATA.get().length && tokens.join().length + TOKEN_DATA.get()[i].symbol.length + 1 <= 30) {
            tokens.push(TOKEN_DATA.get()[i].symbol);
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
    var events = await betoken.contracts.BetokenFund.getPastEvents("Register", {
        fromBlock: DEPLOYED_BLOCK
    });

    // fetch addresses
    var addresses = events.map((_event) => _event.returnValues._manager);
    addresses = Array.from(new Set(addresses)); // remove duplicates

    // fetch KRO balances
    var ranking = await Promise.all(addresses.map((_addr) => {
        var stake = BigNumber(0);
        return betoken.getInvestments(_addr).then(async (investments) => {
            var totalKROChange = BigNumber(0);
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
                }
            }
            var cycleStartKRO = BigNumber(await betoken.getBaseStake(_addr)).div(PRECISION);
            return {
                // format rank object
                rank: 0,
                address: _addr,
                kairoBalance: BigNumber(await betoken.getKairoBalance(_addr)).div(PRECISION).plus(stake),
                cycleROI: cycleStartKRO.isZero() ? BigNumber(0) : totalKROChange.div(cycleStartKRO).times(100)
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
    if (!sharesTotalSupply.get().isZero() && userAddress.get() !== ZERO_ADDR) {
        investmentBalance.set(sharesBalance.get().div(sharesTotalSupply.get()).times(totalFunds.get()));
    }

    if (!sharesTotalSupply.get().isZero()) {
        sharesPrice.set(BigNumber(1).div(sharesTotalSupply.get()).times(totalFunds.get()));
    } else {
        sharesPrice.set(BigNumber(1));
    }

    if (!kairoTotalSupply.get().isZero()) {
        var price = totalFunds.get().div(kairoTotalSupply.get());
        kairoPrice.set(BigNumber.max(price, BigNumber(2.5)));
    } else {
        kairoPrice.set(BigNumber(2.5));
    }

    // get stats
    var rois = [];
    currROI.set(BigNumber(0));
    avgROI.set(BigNumber(0));
    return betoken.contracts.BetokenFund.getPastEvents("ChangedPhase",
        {
            fromBlock: DEPLOYED_BLOCK
        }).then(function(events) {
            for (var cycle = 1; cycle <= cycleNumber.get(); cycle++) {
                // find events emitted before & after the Manage phase of cycle
                var beforeEvent = events.find((e) => e.returnValues._cycleNumber == cycle && e.returnValues._newPhase == 1);
                var afterEvent = events.find((e) => e.returnValues._cycleNumber == cycle + 1 && e.returnValues._newPhase == 0);
                
                if (isUndefined(beforeEvent) || isUndefined(afterEvent)) {
                    break;
                }

                var beforeTotalFunds = BigNumber(beforeEvent.returnValues._totalFundsInDAI);
                var afterTotalFunds = BigNumber(afterEvent.returnValues._totalFundsInDAI);
                var ROI = afterTotalFunds.minus(beforeTotalFunds).div(beforeTotalFunds).times(100);
                if (ROI.isNaN()) {
                    ROI = BigNumber(0);
                }
                rois.push(ROI.toNumber());
            }
            // Take current cycle's ROI into consideration
            if (cyclePhase.get() === 1) {
                var beforeEvent = events.find((e) => e.returnValues._cycleNumber == cycleNumber.get() && e.returnValues._newPhase == 1);
                var beforeTotalFunds = BigNumber(beforeEvent.returnValues._totalFundsInDAI).div(PRECISION);
                var currentCycleROI = totalFunds.get().minus(beforeTotalFunds).div(beforeTotalFunds).times(100);
                currROI.set(currentCycleROI);
                rois.push(currentCycleROI);
            }
        }).then(() => {
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