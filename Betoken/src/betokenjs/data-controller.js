// imports
import { getDefaultAccount, DAI_ADDR, CompoundOrder } from './betoken-obj';
import BigNumber from "bignumber.js";
import https from "https";
import { isUndefined } from 'util';

// constants
const PRECISION = 1e18;
const DEPLOYED_BLOCK = 5168545;
const ZERO_ADDR = '0x0000000000000000000000000000000000000000';
const CTOKENS = require('./json_data/compound_tokens.json'); // Compound cTokens
const STABLECOINS = require('./json_data/stablecoins.json'); // Stablecoins (managers can't invest)
const PTOKENS = require('./json_data/fulcrum_tokens.json'); // Fulcrum pTokens
const UNSAFE_COL_RATIO_MULTIPLIER = 1.1;
const COL_RATIO_MODIFIER = 4 / 3;

// instance variables
// user info
export var userAddress = ZERO_ADDR;
export var kairoBalance = BigNumber(0);
export var sharesBalance = BigNumber(0);
export var investmentBalance = BigNumber(0);
export var investmentList = [];
export var lastCommissionRedemption = 0;
export var managerROI = BigNumber(0);
export var commissionHistory = [];
export var depositWithdrawHistory = [];
export var portfolioValue = BigNumber(0);
export var riskTakenPercentage = BigNumber(0);

// fund metadata
export var kairoTotalSupply = BigNumber(0);
export var sharesTotalSupply = BigNumber(0);
export var totalFunds = BigNumber(0);
export var commissionRate = BigNumber(0);
export var assetFeeRate = BigNumber(0);

// fund stats
export var currROI = BigNumber(0);
export var avgROI = BigNumber(0);
export var ROIArray = [];
export var cycleTotalCommission = BigNumber(0);
export var sharesPrice = BigNumber(0);
export var kairoPrice = BigNumber(0);

// cycle timekeeping
export var cycleNumber = 0;
export var cyclePhase = 0;
export var phaseLengths = [];
export var startTimeOfCyclePhase = 0;
export var countdownDay = 0;
export var countdownHour = 0;
export var countdownMin = 0;
export var countdownSec = 0;

// ranking
export var kairoRanking = [];

// token data
export var TOKEN_DATA = [];

// loading indicator
export var isLoadingRanking = true;
export var isLoadingInvestments = true;
export var isLoadingRecords = true;
export var isLoadingPrices = true;

// network info
export var networkName = "";
export var networkPrefix = "";

// helpers
export const assetSymbolToPrice = function(_symbol) {
    return TOKEN_DATA.find((x) => x.symbol === _symbol).price;
};

export const assetAddressToSymbol = function(_addr) {
    return TOKEN_DATA.find((x) => x.address === _addr).symbol;
};

export const assetSymbolToAddress = function(_symbol) {
    return TOKEN_DATA.find((x) => x.symbol === _symbol).address;
};

export const assetSymbolToCTokenAddress = (_symbol) => {
    return CTOKENS.find((x) => x.symbol === _symbol).address;
}

export const assetSymbolToPTokens = (_symbol) => {
    return PTOKENS.find((x) => x.symbol === _symbol).pTokens;
}

export const assetCTokenAddressToSymbol = (_addr) => {
    return CTOKENS.find((x) => x.address === _addr).symbol;
}

export const assetPTokenAddressToSymbol = (_addr) => {
    return PTOKENS.find((x) => !isUndefined(x.pTokens.find((y) => y.address === _addr))).symbol;
}

export const assetPTokenAddressToInfo = (_addr) => {
    return PTOKENS.find((x) => !isUndefined(x.pTokens.find((y) => y.address === _addr))).pTokens.find((y) => y.address === _addr);
}

export const assetSymbolToDailyPriceChange = function(_symbol) {
    return TOKEN_DATA.find((x) => x.symbol === _symbol).dailyPriceChange;
};

export const assetSymbolToWeeklyPriceChange = function(_symbol) {
    return TOKEN_DATA.find((x) => x.symbol === _symbol).weeklyPriceChange;
};

export const assetSymbolToMonthlyPriceChange = function(_symbol) {
    return TOKEN_DATA.find((x) => x.symbol === _symbol).monthlyPriceChange;
};

