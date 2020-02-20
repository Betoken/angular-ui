// imports
import BigNumber from "bignumber.js";
const Web3 = require('web3');
import Onboard from 'bnc-onboard';
import Notify from "bnc-notify"

// constants
export const DEXAG_ADDR = "0xb1ba342EDB8626B611BbC1754D8C8639521D3F58";
export const BETOKEN_PROXY_ADDR = "0xC7CbB403D1722EE3E4ae61f452Dc36d71E8800DE";
export const ETH_TOKEN_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
export const DAI_ADDR = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
export const KYBER_ADDR = "0x818E6FECD516Ecc3849DAf6845e3EC868087B755";
export const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
export const NET_ID = 1; // Mainnet
export const PRECISION = 1e18;
export const CHECK_RECEIPT_INTERVAL = 3e3; // in milliseconds

// helpers
export const getDefaultAccount = async () => {
    web3.eth.defaultAccount = (await web3.eth.getAccounts())[0];
};

export const ERC20 = function (_tokenAddr) {
    // add new token contract
    var erc20ABI = require("./abi/ERC20.json");
    return new web3.eth.Contract(erc20ABI, _tokenAddr);
};

export const CompoundOrder = function (_addr) {
    var abi = require("./abi/CompoundOrder.json");
    return new web3.eth.Contract(abi, _addr);
};

export const PositionToken = function (_addr) {
    var abi = require("./abi/PositionToken.json");
    return new web3.eth.Contract(abi, _addr);
};

export const estimateGas = async (from, func, val, _onError) => {
    return Math.floor((await func.estimateGas({
        from: from,
        value: val
    }).catch(_onError)) * 1.2);
};



