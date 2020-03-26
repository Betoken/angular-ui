// imports
import { DAI_ADDR, CompoundOrder, DEXAG_ADDR, PRECISION, PositionToken } from './betoken-obj';
import BigNumber from "bignumber.js";
import https from "https";
import { isUndefined, isNullOrUndefined } from 'util';
const fetch = require('node-fetch');

// constants
const ZERO_ADDR = '0x0000000000000000000000000000000000000000';
const CTOKENS = require('./json_data/compound_tokens.json'); // Compound cTokens
const STABLECOINS = require('./json_data/stablecoins.json'); // Stablecoins (managers can't invest)
const PTOKENS = require('./json_data/fulcrum_tokens.json'); // Fulcrum pTokens
const SUPPORTERS = require('./json_data/betoken_supporters.json');
const DEXAG_AMOUNT_MODIFIER = 1 - 1e-9;
const FULCRUM_MINSTAKE_MODIFIER = 2;

// instance variables
// user info
export var userAddress = ZERO_ADDR;
export var commissionBalance = BigNumber(0);

// fund metadata
export var commissionRate = BigNumber(0.2);
export var assetFeeRate = BigNumber(0.01);

// cycle timekeeping
export var cycleNumber = 0;
export var cyclePhase = 0;
export var phaseLengths = [3 * 24 * 60 * 60, 27 * 24 * 60 * 60];
export var startTimeOfCyclePhase = 0;
export var countdownDay = 0;
export var countdownHour = 0;
export var countdownMin = 0;
export var countdownSec = 0;

// governance info
export var chunk = 0;
export var subchunk = 0;
export var totalVotingWeight = BigNumber(0);

export var isLoadingPrices = true;

// token data
export var TOKEN_DATA = [];

// helpers
export const assetSymbolToPrice = function (_symbol) {
    return TOKEN_DATA.find((x) => x.symbol === _symbol).price;
};

export const assetAddressToSymbol = function (_addr) {
    _addr = web3.utils.toChecksumAddress(_addr);
    return TOKEN_DATA.find((x) => x.address === _addr).symbol;
};

export const assetSymbolToAddress = function (_symbol) {
    return TOKEN_DATA.find((x) => x.symbol === _symbol).address;
};

export const assetSymbolToCTokenAddress = (_symbol) => {
    return CTOKENS.find((x) => x.symbol === _symbol).address;
};

export const assetSymbolToPTokens = (_symbol) => {
    return PTOKENS.find((x) => x.symbol === _symbol).pTokens;
};

export const assetCTokenAddressToSymbol = (_addr) => {
    _addr = web3.utils.toChecksumAddress(_addr);
    return CTOKENS.find((x) => x.address === _addr).symbol;
};

export const assetPTokenAddressToSymbol = (_addr) => {
    _addr = web3.utils.toChecksumAddress(_addr);
    return PTOKENS.find((x) => !isUndefined(x.pTokens.find((y) => web3.utils.toChecksumAddress(y.address) === _addr))).symbol;
};

export const assetPTokenAddressToInfo = (_addr) => {
    _addr = web3.utils.toChecksumAddress(_addr);
    return PTOKENS.find((x) => !isUndefined(x.pTokens.find((y) => web3.utils.toChecksumAddress(y.address) === _addr))).pTokens.find((y) => web3.utils.toChecksumAddress(y.address) === _addr);
};

export const assetSymbolToDailyPriceChange = function (_symbol) {
    return TOKEN_DATA.find((x) => x.symbol === _symbol).dailyPriceChange;
};

export const assetSymbolToWeeklyPriceChange = function (_symbol) {
    return TOKEN_DATA.find((x) => x.symbol === _symbol).weeklyPriceChange;
};

export const assetSymbolToMonthlyPriceChange = function (_symbol) {
    return TOKEN_DATA.find((x) => x.symbol === _symbol).monthlyPriceChange;
};

export const assetSymbolToName = (_symbol) => {
    return TOKEN_DATA.find((x) => x.symbol === _symbol).name;
};

export const assetSymbolToLogoUrl = (_symbol) => {
    return TOKEN_DATA.find((x) => x.symbol === _symbol).logoUrl;
};

