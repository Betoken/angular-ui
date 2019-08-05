// imports
import { getDefaultAccount } from './betoken-obj';
import BigNumber from "bignumber.js";
import https from "https";
import { isUndefined } from 'util';

// constants
const ZERO_ADDR = '0x0000000000000000000000000000000000000000';
const CTOKENS = require('./json_data/compound_tokens.json'); // Compound cTokens
const STABLECOINS = require('./json_data/stablecoins.json'); // Stablecoins (managers can't invest)
const PTOKENS = require('./json_data/fulcrum_tokens.json'); // Fulcrum pTokens
const SUPPORTERS = require('./json_data/betoken_supporters.json');

// instance variables
// user info
export var userAddress = ZERO_ADDR;

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
    return PTOKENS.find((x) => !isUndefined(x.pTokens.find((y) => y.address === _addr))).symbol;
};

export const assetPTokenAddressToInfo = (_addr) => {
    _addr = web3.utils.toChecksumAddress(_addr);
    return PTOKENS.find((x) => !isUndefined(x.pTokens.find((y) => y.address === _addr))).pTokens.find((y) => y.address === _addr);
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

export const fulcrumMinStake = (_symbol, _isShort, _kairoPrice) => {
    let underlyingPrice;
    if (_isShort) {
        // underlying is token
        underlyingPrice = assetSymbolToPrice(_symbol);
    } else {
        // underlying is DAI
        underlyingPrice = BigNumber(1);
    }
    const MIN_AMOUNT = BigNumber(0.001);
    return MIN_AMOUNT.times(underlyingPrice).div(_kairoPrice);
};

export const getAssetPriceAtTimestamp = async (symbol, timestamp) => {
    const apiStr = `https://min-api.cryptocompare.com/data/pricehistorical?fsym=DAI&tsyms=${symbol}&ts=${timestamp}`;
    const data = await httpsGet(apiStr);
    const pastPrice = BigNumber(1).div(data.DAI[symbol]);
    return pastPrice;
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
};

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
    return loadTokenMetadata();
};

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
            tokenLogos.push('/portal/assets/img/icons/no-logo-asset.svg');
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
    ]).then(() => {
        if (countdownDay == 0 && countdownHour == 0 && countdownMin == 0 && countdownSec == 0) {
            clock();
        }
    });
};

export const loadUserData = async () => {
    if (betoken.hasWeb3) {
        // Get user address
        await getDefaultAccount();
        const userAddr = web3.eth.defaultAccount;
        if (typeof userAddr !== "undefined") {
            userAddress = userAddr;
        } else {
            userAddress = ZERO_ADDR;
        }
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

export const loadAllData = async function (progressCallback) {
    return loadMetadata().then(() => loadDynamicData(progressCallback));
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
