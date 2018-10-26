// imports
import BigNumber from "bignumber.js";
import { Drizzle, generateStore } from 'drizzle'
const Web3 = require('web3');

// constants
export const BETOKEN_ADDR = "0x5910d5abd4d5fd58b39957664cd9735cbfe42bf0";
export const ETH_TOKEN_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
export const NET_ID = 4; // Rinkeby

// helpers
export var getDefaultAccount = async () => {
    web3.eth.defaultAccount = ((await web3.eth.getAccounts()))[0];
};

export var ERC20 = function(_tokenAddr) {
    if (typeof self.drizzle.contracts[_tokenAddr] !== "undefined") {
        // check if contract already added
        return self.drizzle.contracts[_tokenAddr];
    }
    // add new token contract
    var erc20ABI = require("./abi/ERC20.json");
    var contractConfig = {
        contractName: _tokenAddr,
        web3Contract: new web3.eth.Contract(erc20ABI, _tokenAddr)
    };
    var events = [];
    self.drizzle.addContract({contractConfig, events});
    return self.drizzle.contracts[_tokenAddr];
};

// Betoken abstraction
/**
* Constructs an abstraction of Betoken contracts
*/
export var Betoken = function() {
    // Instance vars
    var self;
    self = this;
    self.drizzle = null;
    self.hasWeb3 = false;

    /*
        Object Initialization
    */
    self.init = async () => {
        // initialize web3
        await self.loadWeb3();

        // Initialize BetokenFund contract
        var betokenFundABI = require("./abi/BetokenFund.json");
        var BetokenFund = new web3.eth.Contract(betokenFundABI, BETOKEN_ADDR);

        // initialize drizzle
        const drizzleOptions = {
            contracts: [
                {
                    contractName: "BetokenFund",
                    web3Contract: BetokenFund
                }
            ],
            events: {
                BetokenFund: ['ROI', 'Deposit', 'Withdraw', 'NewUser']
            }
        };
        
        var minimeABI = require("./abi/MiniMeToken.json");

        await Promise.all([
            BetokenFund.methods.controlTokenAddr().call().then(function(_addr) {
                // Initialize Kairo contract
                var Kairo = new web3.eth.Contract(minimeABI, _addr);
                var contractConfig = {
                    contractName: "Kairo",
                    web3Contract: Kairo
                };
                var events = ['Transfer'];
                drizzleOptions.contracts.push(contractConfig);
                drizzleOptions.events.Kairo = events;
            }),
            BetokenFund.methods.shareTokenAddr().call().then(function(_addr) {
                // Initialize Shares contract
                var Shares = new web3.eth.Contract(minimeABI, _addr);
                var contractConfig = {
                    contractName: "Shares",
                    web3Contract: Shares
                };
                var events = ['Transfer'];
                drizzleOptions.contracts.push(contractConfig);
                drizzleOptions.events.Shares = events;
            }),
            BetokenFund.methods.tokenFactoryAddr().call().then(function(_addr) {
                // Initialize TestTokenFactory contract
                var factoryABI = require("./abi/TestTokenFactory.json");
                var TokenFactory = new web3.eth.Contract(factoryABI, _addr);
                var contractConfig = {
                    contractName: "TokenFactory",
                    web3Contract: TokenFactory
                };
                drizzleOptions.contracts.push(contractConfig);
            }),
            BetokenFund.methods.kyberAddr().call().then(function(_addr) {
                // Initialize TestKyberNetwork contract
                var knABI = require("./abi/TestKyberNetwork.json");
                var Kyber = new web3.eth.Contract(knABI, _addr);
                var contractConfig = {
                    contractName: "Kyber",
                    web3Contract: Kyber
                };
                drizzleOptions.contracts.push(contractConfig);
            })
        ]);

        const drizzleStore = generateStore(drizzleOptions);
        self.drizzle = new Drizzle(drizzleOptions, drizzleStore);

        window.betoken = self;
    };

    self.loadWeb3 = async () => {
        self.hasWeb3 = false;
        if (typeof window.ethereum !== 'undefined') {
            // new metamask
            try {
                await ethereum.enable();
                self.hasWeb3 = true;
                window.web3 = new Web3(ethereum);
            } catch (error1) {}
        } else if (typeof window.web3 !== 'undefined') {
            // legacy metamask
            window.web3 = new Web3(web3.currentProvider);
            self.hasWeb3 = true;
        } else {    
            // non-dapp browsers
            window.web3 = new Web3(new Web3.providers.HttpProvider("https://rinkeby.infura.io/v3/3057a4979e92452bae6afaabed67a724"));
        }
    }

    /*
        Getters
    */

    self.isReady = () => {
        if (typeof window.betoken == "undefined") { return false; }
        var state = self.drizzle.store.getState();
        return state.drizzleStatus.initialized;
    }

    /**
    * Gets a primitive variable in BetokenFund
    * @param  {String} _varName the name of the primitive variable
    * @return {Var} the variable's value
    */
    self.getPrimitiveVar = function(_varName) {
        var state = self.drizzle.store.getState();
        const dataKey = self.drizzle.contracts.BetokenFund.methods[_varName].cacheCall();
        return state.contracts.BetokenFund[_varName][dataKey].value;
    };

    /**
    * Calls a mapping or an array in BetokenFund
    * @param  {String} _name name of the mapping/array
    * @param  {Any} _input       the input
    * @return {Var}  the return value
    */
    self.getMappingOrArrayItem = function(_name, _input) {
        var state = self.drizzle.store.getState();
        const dataKey = self.drizzle.contracts.BetokenFund.methods[_name].cacheCall(_input);
        return state.contracts.BetokenFund.methods[_name][dataKey].value;
    };

    /**
    * Calls a double mapping in BetokenFund
    * @param  {String} _mappingName name of the mapping
    * @param  {Any} _input1      the first input
    * @param  {Any} _input2      the second input
    * @return {Var}  the return value
    */
    self.getDoubleMapping = function(_mappingName, _input1, _input2) {
        var state = self.drizzle.store.getState();
        const dataKey = self.drizzle.contracts.BetokenFund.methods[_mappingName].cacheCall(_input1, _input2);
        return state.contracts.BetokenFund.methods[_mappingName][dataKey].value;
    };

    self.getTokenSymbol = function(_tokenAddr) {
        _tokenAddr = web3.utils.toHex(_tokenAddr);
        if (_tokenAddr === ETH_TOKEN_ADDRESS) {
            return "ETH";
        }
        const token = ERC20(_tokenAddr);
        var state = drizzle.store.getState();
        const dataKey = token.methods.symbol.cacheCall();
        return state.contracts[_tokenAddr].methods.symbol[dataKey].value;
    };

    self.getTokenDecimals = function(_tokenAddr) {
        _tokenAddr = web3.utils.toHex(_tokenAddr);
        if (_tokenAddr === ETH_TOKEN_ADDRESS) {
            return 18;
        }
        const token = ERC20(_tokenAddr);
        
        var state = drizzle.store.getState();
        const dataKey = token.methods.decimals.cacheCall();
        return state.contracts[_tokenAddr].methods.decimals[dataKey].value;
    };

    // Uses TestTokenFactory to obtain a token's address from its symbol
    self.tokenSymbolToAddress = function(_symbol) {
        var symbolHash = web3.utils.soliditySha3(_symbol);

        var state = drizzle.store.getState();
        const dataKey = self.drizzle.contracts.TokenFactory.methods.createdTokens.cacheCall(symbolHash);
        return state.contracts.TokenFactory.methods.createdTokens[dataKey].value;
    };

    self.getTokenPrice = async function(_symbol) {
        var addr = self.tokenSymbolToAddress(_symbol);
        var state = drizzle.store.getState();
        const dataKey = self.drizzle.contracts.Kyber.methods.priceInDAI.cacheCall(addr);
        return state.contracts.Kyber.methods.priceInDAI[dataKey].value;
    };

    self.getTokenBalance = function(_tokenAddr, _addr) {
        const token = ERC20(_tokenAddr);
        var state = drizzle.store.getState();
        const dataKey = token.methods.balanceOf.cacheCall(_addr);
        return state.contracts[_tokenAddr].methods.balanceOf[dataKey].value;
    };

    /**
    * Gets the Kairo balance of an address
    * @param  {String} _addr the address whose balance we're getting
    * @return {Var}  the return value
    */
    self.getKairoBalance = (_addr) => {
        var state = drizzle.store.getState();
        const dataKey = self.drizzle.contracts.Kairo.methods.balanceOf.cacheCall(_addr);
        return state.contracts.Kairo.methods.balanceOf[dataKey].value;
    };

    self.getKairoTotalSupply = () => {
        var state = drizzle.store.getState();
        const dataKey = self.drizzle.contracts.Kairo.methods.totalSupply.cacheCall();
        return state.contracts.Kairo.methods.totalSupply[dataKey].value;
    };

    /**
    * Gets the Share balance of an address
    * @param  {String} _address the address whose balance we're getting
    * @return {Var}  the return value
    */
    self.getShareBalance = function(_address) {
        var state = drizzle.store.getState();
        const dataKey = self.drizzle.contracts.Shares.methods.balanceOf.cacheCall(_addr);
        return state.contracts.Shares.methods.balanceOf[dataKey].value;
        return self.drizzle.contracts.Shares.methods.balanceOf(_address).call();
    };

    self.getShareTotalSupply = () => {
        var state = drizzle.store.getState();
        const dataKey = self.drizzle.contracts.Shares.methods.totalSupply.cacheCall();
        return state.contracts.Shares.methods.totalSupply[dataKey].value;
    };

    /**
    * Gets the array of investments
    * @return {Promise} .then((investments) ->)
    */
    self.getInvestments = function(_userAddress) {
        var array = [];

        const investmentsCount = self.getMappingOrArrayItem("investmentsCount", _userAddress);
        if (investmentsCount === 0) { return array; }

        for (var i = 0; i < investmentsCount; i++) {
            array.push(self.getDoubleMapping("userInvestments", _userAddress, id));
        }

        return array;
    };


    /*
        Phase handler
    */
    /**
    * Ends the current phase
    * @return {Promise} .then(()->)
    */
    self.nextPhase = async function(_onTxHash, _onReceipt) {
        await getDefaultAccount();
        return self.drizzle.contracts.BetokenFund.methods.nextPhase().send({
            from: web3.eth.defaultAccount
        }).on("transactionHash", _onTxHash).on("receipt", _onReceipt);
    };


    /*
        Invest & Withdraw phase functions
    */
    /**
    * Allows user to deposit into the fund
    * @param  {String} _tokenAddr the token address
    * @param  {BigNumber} _tokenAmount the deposit token amount
    * @return {Promise}               .then(()->)
    */
    self.depositToken = async function(_tokenAddr, _tokenAmount, _onTxHash, _onReceipt) {
        await getDefaultAccount();
        var token = ERC20(_tokenAddr);
        var amount = BigNumber(_tokenAmount).mul(BigNumber(10).toPower(self.getTokenDecimals(_tokenAddr)));
        
        token.methods.approve(self.drizzle.contracts.BetokenFund.address, 0).send({
            from: web3.eth.defaultAccount
        });

        token.methods.approve(self.drizzle.contracts.BetokenFund.address, amount).send({
            from: web3.eth.defaultAccount
        });

        return self.drizzle.contracts.BetokenFund.methods.depositToken(_tokenAddr, amount).send({
            from: web3.eth.defaultAccount
        }).on("transactionHash", _onTxHash).on("receipt", _onReceipt);
    };

    /**
    * Allows user to withdraw from fund balance
    * @param  {String} _tokenAddr the token address
    * @param  {BigNumber} _amountInDAI the withdrawal amount in DAI
    * @return {Promise}               .then(()->)
    */
    self.withdrawToken = async function(_tokenAddr, _amountInDAI, _onTxHash, _onReceipt) {
        await getDefaultAccount();
        var amount = BigNumber(_amountInDAI).mul(1e18);
        return self.drizzle.contracts.BetokenFund.methods.withdrawToken(_tokenAddr, amount).send({
            from: web3.eth.defaultAccount
        }).on("transactionHash", _onTxHash).on("receipt", _onReceipt);
    };

    /**
    * Withdraws all of user's balance in cases of emergency
    * @return {Promise}           .then(()->)
    */
    self.emergencyWithdraw = async function(_onTxHash, _onReceipt) {
        await getDefaultAccount();
        return self.drizzle.contracts.BetokenFund.methods.emergencyWithdraw().send({
            from: web3.eth.defaultAccount
        }).on("transactionHash", _onTxHash).on("receipt", _onReceipt);
    };

    /**
    * Sends Kairo to another address
    * @param  {String} _to           the recipient address
    * @param  {BigNumber} _amountInWeis the amount
    * @return {Promise}               .then(()->)
    */
    self.sendKairo = async function(_to, _amountInWeis, _onTxHash, _onReceipt) {
        await getDefaultAccount();
        return self.drizzle.contracts.Kairo.methods.transfer(_to, _amountInWeis).send({
            from: web3.eth.defaultAccount
        }).on("transactionHash", _onTxHash).on("receipt", _onReceipt);
    };

    /**
    * Sends Shares to another address
    * @param  {String} _to           the recipient address
    * @param  {BigNumber} _amountInWeis the amount
    * @return {Promise}               .then(()->)
    */
    self.sendShares = async function(_to, _amountInWeis, _onTxHash, _onReceipt) {
        await getDefaultAccount();
        return self.drizzle.contracts.Shares.methods.transfer(_to, _amountInWeis).send({
            from: web3.eth.defaultAccount
        }).on("transactionHash", _onTxHash).on("receipt", _onReceipt);
    };


    /*
        Decision Making phase functions
    */
    
    /**
    * Creates proposal
    * @param  {String} _tokenAddress the token address
    * @param  {BigNumber} _stakeInWeis the investment amount
    * @return {Promise}               .then(()->)
    */
    self.createInvestment = async function(_tokenAddress, _stakeInWeis, _onTxHash, _onReceipt) {
        await getDefaultAccount();
        return self.drizzle.contracts.BetokenFund.methods.createInvestment(_tokenAddress, _stakeInWeis).send({
            from: web3.eth.defaultAccount
        }).on("transactionHash", _onTxHash).on("receipt", _onReceipt);
    };

    self.sellAsset = async function(_proposalId, _onTxHash, _onReceipt) {
        await getDefaultAccount();
        return self.drizzle.contracts.BetokenFund.methods.sellInvestmentAsset(_proposalId).send({
            from: web3.eth.defaultAccount
        }).on("transactionHash", _onTxHash).on("receipt", _onReceipt);
    };


    /*
        Redeem Commission phase functions
    */
    self.redeemCommission = async function(_onTxHash, _onReceipt) {
        await getDefaultAccount();
        return self.drizzle.contracts.BetokenFund.methods.redeemCommission().send({
            from: web3.eth.defaultAccount
        }).on("transactionHash", _onTxHash).on("receipt", _onReceipt);
    };

    self.redeemCommissionInShares = async function(_onTxHash, _onReceipt, pending, confirm) {
        await getDefaultAccount();
        return self.drizzle.contracts.BetokenFund.methods.redeemCommissionInShares().send({
            from: web3.eth.defaultAccount
        }).on("transactionHash", _onTxHash).on("receipt", _onReceipt);
    };

    return self;
};