export const notStablecoin = (_symbol) => {
    return !STABLECOINS.includes(_symbol);
};

export const isCompoundToken = (_symbol) => {
    const result = CTOKENS.find((x) => x.symbol === _symbol);
    return !isUndefined(result);
};

export const isFulcrumToken = (_symbol) => {
    const result = PTOKENS.find((x) => x.symbol === _symbol);
    return !isUndefined(result);
};

export const isFulcrumTokenAddress = (_tokenAddress) => {
    const result = PTOKENS.find((x) => !isUndefined(x.pTokens.find((y) => y.address === _tokenAddress)));
    return !isUndefined(result);
};

export const isSupporter = (_addr) => SUPPORTERS.indexOf(web3.utils.toChecksumAddress(_addr)) != -1;

export const fulcrumMinStake = async (_addr, _kairoPrice) => {
    let pToken = PositionToken(_addr);
    let underlyingPerPToken = await pToken.methods.tokenPrice().call();
    let underlying = await pToken.methods.tradeTokenAddress().call();
    let underlyingPrice;
    if (underlying === DAI_ADDR) {
        underlyingPrice = BigNumber(1);
    } else {
        underlyingPrice = await betoken.getTokenPrice(underlying, 1);
    }

    const MIN_AMOUNT = BigNumber(0.001);
    return MIN_AMOUNT.times(underlyingPrice).div(_kairoPrice).times(FULCRUM_MINSTAKE_MODIFIER);
};

export const getAssetPriceAtTimestamp = async (symbol, timestamp) => {
    const apiStr = `https://min-api.cryptocompare.com/data/pricehistorical?fsym=DAI&tsyms=${symbol}&ts=${timestamp}`;
    const data = await httpsGet(apiStr);
    const pastPrice = BigNumber(1).div(data.DAI[symbol]);
    return pastPrice;
}

export const httpsGet = async (apiStr) => {
    const request = await fetch(apiStr, { headers: { 'Origin': 'https://betoken.fund/portal/' } });
    return await request.json();
};

export const generateBuyDexagCalldata = async (tokenSymbol, stake, kairoPrice) => {
    let tokenDecimals = +(await betoken.getTokenDecimals(assetSymbolToAddress(tokenSymbol)));
    let fromSymbol, toSymbol, fromAmount;
    fromSymbol = 'DAI';
    toSymbol = tokenSymbol;
    fromAmount = BigNumber(stake).times(kairoPrice).times(DEXAG_AMOUNT_MODIFIER).toFixed(tokenDecimals);

    let apiStr = `https://api-v2.dex.ag/trade?from=${fromSymbol}&to=${toSymbol}&fromAmount=${fromAmount}&dex=ag&proxy=${DEXAG_ADDR}&tradable=true`;
    let result = await httpsGet(apiStr);
    return result.trade.data;
}

