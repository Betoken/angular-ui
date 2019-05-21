// imports
import BigNumber from "bignumber.js";
const Web3 = require('web3');

// constants
export const BETOKEN_ADDR = "0x5910d5abd4d5fd58b39957664cd9735cbfe42bf0";
export const ETH_TOKEN_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
export const NET_ID = 4; // Rinkeby

// helpers
export var getDefaultAccount = async () => {
    web3.eth.defaultAccount = (await web3.eth.getAccounts())[0];
};

export var ERC20 = function(_tokenAddr) {
    // add new token contract
    var erc20ABI = require("./abi/ERC20.json");
    return new web3.eth.Contract(erc20ABI, _tokenAddr);
};

// Betoken abstraction
/**
* Constructs an abstraction of Betoken contracts
*/
export var Betoken = function() {
    // Instance vars
    var self;
    self = this;
    self.contracts = {
        BetokenFund: null,
        Kairo: null,
        Shares: null,
        TokenFactory: null,
        Kyber: null
    };
    self.hasWeb3 = false;
    self.wrongNetwork = false;
    
    /*
    Object Initialization
    */
    self.init = async () => {
        // initialize web3
        await self.loadWeb3();
        
        // Initialize BetokenFund contract
        var betokenFundABI = require("./abi/BetokenFund.json");
        var BetokenFund = new web3.eth.Contract(betokenFundABI, BETOKEN_ADDR);
        self.contracts.BetokenFund = BetokenFund;

        var minimeABI = require("./abi/MiniMeToken.json");
        
        await Promise.all([
            BetokenFund.methods.controlTokenAddr().call().then(function(_addr) {
                // Initialize Kairo contract
                self.contracts.Kairo = new web3.eth.Contract(minimeABI, _addr);
            }),
            BetokenFund.methods.shareTokenAddr().call().then(function(_addr) {
                // Initialize Shares contract
                self.contracts.Shares = new web3.eth.Contract(minimeABI, _addr);
            }),
            BetokenFund.methods.tokenFactoryAddr().call().then(function(_addr) {
                // Initialize TestTokenFactory contract
                var factoryABI = require("./abi/TestTokenFactory.json");
                self.contracts.TokenFactory = new web3.eth.Contract(factoryABI, _addr);
            }),
            BetokenFund.methods.kyberAddr().call().then(function(_addr) {
                // Initialize TestKyberNetwork contract
                var knABI = require("./abi/TestKyberNetwork.json");
                self.contracts.Kyber = new web3.eth.Contract(knABI, _addr);
            })
        ]);
        
        window.betoken = self;
    };
    
    self.loadWeb3 = async () => {
        self.hasWeb3 = false;
        self.wrongNetwork = false;
        
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
            window.web3 = new Web3(new Web3.providers.WebsocketProvider("wss://rinkeby.infura.io/ws/v3/3057a4979e92452bae6afaabed67a724"));
        }

        const netID = await window.web3.eth.net.getId();
        if (netID != NET_ID) {
            window.web3 = new Web3(new Web3.providers.WebsocketProvider("wss://rinkeby.infura.io/ws/v3/3057a4979e92452bae6afaabed67a724"));
            self.hasWeb3 = false;
            self.wrongNetwork = true;
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
    self.getPrimitiveVar = function(_varName) {
        return self.contracts.BetokenFund.methods[_varName]().call();
    };
    
    /**
    * Calls a mapping or an array in BetokenFund
    * @param  {String} _name name of the mapping/array
    * @param  {Any} _input       the input
    * @return {Promise}              .then((_value)->)
    */
    self.getMappingOrArrayItem = function(_name, _input) {
        return self.contracts.BetokenFund.methods[_name](_input).call();
    };
    
    /**
    * Calls a double mapping in BetokenFund
    * @param  {String} _mappingName name of the mapping
    * @param  {Any} _input1      the first input
    * @param  {Any} _input2      the second input
    * @return {Promise}              .then((_value)->)
    */
    self.getDoubleMapping = function(_mappingName, _input1, _input2) {
        return self.contracts.BetokenFund.methods[_mappingName](_input1, _input2).call();
    };
    
    self.getTokenSymbol = function(_tokenAddr) {
        _tokenAddr = web3.utils.toHex(_tokenAddr);
        if (_tokenAddr === ETH_TOKEN_ADDRESS) {
            return Promise.resolve().then(function() {
                return "ETH";
            });
        }
        return ERC20(_tokenAddr).methods.symbol().call();
    };
    
    self.getTokenDecimals = function(_tokenAddr) {
        _tokenAddr = web3.utils.toHex(_tokenAddr);
        if (_tokenAddr === ETH_TOKEN_ADDRESS) {
            return Promise.resolve().then(function() {
                return 18;
            });
        }
        return ERC20(_tokenAddr).methods.decimals().call();
    };
    
    // Uses TestTokenFactory to obtain a token's address from its symbol
    self.tokenSymbolToAddress = function(_symbol) {
        var symbolHash = web3.utils.soliditySha3(_symbol);
        return self.contracts.TokenFactory.methods.createdTokens(symbolHash).call();
    };
    
    self.getTokenPrice = async function(_symbol) {
        var addr = await self.tokenSymbolToAddress(_symbol);
        return self.contracts.Kyber.methods.priceInDAI(addr).call();
    };
    
    self.getTokenBalance = function(_tokenAddr, _addr) {
        return ERC20(_tokenAddr).methods.balanceOf(_addr).call();
    };
    
    /**
    * Gets the Kairo balance of an address
    * @param  {String} _address the address whose balance we're getting
    * @return {Promise}          .then((_value)->)
    */
    self.getKairoBalance = function(_address) {
        return self.contracts.Kairo.methods.balanceOf(_address).call();
    };

    self.getKairoBalanceAtCycleStart = async function(_address) {
        let cycleStartBlock = await self.contracts.BetokenFund.methods.commissionPhaseStartBlock((await self.getPrimitiveVar("cycleNumber")) - 1).call();
        return self.contracts.Kairo.methods.balanceOfAt(_address, cycleStartBlock).call();
    };
    
    self.getKairoTotalSupply = function() {
        return self.contracts.Kairo.methods.totalSupply().call();
    };
    
    /**
    * Gets the Share balance of an address
    * @param  {String} _address the address whose balance we're getting
    * @return {Promise}          .then((_value)->)
    */
    self.getShareBalance = function(_address) {
        return self.contracts.Shares.methods.balanceOf(_address).call();
    };
    
    self.getShareTotalSupply = function() {
        return self.contracts.Shares.methods.totalSupply().call();
    };
    
    /**
    * Gets the array of investments
    * @return {Promise} .then((investments) ->)
    */
    self.getInvestments = function(_userAddress) {
        var array = [];
        return self.getMappingOrArrayItem("investmentsCount", _userAddress).then((_count) => {
            var getAllItems, getItem, id;
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
        }).then(function() {
            return array;
        });
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
        return self.contracts.BetokenFund.methods.nextPhase().send({
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
        var amount = BigNumber(_tokenAmount).times(BigNumber(10).pow(self.getTokenDecimals(_tokenAddr)));
        
        token.methods.approve(self.contracts.BetokenFund.options.address, 0).send({
            from: web3.eth.defaultAccount
        });
        
        token.methods.approve(self.contracts.BetokenFund.options.address, amount).send({
            from: web3.eth.defaultAccount
        });
        
        return self.contracts.BetokenFund.methods.depositToken(_tokenAddr, amount).send({
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
        var amount = BigNumber(_amountInDAI).times(1e18);
        return self.contracts.BetokenFund.methods.withdrawToken(_tokenAddr, amount).send({
            from: web3.eth.defaultAccount
        }).on("transactionHash", _onTxHash).on("receipt", _onReceipt);
    };
    
    /**
    * Withdraws all of user's balance in cases of emergency
    * @return {Promise}           .then(()->)
    */
    self.emergencyWithdraw = async function(_onTxHash, _onReceipt) {
        await getDefaultAccount();
        return self.contracts.BetokenFund.methods.emergencyWithdraw().send({
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
        return self.contracts.Kairo.methods.transfer(_to, _amountInWeis).send({
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
        return self.contracts.Shares.methods.transfer(_to, _amountInWeis).send({
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
        return self.contracts.BetokenFund.methods.createInvestment(_tokenAddress, _stakeInWeis).send({
            from: web3.eth.defaultAccount
        }).on("transactionHash", _onTxHash).on("receipt", _onReceipt);
    };
    
    self.sellAsset = async function(_proposalId, _onTxHash, _onReceipt) {
        await getDefaultAccount();
        return self.contracts.BetokenFund.methods.sellInvestmentAsset(_proposalId).send({
            from: web3.eth.defaultAccount
        }).on("transactionHash", _onTxHash).on("receipt", _onReceipt);
    };
    
    
    /*
    Redeem Commission phase functions
    */
    self.redeemCommission = async function(_onTxHash, _onReceipt) {
        await getDefaultAccount();
        return self.contracts.BetokenFund.methods.redeemCommission().send({
            from: web3.eth.defaultAccount
        }).on("transactionHash", _onTxHash).on("receipt", _onReceipt);
    };
    
    self.redeemCommissionInShares = async function(_onTxHash, _onReceipt) {
        await getDefaultAccount();
        return self.contracts.BetokenFund.methods.redeemCommissionInShares().send({
            from: web3.eth.defaultAccount
        }).on("transactionHash", _onTxHash).on("receipt", _onReceipt);
    };
    
    return self;
};