export const assetSymbolToName = (_symbol) => {
    return TOKEN_DATA.find((x) => x.symbol === _symbol).name;
}

export const assetSymbolToLogoUrl = (_symbol) => {
    return TOKEN_DATA.find((x) => x.symbol === _symbol).logoUrl;
}

export const notStablecoin = (_symbol) => {
    return !STABLECOINS.includes(_symbol);
}

export const isCompoundToken = (_symbol) => {
    const result = CTOKENS.find((x) => x.symbol === _symbol);
    return !isUndefined(result);
}

export const isFulcrumToken = (_symbol) => {
    const result = PTOKENS.find((x) => x.symbol === _symbol);
    return !isUndefined(result);
}

export const isFulcrumTokenAddress = (_tokenAddress) => {
    const result = PTOKENS.find((x) => !isUndefined(x.pTokens.find((y) => y.address === _tokenAddress)));
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
        target = startTimeOfCyclePhase + phaseLengths[cyclePhase];
        distance = target - now;
        if (distance > 0) {
            days = Math.floor(distance / (60 * 60 * 24));
            hours = Math.floor((distance % (60 * 60 * 24)) / (60 * 60));
            minutes = Math.floor((distance % (60 * 60)) / 60);
            seconds = Math.floor(distance % 60);
            countdownDay = days;
            countdownHour = hours;
            countdownMin = minutes;
            countdownSec = seconds;
        } else {
            clearInterval(timeKeeper);
        }
    }, 1000);
};

// data loaders
export const loadMetadata = async () => {
    return Promise.all([
        // get params
        phaseLengths = ((await betoken.getPrimitiveVar("getPhaseLengths"))).map(x => +x),
        commissionRate = BigNumber((await betoken.getPrimitiveVar("COMMISSION_RATE"))).div(PRECISION),
        assetFeeRate = BigNumber((await betoken.getPrimitiveVar("ASSET_FEE_RATE"))).div(PRECISION),
        loadTokenMetadata()
    ]);
};

export const loadTokenMetadata = async () => {
    // fetch token data from Kyber API
    let apiStr = `https://api.kyber.network/currencies`;
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
    let tokenLogos = [];
    for (let token of tokenData) {
        let info = rawData.find((x) => x.CoinInfo.Name === token.symbol);
        if (isUndefined(info)) {
            // token not on cryptocompare, use filler
            tokenLogos.push('/assets/img/icons/no-logo-asset.svg');
        } else {
            tokenLogos.push(`https://cryptocompare.com${info.CoinInfo.ImageUrl}`);
        }
    }
    tokenData = tokenData.map((x, i) => {
        x.logoUrl = tokenLogos[i];
        return x;
    });

    TOKEN_DATA = tokenData;
}