export const generateSellDexagCalldata = async (tokenSymbol, tokenAmount) => {
    let tokenDecimals = +(await betoken.getTokenDecimals(assetSymbolToAddress(tokenSymbol)));
    let fromSymbol, toSymbol, fromAmount;
    fromSymbol = tokenSymbol;
    toSymbol = 'DAI';
    fromAmount = BigNumber(tokenAmount).times(DEXAG_AMOUNT_MODIFIER).toFixed(tokenDecimals);

    let apiStr = `https://api.dex.ag/trade?from=${fromSymbol}&to=${toSymbol}&fromAmount=${fromAmount}&dex=best&proxy=${DEXAG_ADDR}`;
    let result = await httpsGet(apiStr);
    return result.trade.data;
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
export const loadTokenMetadata = async () => {
    // fetch token data from Kyber API
    let rawData = require('./json_data/kyber_tokens.json').data;
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
    let apiStr = `https://min-api.cryptocompare.com/data/coin/generalinfo?fsyms=${tokenData.map((x) => x.symbol).join()}&tsym=BTC`;
    rawData = (await httpsGet(apiStr)).Data;
    let tokenLogos = [];
    for (let token of tokenData) {
        let info = rawData.find((x) => x.CoinInfo.Name === token.symbol);
        if (isUndefined(info)) {
            // token not on cryptocompare, use filler
            tokenLogos.push('assets/img/icons/no-logo-asset.svg');
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
        chunk = +((await betoken.getPrimitiveVar("currentChunk"))),
        subchunk = +((await betoken.getPrimitiveVar("currentSubchunk"))),
        totalVotingWeight = BigNumber((await betoken.getPrimitiveVar("getTotalVotingWeight"))).div(PRECISION),
        startTimeOfCyclePhase = +((await betoken.getPrimitiveVar("startTimeOfCyclePhase"))),
    ]).then(() => {
        if (countdownDay == 0 && countdownHour == 0 && countdownMin == 0 && countdownSec == 0) {
            clock();
        }
    });
};

export const loadUserData = async () => {
    if (betoken.hasWeb3) {
        // Get user address
        const userAddr = betoken.accountState.address;
        if (!isNullOrUndefined(userAddr)) {
            userAddress = userAddr;
        } else {
            userAddress = ZERO_ADDR;
        }

        // Get user commissions
        let commissionObj = await betoken.getMappingOrArrayItem("commissionBalanceOf", userAddress);
        commissionBalance = BigNumber(commissionObj._commission).div(PRECISION);
    }
};

export const loadTokenPrices = async () => {
    isLoadingPrices = true;

    let apiStr = "https://api.kyber.network/market";
    let rawData = await httpsGet(apiStr);
    if (!rawData.error) {
        TOKEN_DATA = TOKEN_DATA.map((x) => {
            if (x.symbol !== 'ETH') {
                let tokenData = rawData.data.find((y) => y.base_symbol === x.symbol);
                if (isUndefined(tokenData)) {
                    x.price = BigNumber(0);
                    x.dailyVolume = BigNumber(0);
                    return x;
                }
                let daiData = rawData.data.find((y) => y.base_symbol === 'DAI');
                if (tokenData.current_bid == 0) {
                    tokenData.current_bid = tokenData.current_ask;
                } else if (tokenData.current_ask == 0) {
                    tokenData.current_ask = tokenData.current_bid;
                }
                if (daiData.current_bid == 0) {
                    daiData.current_bid = daiData.current_ask;
                } else if (daiData.current_ask == 0) {
                    daiData.current_ask = daiData.current_bid;
                }

                let tokenPriceInETH = (tokenData.current_bid + tokenData.current_ask) / 2;
                let daiPriceInETH = (daiData.current_bid + daiData.current_ask) / 2;
                x.price = BigNumber(tokenPriceInETH).div(daiPriceInETH);

                x.dailyVolume = BigNumber(tokenData.usd_24h_volume);
            } else {
                let daiData = rawData.data.find((y) => y.base_symbol === 'DAI');
                if (daiData.current_bid == 0) {
                    daiData.current_bid = daiData.current_ask;
                } else if (daiData.current_ask == 0) {
                    daiData.current_ask = daiData.current_bid;
                }

                let daiPriceInETH = (daiData.current_bid + daiData.current_ask) / 2;
                x.price = BigNumber(1).div(daiPriceInETH);

                x.dailyVolume = BigNumber(rawData.data.reduce((accumulator, curr) => accumulator + curr.usd_24h_volume, 0));
            }

            return x;
        });
    }

    apiStr = "https://api.kyber.network/change24h";
    rawData = await httpsGet(apiStr);
    TOKEN_DATA = TOKEN_DATA.map((x) => {
        let rawPrice = rawData[`ETH_${x.symbol}`];
        x.dailyPriceChange = isUndefined(rawPrice) ? BigNumber(0) : BigNumber(rawPrice.change_usd_24h);
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

export const loadAllData = async function (progressCallback) {
    return loadTokenMetadata().then(() => loadDynamicData(progressCallback));
};

export const loadDynamicData = async (progressCallback) => {
    let callback = () => {
        if (!isUndefined(progressCallback)) {
            progressCallback();
        }
    }
    return Promise.all([
        loadUserData().then(callback),
        loadFundData().then(callback),
        loadTokenPrices().then(callback)
    ]);
};