// Betoken abstraction
/**
* Constructs an abstraction of Betoken contracts
*/
export var Betoken = function () {
    // Instance vars
    var self;
    self = this;
    self.contracts = {
        BetokenProxy: null,
        BetokenFund: null,
        Kairo: null,
        Shares: null,
        Kyber: null
    };
    self.hasWeb3 = false;
    self.wrongNetwork = false;
    self.assistInstance = null;
    self.notifyInstance = null;
    self.accountState = null;
    self.blocknativeAPIKey = "902e9643-ad7b-44dc-a130-778bd3b29b95";
    self.fortmaticAPIKey = "pk_live_D786361A2D3453D4";
    self.portisAPIKey = "f5e7429c-2715-4a45-b032-c3d76688da8d";
    self.infuraKey = "3057a4979e92452bae6afaabed67a724";
    self.infuraEndpoint = "wss://mainnet.infura.io/ws/v3/" + self.infuraKey;
    self.squarelinkKey = "2b586551124b5a78f599";

    self.sendTx = async (func, _onTxHash, _onReceipt, _onError) => {
        var gasLimit = await estimateGas(self.accountState.address, func, 0, _onError);
        if (!isNaN(gasLimit)) {
            return func.send({
                from: self.accountState.address,
                gas: gasLimit
            }).on("transactionHash", (hash) => {
                _onTxHash(hash);
                const { emitter } = self.notifyInstance.hash(hash);
                emitter.on("txConfirmed", _onReceipt);
                emitter.on("txFailed", _onError);
                emitter.on("txError", _onError);
            }).on("error", (e) => {
                if (!JSON.stringify(e).includes('newBlockHeaders')) {
                    _onError(e);
                }
            });
        }
    };

    self.sendTxWithValue = async (func, val, _onTxHash, _onReceipt, _onError) => {
        var gasLimit = await estimateGas(self.accountState.address, func, val, _onError);
        if (!isNaN(gasLimit)) {
            return func.send({
                from: self.accountState.address,
                gas: gasLimit,
                value: val
            }).on("transactionHash", (hash) => {
                _onTxHash(hash);
                const { emitter } = self.notifyInstance.hash(hash);
                emitter.on("txConfirmed", _onReceipt);
                emitter.on("txFailed", _onError);
                emitter.on("txError", _onError);
            }).on("error", (e) => {
                if (!JSON.stringify(e).includes('newBlockHeaders')) {
                    _onError(e);
                }
            });
        }
    };

    self.sendTxWithToken = async (func, token, to, amount, _onTxHash, _onReceipt, _onError) => {
        let allowance = new BigNumber(await token.methods.allowance(self.accountState.address, to).call());
        if (allowance.gt(0)) {
            if (allowance.gte(amount)) {
                return self.sendTx(func, _onTxHash, _onReceipt, _onError);
            }
            return self.sendTx(token.methods.approve(to, 0), () => {
                self.sendTx(token.methods.approve(to, amount), () => {
                    func.send({
                        from: self.accountState.address,
                        gasLimit: "3000000"
                    }).on("transactionHash", (hash) => {
                        _onTxHash(hash);
                        const { emitter } = self.notifyInstance.hash(hash);
                        emitter.on("txConfirmed", _onReceipt);
                        emitter.on("txFailed", _onError);
                        emitter.on("txError", _onError);
                    }).on("error", (e) => {
                        if (!JSON.stringify(e).includes('newBlockHeaders')) {
                            _onError(e);
                        }
                    });
                }, self.doNothing, _onError);
            }, self.doNothing, _onError);
        } else {
            return self.sendTx(token.methods.approve(to, amount), () => {
                func.send({
                    from: self.accountState.address,
                    gasLimit: "3000000"
                }).on("transactionHash", (hash) => {
                    _onTxHash(hash);
                    const { emitter } = self.notifyInstance.hash(hash);
                    emitter.on("txConfirmed", _onReceipt);
                    emitter.on("txFailed", _onError);
                    emitter.on("txError", _onError);
                }).on("error", (e) => {
                    if (!JSON.stringify(e).includes('newBlockHeaders')) {
                        _onError(e);
                    }
                });
            }, self.doNothing, _onError);
        }
    };

    self.doNothing = () => { }

    /*
    Object Initialization
    */
    self.init = async () => {
        // initialize web3
        await self.loadWeb3();

        // Initialize BetokenProxy contract
        var betokenProxyABI = require("./abi/BetokenProxy.json");
        var BetokenProxy = new web3.eth.Contract(betokenProxyABI, BETOKEN_PROXY_ADDR);
        self.contracts.BetokenProxy = BetokenProxy;

        // Fetch address of BetokenFund
        var betokenAddr = await BetokenProxy.methods.betokenFundAddress().call();

        // Initialize BetokenFund contract
        var betokenFundABI = require("./abi/BetokenFund.json");
        var BetokenFund = new web3.eth.Contract(betokenFundABI, betokenAddr);
        self.contracts.BetokenFund = BetokenFund;

        // Initialize KyberNetwork contract
        var kyberABI = require("./abi/KyberNetwork.json");
        var Kyber = new web3.eth.Contract(kyberABI, KYBER_ADDR);
        self.contracts.Kyber = Kyber;

        // Initialize token contracts
        var minimeABI = require("./abi/MiniMeToken.json");
        await Promise.all([
            BetokenFund.methods.controlTokenAddr().call().then(function (_addr) {
                // Initialize Kairo contract
                self.contracts.Kairo = new web3.eth.Contract(minimeABI, _addr);
            }),
            BetokenFund.methods.shareTokenAddr().call().then(function (_addr) {
                // Initialize Shares contract
                self.contracts.Shares = new web3.eth.Contract(minimeABI, _addr);
            })
        ]);

        window.betoken = self;
    };

    self.loadWeb3 = async () => {
        self.hasWeb3 = true;
        let darkMode = getComputedStyle(document.body).backgroundColor != 'rgb(249, 251, 253)';

        if (!self.assistInstance) {
            let genericMobileWalletConfig = {
                name: "Web3 wallet",
                mobile: true,
                desktop: true,
                preferred: true,
                iconSrc: "data:image/png;base64,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",
                wallet: function (helpers) {
                    var getProviderName = helpers.getProviderName, createModernProviderInterface = helpers.createModernProviderInterface, createLegacyProviderInterface = helpers.createLegacyProviderInterface;
                    var provider = window['ethereum'] ||
                        (web3 && web3.currentProvider);
                    return {
                        provider: provider,
                        interface: provider
                            ? typeof provider.enable === "function"
                                ? createModernProviderInterface(provider)
                                : createLegacyProviderInterface(provider)
                            : null
                    };
                }
            };

            const wallets = [
                {
                    walletName: 'fortmatic',
                    preferred: true,
                    apiKey: self.fortmaticAPIKey
                },
                genericMobileWalletConfig,
                { walletName: 'authereum', networkId: 1 },
                {
                    walletName: 'walletConnect',
                    infuraKey: self.infuraKey,
                    networkId: 1
                },
                {
                    walletName: 'portis',
                    apiKey: self.portisAPIKey,
                    networkId: 1
                },
                { walletName: 'squarelink', apiKey: self.squarelinkKey },
            ];

            const walletChecks = [
                { checkName: 'connect' },
                { checkName: 'network' },
                { checkName: 'balance', minimumBalance: '0' }
            ];

            let walletSelectConfig = {
                heading: 'Select a Wallet',
                description: 'Please select a wallet to connect to this dapp:',
                wallets: wallets
            };

            let bncAssistConfig = {
                dappId: self.blocknativeAPIKey,
                darkMode: darkMode,
                networkId: 1,
                subscriptions: {
                    wallet: wallet => {
                        if (wallet.provider) {
                            web3 = new Web3(wallet.provider);
                        }
                    }
                },
                // default wallets that are included: MetaMask, Dapper, Coinbase, Trust, WalletConnect
                walletSelect: walletSelectConfig,
                // default ready steps are: connect, network, balance
                walletCheck: walletChecks
            };
            self.assistInstance = Onboard(bncAssistConfig);
        }

        // Get user to select a wallet
        let selectedWallet = await self.assistInstance.walletSelect();
        let state = self.assistInstance.getState();
        self.accountState = state;
        if (
            selectedWallet
            || state.address !== null // If user already logged in but want to switch account, and then dismissed window
        ) {
            // Get users' wallet ready to transact
            let ready = await self.assistInstance.walletCheck();

            if (!ready) {
                // Selected an option but then dismissed it
                // Treat as no wallet
                window.web3 = new Web3(self.infuraEndpoint);
                self.hasWeb3 = false;
            }
        } else {
            // User refuses to connect to wallet
            window.web3 = new Web3(self.infuraEndpoint);
            self.hasWeb3 = false;
        }

        // Instantiate Notify
        if (!self.notifyInstance) {
            self.notifyInstance = Notify({
                dappId: self.blocknativeAPIKey,
                networkId: 1
            });
            self.notifyInstance.config({
                darkMode: darkMode
            });
        }
    }

    /*
    Getters
    */

    /**
    * Gets a primitive variable in BetokenFund
    * @param  {String} _varName the name of the primitive variable
    * @return {Promise}          .then((_value)->)
    */
    self.getPrimitiveVar = function (_varName) {
        return self.contracts.BetokenFund.methods[_varName]().call();
    };

    /**
    * Calls a mapping or an array in BetokenFund
    * @param  {String} _name name of the mapping/array
    * @param  {Any} _input       the input
    * @return {Promise}              .then((_value)->)
    */
    self.getMappingOrArrayItem = function (_name, _input) {
        return self.contracts.BetokenFund.methods[_name](_input).call();
    };

    /**
    * Calls a double mapping in BetokenFund
    * @param  {String} _mappingName name of the mapping
    * @param  {Any} _input1      the first input
    * @param  {Any} _input2      the second input
    * @return {Promise}              .then((_value)->)
    */
    self.getDoubleMapping = function (_mappingName, _input1, _input2) {
        return self.contracts.BetokenFund.methods[_mappingName](_input1, _input2).call();
    };

    self.getTokenSymbol = function (_tokenAddr) {
        _tokenAddr = web3.utils.toHex(_tokenAddr);
        if (_tokenAddr === ETH_TOKEN_ADDRESS) {
            return Promise.resolve().then(function () {
                return "ETH";
            });
        }
        return ERC20(_tokenAddr).methods.symbol().call();
    };

    self.getTokenDecimals = function (_tokenAddr) {
        _tokenAddr = web3.utils.toHex(_tokenAddr);
        if (_tokenAddr === ETH_TOKEN_ADDRESS) {
            return Promise.resolve().then(function () {
                return 18;
            });
        }
        return ERC20(_tokenAddr).methods.decimals().call();
    };

    self.getTokenBalance = function (_tokenAddr, _addr) {
        if (_tokenAddr === web3.utils.toChecksumAddress(ETH_TOKEN_ADDRESS)) {
            return web3.eth.getBalance(_addr);
        }
        return ERC20(_tokenAddr).methods.balanceOf(_addr).call();
    };

    self.getTokenPrice = async (_tokenAddr, _amount) => {
        try {
            if (web3.utils.toChecksumAddress(_tokenAddr) === DAI_ADDR) {
                return BigNumber(1);
            }
            let decimals = await self.getTokenDecimals(_tokenAddr);
            let amount = BigNumber(_amount).times(BigNumber(10).pow(decimals)).integerValue().toFixed()
            var price = await self.contracts.Kyber.methods.getExpectedRate(_tokenAddr, DAI_ADDR, amount).call();
            price = price[0];
            return BigNumber(price).div(PRECISION);
        } catch (e) {
            return BigNumber(0);
        }
    };

    self.getPTokenPrice = async (_tokenAddr) => {
        try {
            let pToken = PositionToken(_tokenAddr);
            let underlyingPerPToken = await pToken.methods.tokenPrice().call();
            let underlying = await pToken.methods.tradeTokenAddress().call();
            if (underlying === DAI_ADDR) {
                return BigNumber(underlyingPerPToken).div(PRECISION);
            }
            let underlyingPrice = await self.getTokenPrice(underlying, 1);
            return BigNumber(underlyingPerPToken).div(PRECISION).times(underlyingPrice);
        } catch (e) {
            return BigNumber(0);
        }
    };

    self.getPTokenLiquidationPrice = async (_tokenAddr, _underlyingPrice) => {
        try {
            let pToken = PositionToken(_tokenAddr);
            let underlyingPerPToken = await pToken.methods.liquidationPrice().call();
            let underlying = await pToken.methods.tradeTokenAddress().call();
            if (underlying === DAI_ADDR) {
                return BigNumber(underlyingPerPToken).div(PRECISION);
            }
            return BigNumber(underlyingPerPToken).div(PRECISION).times(_underlyingPrice);
        } catch (e) {
            return BigNumber(0);
        }
    };

    /**
    * Gets the Kairo balance of an address
    * @param  {String} _address the address whose balance we're getting
    * @return {Promise}          .then((_value)->)
    */
    self.getKairoBalance = function (_address) {
        return self.contracts.Kairo.methods.balanceOf(_address).call();
    };

    self.getKairoBalanceAtCycleStart = async function (_address) {
        let cycleStartBlock = await self.contracts.BetokenFund.methods.managePhaseEndBlock((await self.getPrimitiveVar("cycleNumber")) - 1).call();
        return self.contracts.Kairo.methods.balanceOfAt(_address, cycleStartBlock).call();
    };

    self.getBaseStake = async (_address) => {
        let baseStake = BigNumber(await self.getKairoBalanceAtCycleStart(_address));
        if (baseStake.isZero()) {
            baseStake = BigNumber(await self.getMappingOrArrayItem("baseRiskStakeFallback", _address));
        }
        return baseStake;
    }

    self.getKairoTotalSupply = function () {
        return self.contracts.Kairo.methods.totalSupply().call();
    };

    self.getRiskTaken = async (_address) => {
        return self.getDoubleMapping("riskTakenInCycle", _address, (await self.getPrimitiveVar("cycleNumber")));
    }

    self.getRiskThreshold = async (_address) => {
        let baseStake = await self.getBaseStake(_address);
        let threeDayInSeconds = 3 * 24 * 60 * 60;
        return baseStake.times(threeDayInSeconds);
    }

    /**
    * Gets the Share balance of an address
    * @param  {String} _address the address whose balance we're getting
    * @return {Promise}          .then((_value)->)
    */
    self.getShareBalance = function (_address) {
        return self.contracts.Shares.methods.balanceOf(_address).call();
    };

    self.getShareTotalSupply = function () {
        return self.contracts.Shares.methods.totalSupply().call();
    };

    self.getUpgradeHistory = async function () {
        let betokenFundABI = require("./abi/BetokenFund.json");
        let fund = self.contracts.BetokenFund;
        let result = [self.contracts.BetokenFund.options.address];
        let prevVersion = await fund.methods.previousVersion().call();
        while (prevVersion && prevVersion !== ZERO_ADDR) {
            result.push(prevVersion);

            fund = new web3.eth.Contract(betokenFundABI, prevVersion);
            prevVersion = await fund.methods.previousVersion().call();
        }
        return result;
    }

    /**
    * Gets the array of investments
    * @return {Promise} .then((investments) ->)
    */
    self.getInvestments = function (_userAddress) {
        var array = [];
        return self.getMappingOrArrayItem("investmentsCount", _userAddress).then((_count) => {
            var getAllItems, getItem;
            var count = +_count;
            if (count === 0) {
                return [];
            }
            array = new Array(count);
            getItem = (id) => {
                return self.getDoubleMapping("userInvestments", _userAddress, id).then((_item) => {
                    return new Promise((fullfill, reject) => {
                        if (typeof _item !== null) {
                            array[id] = _item;
                            fullfill();
                        } else {
                            reject();
                        }
                    });
                });
            };
            getAllItems = () => {
                var results = [];
                for (var i = 0; i < count; i++) {
                    results.push(getItem(i));
                }
                return results;
            };
            return Promise.all(getAllItems());
        }).then(function () {
            return array;
        });
    };

    self.getCompoundOrders = function (_userAddress) {
        var array = [];
        return self.getMappingOrArrayItem("compoundOrdersCount", _userAddress).then((_count) => {
            var count = +_count;
            if (count === 0) {
                return [];
            }
            array = new Array(count);
            const getItem = (id) => {
                return self.getDoubleMapping("userCompoundOrders", _userAddress, id).then((_item) => {
                    return new Promise((fullfill, reject) => {
                        if (typeof _item !== null) {
                            array[id] = _item;
                            fullfill();
                        } else {
                            reject();
                        }
                    });
                });
            };
            const getAllItems = () => {
                var results = [];
                for (var i = 0; i < count; i++) {
                    results.push(getItem(i));
                }
                return results;
            };
            return Promise.all(getAllItems());
        }).then(function () {
            return array;
        });
    }

    /*
    Phase handler
    */
    /**
    * Ends the current phase
    * @return {Promise} .then(()->)
    */
    self.nextPhase = async function (_onTxHash, _onReceipt, _onError) {
        var func = self.contracts.BetokenFund.methods.nextPhase();
        return self.sendTx(func, _onTxHash, _onReceipt, _onError);
    };


    /*
    Invest & Withdraw phase functions
    */

    /**
    * Allows user to deposit into the fund using ETH
    * @param  {BigNumber} _tokenAmount the deposit token amount
    * @return {Promise}               .then(()->)
    */
    self.depositETH = async function (_tokenAmount, _onTxHash, _onReceipt, _onError) {

        var amount = BigNumber(_tokenAmount).times(PRECISION).integerValue().toFixed();

        var func = self.contracts.BetokenFund.methods.depositEther();
        return self.sendTxWithValue(func, amount, _onTxHash, _onReceipt, _onError);
    };

    /**
    * Allows user to deposit into the fund using DAI
    * @param  {BigNumber} _tokenAmount the deposit token amount
    * @return {Promise}               .then(()->)
    */
    self.depositDAI = async function (_tokenAmount, _onTxHash, _onReceipt, _onError) {

        var token = ERC20(DAI_ADDR);
        var amount = BigNumber(_tokenAmount).times(PRECISION).integerValue().toFixed();

        var func = self.contracts.BetokenFund.methods.depositDAI(amount);
        return self.sendTxWithToken(func, token, self.contracts.BetokenFund.options.address, amount, _onTxHash, _onReceipt, _onError);
    };

    /**
    * Allows user to deposit into the fund
    * @param  {String} _tokenAddr the token address
    * @param  {BigNumber} _tokenAmount the deposit token amount
    * @return {Promise}               .then(()->)
    */
    self.depositToken = async function (_tokenAddr, _tokenAmount, _onTxHash, _onReceipt, _onError) {

        var token = ERC20(_tokenAddr);
        var amount = BigNumber(_tokenAmount).times(BigNumber(10).pow(await self.getTokenDecimals(_tokenAddr))).integerValue().toFixed();

        var func = self.contracts.BetokenFund.methods.depositToken(_tokenAddr, amount);
        return self.sendTxWithToken(func, token, self.contracts.BetokenFund.options.address, amount, _onTxHash, _onReceipt, _onError);
    };

    /**
    * Allows user to withdraw from fund balance into ETH
    * @param  {BigNumber} _amountInDAI the withdrawal amount in DAI
    * @return {Promise}               .then(()->)
    */
    self.withdrawETH = async function (_amountInDAI, _onTxHash, _onReceipt, _onError) {

        var amount = BigNumber(_amountInDAI).times(PRECISION).integerValue().toFixed();

        var func = self.contracts.BetokenFund.methods.withdrawEther(amount);
        return self.sendTx(func, _onTxHash, _onReceipt, _onError);
    };

    /**
    * Allows user to withdraw from fund balance into DAI
    * @param  {BigNumber} _amountInDAI the withdrawal amount in DAI
    * @return {Promise}               .then(()->)
    */
    self.withdrawDAI = async function (_amountInDAI, _onTxHash, _onReceipt, _onError) {

        var amount = BigNumber(_amountInDAI).times(PRECISION).integerValue().toFixed();

        var func = self.contracts.BetokenFund.methods.withdrawDAI(amount);
        return self.sendTx(func, _onTxHash, _onReceipt, _onError);
    };

    /**
    * Allows user to withdraw from fund balance
    * @param  {String} _tokenAddr the token address
    * @param  {BigNumber} _amountInDAI the withdrawal amount in DAI
    * @return {Promise}               .then(()->)
    */
    self.withdrawToken = async function (_tokenAddr, _amountInDAI, _onTxHash, _onReceipt, _onError) {

        var amount = BigNumber(_amountInDAI).times(PRECISION).integerValue().toFixed();

        var func = self.contracts.BetokenFund.methods.withdrawToken(_tokenAddr, amount);
        return self.sendTx(func, _onTxHash, _onReceipt, _onError);
    };

    /*
    Manage functions
    */

    /**
    * Creates an investment
    * @param  {String} _tokenAddress the token address
    * @param  {BigNumber} _stakeInKRO the investment amount
    * @param  {BigNumber} _minPrice the min acceptable token price
    * @param  {BigNumber} _maxPrice the max acceptable token price
    * @return {Promise}               .then(()->)
    */
    self.createInvestment = async function (_tokenAddress, _stakeInKRO, _minPrice, _maxPrice, _onTxHash, _onReceipt, _onError) {

        var stake = _stakeInKRO.times(PRECISION).integerValue().toFixed();
        var minPrice = _minPrice.times(PRECISION).integerValue().toFixed();
        var maxPrice = _maxPrice.times(PRECISION).integerValue().toFixed();

        var func = self.contracts.BetokenFund.methods.createInvestment(_tokenAddress, stake, minPrice, maxPrice);
        return self.sendTx(func, _onTxHash, _onReceipt, _onError);
    };

    /**
    * Creates an investment (V2)
    * @param  {String} _tokenAddress the token address
    * @param  {BigNumber} _stakeInKRO the investment amount
    * @param  {BigNumber} _minPrice the min acceptable token price
    * @param  {BigNumber} _maxPrice the max acceptable token price
    * @param  {String}    _calldata the dex.ag calldata
    * @param  {Bool}      _useKyber whether to use Kyber or dex.ag
    * @return {Promise}               .then(()->)
    */
    self.createInvestmentV2 = async function (_tokenAddress, _stakeInKRO, _minPrice, _maxPrice, _calldata, _useKyber, _onTxHash, _onReceipt, _onError) {

        var stake = _stakeInKRO.times(PRECISION).integerValue().toFixed();
        var minPrice = _minPrice.times(PRECISION).integerValue().toFixed();
        var maxPrice = _maxPrice.times(PRECISION).integerValue().toFixed();

        var func = self.contracts.BetokenFund.methods.createInvestmentV2(_tokenAddress, stake, minPrice, maxPrice, _calldata, _useKyber);
        return self.sendTx(func, _onTxHash, _onReceipt, _onError);
    };

    /**
    * Sells an investment (maybe only part of it)
    * @param  {Number} _proposalId the investment's ID
    * @param  {BigNumber} _percentage the percentage of tokens to sell
    * @param  {BigNumber} _minPrice the min acceptable token price
    * @param  {BigNumber} _maxPrice the max acceptable token price
    * @return {Promise}               .then(()->)
    */
    self.sellAsset = async function (_proposalId, _percentage, _minPrice, _maxPrice, _onTxHash, _onReceipt, _onError) {

        var sellTokenAmount = BigNumber((await self.getDoubleMapping("userInvestments", self.accountState.address, _proposalId)).tokenAmount).times(_percentage).integerValue().toFixed();
        var minPrice = _minPrice.times(PRECISION).integerValue().toFixed();
        var maxPrice = _maxPrice.times(PRECISION).integerValue().toFixed();

        var func = self.contracts.BetokenFund.methods.sellInvestmentAsset(_proposalId, sellTokenAmount, minPrice, maxPrice);
        return self.sendTx(func, _onTxHash, _onReceipt, _onError);
    };

    /**
    * Sells an investment (maybe only part of it)
    * @param  {Number} _proposalId the investment's ID
    * @param  {BigNumber} _percentage the percentage of tokens to sell
    * @param  {BigNumber} _minPrice the min acceptable token price
    * @param  {BigNumber} _maxPrice the max acceptable token price
    * @param  {String}    _calldata the dex.ag calldata
    * @param  {Bool}      _useKyber whether to use Kyber or dex.ag
    * @return {Promise}               .then(()->)
    */
    self.sellAssetV2 = async function (_proposalId, _percentage, _minPrice, _maxPrice, _calldata, _useKyber, _onTxHash, _onReceipt, _onError) {

        var sellTokenAmount = BigNumber((await self.getDoubleMapping("userInvestments", self.accountState.address, _proposalId)).tokenAmount).times(_percentage).integerValue().toFixed();
        var minPrice = _minPrice.times(PRECISION).integerValue().toFixed();
        var maxPrice = _maxPrice.times(PRECISION).integerValue().toFixed();

        var func = self.contracts.BetokenFund.methods.sellInvestmentAssetV2(_proposalId, sellTokenAmount, minPrice, maxPrice, _calldata, _useKyber);
        return self.sendTx(func, _onTxHash, _onReceipt, _onError);
    };

    /**
    * Creates an Compound order
    * @param  {Bool} _orderType True for shorting, false for longing
    * @param  {String} _tokenAddress the compound token address (not underlying)
    * @param  {BigNumber} _stakeInKRO the investment amount
    * @param  {BigNumber} _minPrice the min acceptable token price
    * @param  {BigNumber} _maxPrice the max acceptable token price
    * @return {Promise}               .then(()->)
    */
    self.createCompoundOrder = async function (_orderType, _tokenAddress, _stakeInKRO, _minPrice, _maxPrice, _onTxHash, _onReceipt, _onError) {

        var stake = _stakeInKRO.times(PRECISION).integerValue().toFixed();
        var minPrice = _minPrice.times(PRECISION).integerValue().toFixed();
        var maxPrice = _maxPrice.times(PRECISION).integerValue().toFixed();

        var func = self.contracts.BetokenFund.methods.createCompoundOrder(_orderType, _tokenAddress, stake, minPrice, maxPrice);
        return self.sendTx(func, _onTxHash, _onReceipt, _onError);
    };

    /**
    * Sells a Compound order
    * @param  {Number} _proposalId the order's ID
    * @param  {BigNumber} _minPrice the min acceptable token price
    * @param  {BigNumber} _maxPrice the max acceptable token price
    * @return {Promise}               .then(()->)
    */
    self.sellCompoundOrder = async function (_proposalId, _minPrice, _maxPrice, _onTxHash, _onReceipt, _onError) {

        var minPrice = _minPrice.times(PRECISION).integerValue().toFixed();
        var maxPrice = _maxPrice.times(PRECISION).integerValue().toFixed();

        var func = self.contracts.BetokenFund.methods.sellCompoundOrder(_proposalId, minPrice, maxPrice);
        return self.sendTx(func, _onTxHash, _onReceipt, _onError);
    };

    /**
    * Repays debt for a Compound order
    * @param  {Number} _proposalId the order's ID
    * @param  {BigNumber} _amountInDAI the amount to repay, in DAI
    * @return {Promise}               .then(()->)
    */
    self.repayCompoundOrder = async function (_proposalId, _amountInDAI, _onTxHash, _onReceipt, _onError) {

        var repayAmount = _amountInDAI.times(PRECISION).integerValue().toFixed();

        var func = self.contracts.BetokenFund.methods.repayCompoundOrder(_proposalId, repayAmount);
        return self.sendTx(func, _onTxHash, _onReceipt, _onError);
    }

    /*
    Redeem Commission functions
    */
    self.redeemCommission = async function (_inShares, _onTxHash, _onReceipt, _onError) {


        var func = self.contracts.BetokenFund.methods.redeemCommission(_inShares);
        return self.sendTx(func, _onTxHash, _onReceipt, _onError);
    };

    self.redeemCommissionForCycle = async function (_inShares, _cycle, _onTxHash, _onReceipt, _onError) {


        var func = self.contracts.BetokenFund.methods.redeemCommissionForCycle(_inShares, _cycle);
        return self.sendTx(func, _onTxHash, _onReceipt, _onError);
    };

    /*
    Manager Registration functions
    */
    self.registerWithDAI = async function (_amountInDAI, _onTxHash, _onReceipt, _onError) {

        var token = ERC20(DAI_ADDR);
        var amount = BigNumber(_amountInDAI).times(PRECISION).integerValue().toFixed();

        var func = self.contracts.BetokenFund.methods.registerWithDAI(amount);
        return self.sendTxWithToken(func, token, self.contracts.BetokenFund.options.address, amount, _onTxHash, _onReceipt, _onError);
    }

    self.registerWithETH = async function (_amountInETH, _onTxHash, _onReceipt, _onError) {

        var amount = BigNumber(_amountInETH).times(PRECISION).integerValue().toFixed();

        var func = self.contracts.BetokenFund.methods.registerWithETH();
        return self.sendTxWithValue(func, amount, _onTxHash, _onReceipt, _onError);
    }

    self.registerWithToken = async function (_tokenAddr, _amountInTokens, _onTxHash, _onReceipt, _onError) {

        var token = ERC20(_tokenAddr);
        var amount = BigNumber(_amountInTokens).times(BigNumber(10).pow(await self.getTokenDecimals(_tokenAddr))).integerValue().toFixed();

        var func = self.contracts.BetokenFund.methods.registerWithToken(_tokenAddr, amount);
        return self.sendTxWithToken(func, token, self.contracts.BetokenFund.options.address, amount, _onTxHash, _onReceipt, _onError);
    }

    /**
     * Governance actions
     */
    self.signalUpgrade = async function (_inSupport, _onTxHash, _onReceipt, _onError) {
        let func = self.contracts.BetokenFund.methods.signalUpgrade(_inSupport);
        return self.sendTx(func, _onTxHash, _onReceipt, _onError);
    }

    self.proposeCandidate = async function (_chunkNumber, _candidate, _onTxHash, _onReceipt, _onError) {
        if (!web3.utils.isAddress(_candidate)) {
            _onError(`${_candidate} is not a valid Ethereum address.`);
            return;
        }
        let func = self.contracts.BetokenFund.methods.proposeCandidate(_chunkNumber, _candidate);
        return self.sendTx(func, _onTxHash, _onReceipt, _onError);
    }

    self.voteOnCandidate = async function (_chunkNumber, _inSupport, _onTxHash, _onReceipt, _onError) {
        let func = self.contracts.BetokenFund.methods.voteOnCandidate(_chunkNumber, _inSupport);
        return self.sendTx(func, _onTxHash, _onReceipt, _onError);
    }

    self.finalizeSuccessfulVote = async function (_chunkNumber, _onTxHash, _onReceipt, _onError) {
        let func = self.contracts.BetokenFund.methods.finalizeSuccessfulVote(_chunkNumber);
        return self.sendTx(func, _onTxHash, _onReceipt, _onError);
    }

    return self;
};