export const loadFundData = async () => {
    return Promise.all([
        cycleNumber = +((await betoken.getPrimitiveVar("cycleNumber"))),
        cyclePhase = +((await betoken.getPrimitiveVar("cyclePhase"))),
        startTimeOfCyclePhase = +((await betoken.getPrimitiveVar("startTimeOfCyclePhase"))),
        sharesTotalSupply = BigNumber((await betoken.getShareTotalSupply())).div(PRECISION),
        totalFunds = BigNumber((await betoken.getPrimitiveVar("totalFundsInDAI"))).div(PRECISION),
        kairoTotalSupply = BigNumber((await betoken.getKairoTotalSupply())).div(PRECISION)
    ]).then(() => {
        if (countdownDay == 0 && countdownHour == 0 && countdownMin == 0 && countdownSec == 0) {
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
        networkName = net;
        networkPrefix = pre;

        // Get user address
        await getDefaultAccount();
        const userAddr = web3.eth.defaultAccount;
        if (typeof userAddr !== "undefined") {
            userAddress = userAddr;

            // Get shares balance
            sharesBalance = BigNumber((await betoken.getShareBalance(userAddr))).div(PRECISION);
            if (!sharesTotalSupply.isZero()) {
                investmentBalance = sharesBalance.div(sharesTotalSupply).times(totalFunds);
            }

            // Get user's Kairo balance
            kairoBalance = BigNumber((await betoken.getKairoBalance(userAddr))).div(PRECISION);

            // Get last commission redemption cycle number
            lastCommissionRedemption = +((await betoken.getMappingOrArrayItem("lastCommissionRedemption", userAddr)));
            cycleTotalCommission = BigNumber((await betoken.getMappingOrArrayItem("totalCommissionOfCycle", cycleNumber))).div(PRECISION);

            // Get user's risk profile
            let risk = BigNumber(await betoken.getRiskTaken(userAddr)).div(await betoken.getRiskThreshold(userAddr));
            risk = BigNumber.min(risk, 1); // Meaningless after exceeding 1
            riskTakenPercentage = BigNumber(await betoken.getRiskTaken(userAddr)).div(await betoken.getRiskThreshold(userAddr));

            isLoadingInvestments = true;
            var stake = BigNumber(0);
            var totalKROChange = BigNumber(0);

            // Get list of user's investments
            var investments = await betoken.getInvestments(userAddr);
            if (investments.length > 0) {
                const handleProposal = async (id) => {
                    let inv = investments[id];
                    let symbol = "";
                    if (isFulcrumTokenAddress(inv.tokenAddress)) {
                        symbol = assetPTokenAddressToSymbol(inv.tokenAddress);

                        inv.type = "fulcrum";
                        inv.id = id;
                        inv.tokenSymbol = symbol;
                        inv.stake = BigNumber(inv.stake).div(PRECISION);
                        inv.buyPrice = BigNumber(inv.buyPrice).div(PRECISION);
                        inv.sellPrice = inv.isSold ? BigNumber(inv.sellPrice).div(PRECISION) : await betoken.getPTokenPrice(inv.tokenAddress, assetSymbolToPrice(symbol));
                        inv.ROI = BigNumber(inv.sellPrice).minus(inv.buyPrice).div(inv.buyPrice).times(100);
                        inv.kroChange = BigNumber(inv.ROI).times(inv.stake).div(100);
                        inv.currValue = BigNumber(inv.kroChange).plus(inv.stake);
                        inv.buyTime = new Date(+inv.buyTime * 1e3);

                        let info = assetPTokenAddressToInfo(inv.tokenAddress);
                        inv.leverage = info.leverage;
                        inv.orderType = info.type;

                        inv.liquidationPrice = await betoken.getPTokenLiquidationPrice(inv.tokenAddress, assetSymbolToPrice(symbol));
                        inv.safety = inv.liquidationPrice.minus(inv.sellPrice).div(inv.sellPrice).abs().gt(UNSAFE_COL_RATIO_MULTIPLIER - 1);


                        if (!inv.isSold && +inv.cycleNumber === cycleNumber) {
                            var currentStakeValue = inv.sellPrice
                                .minus(inv.buyPrice).div(inv.buyPrice).times(inv.stake).plus(inv.stake);
                            stake = stake.plus(currentStakeValue);
                        }
                    } else {
                        symbol = assetAddressToSymbol(inv.tokenAddress);

                        inv.type = "basic";
                        inv.id = id;
                        inv.tokenSymbol = symbol;
                        inv.stake = BigNumber(inv.stake).div(PRECISION);
                        inv.buyPrice = BigNumber(inv.buyPrice).div(PRECISION);
                        inv.sellPrice = inv.isSold ? BigNumber(inv.sellPrice).div(PRECISION) : assetSymbolToPrice(symbol);
                        inv.ROI = BigNumber(inv.sellPrice).minus(inv.buyPrice).div(inv.buyPrice).times(100);
                        inv.kroChange = BigNumber(inv.ROI).times(inv.stake).div(100);
                        inv.currValue = BigNumber(inv.kroChange).plus(inv.stake);
                        inv.buyTime = new Date(+inv.buyTime * 1e3);

                        if (!inv.isSold && +inv.cycleNumber === cycleNumber) {
                            var currentStakeValue = inv.sellPrice
                                .minus(inv.buyPrice).div(inv.buyPrice).times(inv.stake).plus(inv.stake);
                            stake = stake.plus(currentStakeValue);
                        }
                    }
                    investments[id] = inv;
                };
                const handleAllProposals = () => {
                    var results = [];
                    for (var i = 0; i < investments.length; i++) {
                        results.push(handleProposal(i));
                    }
                    return results;
                };
                await Promise.all(handleAllProposals());
                investments = investments.filter((x) => +x.cycleNumber == cycleNumber);

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
                compoundOrders = compoundOrders.filter((x) => +x.cycleNumber == cycleNumber);
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
                    o.safety = o.collateralRatio.gt(o.minCollateralRatio.times(UNSAFE_COL_RATIO_MULTIPLIER));
                    o.leverage = o.orderType ? o.minCollateralRatio.times(COL_RATIO_MODIFIER).pow(-1).dp(4).toNumber() : BigNumber(1).plus(o.minCollateralRatio.times(COL_RATIO_MODIFIER).pow(-1)).dp(4).toNumber();
                    o.type = "compound";

                    if (!o.isSold) {
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

            investmentList = investments.concat(compoundOrders);
            portfolioValue = stake.plus(kairoBalance);
            var cycleStartKRO = BigNumber(await betoken.getBaseStake(userAddr)).div(PRECISION);
            managerROI = cycleStartKRO.gt(0) ? totalKROChange.div(cycleStartKRO).times(100) : BigNumber(0);
        }
    }
    isLoadingInvestments = false;
};

export const loadTxHistory = async () => {
    if (userAddress != ZERO_ADDR) {
        isLoadingRecords = true;
        // Get commission history
        let events = (await betoken.contracts.BetokenFund.getPastEvents("CommissionPaid", {
            fromBlock: DEPLOYED_BLOCK,
            filter: {
                _sender: userAddress
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
        commissionHistory = commissionHistoryArray;

        // Get Deposit & Withdraw history
        let depositWithdrawHistoryArray = [];
        const getDepositWithdrawHistory = async function(_type) {
            var data, entry, event, events, j, len;
            events = (await betoken.contracts.BetokenFund.getPastEvents(_type, {
                fromBlock: DEPLOYED_BLOCK,
                filter: {
                    _sender: userAddress
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
        depositWithdrawHistory = depositWithdrawHistoryArray;
    }
    isLoadingRecords = false;
};

export const loadTokenPrices = async () => {
    isLoadingPrices = true;

    let tokenPrices = await Promise.all(TOKEN_DATA.map(async (_token) => {
        return betoken.getTokenPrice(_token.address);
    }));
    TOKEN_DATA = TOKEN_DATA.map((x, i) => {
        x.price = tokenPrices[i];
        return x;
    }).filter((x) => x.price.gt(0));

    let apiStr = "https://api.kyber.network/change24h";
    let rawData = await httpsGet(apiStr);
    TOKEN_DATA = TOKEN_DATA.map((x) => {
        x.dailyPriceChange = BigNumber(rawData[`ETH_${x.symbol}`].change_usd_24h);
        return x;
    });

    loadPriceChanges(7).then((changes) => {
        TOKEN_DATA = TOKEN_DATA.map((x, i) => {
            x.weeklyPriceChange = changes[i];
            return x;
        });
    });
    loadPriceChanges(30).then((changes) => {
        TOKEN_DATA = TOKEN_DATA.map((x, i) => {
            x.monthlyPriceChange = changes[i];
            return x;
        });
    });

    isLoadingPrices = false;
};

const loadPriceChanges = async (_daysInPast) => {
    var i = 0;
    var result = [];
    while (i < TOKEN_DATA.length) {
        var tokens = [];
        while (i < TOKEN_DATA.length && tokens.join().length + TOKEN_DATA[i].symbol.length + 1 <= 30) {
            tokens.push(TOKEN_DATA[i].symbol);
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
    isLoadingRanking = true;
    kairoRanking = [];

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
        var totalKROChange = BigNumber(0);
        return betoken.getInvestments(_addr).then(async (investments) => {
            for (var i = 0; i < investments.length; i++) {
                var inv = investments[i];
                let symbol = "";
                let tokenPrice = BigNumber(0);
                if (isFulcrumTokenAddress(inv.tokenAddress)) {
                    symbol = assetPTokenAddressToSymbol(inv.tokenAddress);
                    tokenPrice = await betoken.getPTokenPrice(inv.tokenAddress, assetSymbolToPrice(symbol));
                } else {
                    symbol = assetAddressToSymbol(inv.tokenAddress);
                    tokenPrice = assetSymbolToPrice(symbol);
                }
                // calculate kairo balance
                if (!inv.isSold && +inv.cycleNumber === cycleNumber && cyclePhase == 1) {
                    var currentStakeValue = tokenPrice
                        .minus(inv.buyPrice).div(inv.buyPrice).times(inv.stake).plus(inv.stake);
                    stake = stake.plus(currentStakeValue);
                }
                // calculate roi
                if (+inv.cycleNumber === cycleNumber) {
                    var _stake = BigNumber(inv.stake).div(PRECISION);
                    var _buyPrice = BigNumber(inv.buyPrice).div(PRECISION);
                    var _sellPrice = inv.isSold ? BigNumber(inv.sellPrice).div(PRECISION) : tokenPrice;
                    var _ROI = BigNumber(_sellPrice).minus(_buyPrice).div(_buyPrice);
                    var _kroChange = BigNumber(_ROI).times(_stake);

                    totalKROChange = totalKROChange.plus(_kroChange);
                }
            }
        }).then(async () => {
            var compoundOrderAddrs = await betoken.getCompoundOrders(_addr);
            var compoundOrders = new Array(compoundOrderAddrs.length);
            if (compoundOrderAddrs.length > 0) {
                const properties = ["stake", "cycleNumber", "collateralAmountInDAI", "isSold", "getCurrentProfitInDAI"];
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
                compoundOrders = compoundOrders.filter((x) => +x.cycleNumber == cycleNumber);
                for (let o of compoundOrders) {
                    o.stake = BigNumber(o.stake).div(PRECISION);
                    o.collateralAmountInDAI = BigNumber(o.collateralAmountInDAI).div(PRECISION);
                    o.currProfit = BigNumber(o.getCurrentProfitInDAI._amount).times(o.getCurrentProfitInDAI._isNegative ? -1 : 1).div(PRECISION);
                    o.ROI = o.currProfit.div(o.collateralAmountInDAI).times(100);
                    o.kroChange = o.ROI.times(o.stake).div(100);

                    if (!o.isSold) {
                        var currentStakeValue = o.stake.times(o.ROI.div(100).plus(1));
                        stake = stake.plus(currentStakeValue);
                    }

                    delete o.getCurrentProfitInDAI;
                }

                totalKROChange = totalKROChange.plus(compoundOrders.map((x) => BigNumber(x.kroChange)).reduce((x, y) => x.plus(y), BigNumber(0)));
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
    kairoRanking = ranking;

    // deactivate loader
    isLoadingRanking = false;
};

export const loadStats = async () => {
    if (!sharesTotalSupply.isZero() && userAddress !== ZERO_ADDR) {
        investmentBalance = sharesBalance.div(sharesTotalSupply).times(totalFunds);
    }

    if (!sharesTotalSupply.isZero()) {
        sharesPrice = BigNumber(1).div(sharesTotalSupply).times(totalFunds);
    } else {
        sharesPrice = BigNumber(1);
    }

    if (!kairoTotalSupply.isZero()) {
        var price = totalFunds.div(kairoTotalSupply);
        kairoPrice = BigNumber.max(price, BigNumber(2.5));
    } else {
        kairoPrice = BigNumber(2.5);
    }

    // get stats
    var rois = [];
    currROI = BigNumber(0);
    avgROI = BigNumber(0);
    return betoken.contracts.BetokenFund.getPastEvents("ChangedPhase",
        {
            fromBlock: DEPLOYED_BLOCK
        }).then(function(events) {
            for (var cycle = 1; cycle <= cycleNumber; cycle++) {
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
            if (cyclePhase === 1 && cycleNumber > 0) {
                var beforeEvent = events.find((e) => e.returnValues._cycleNumber == cycleNumber && e.returnValues._newPhase == 1);
                var beforeTotalFunds = BigNumber(beforeEvent.returnValues._totalFundsInDAI).div(PRECISION);
                var currentCycleROI = totalFunds.minus(beforeTotalFunds).div(beforeTotalFunds).times(100);
                currROI = currentCycleROI;
                rois.push(currentCycleROI);
            }
        }).then(() => {
            ROIArray = rois;
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
            avgROI = cumulative[cumulative.length - 1];
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
