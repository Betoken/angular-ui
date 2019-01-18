import {Component, ElementRef, OnInit, Renderer2, ViewChild} from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { AppComponent } from '../app.component';
import { user, timer, manager_actions, loading, tokens, refresh_actions} from '../../betokenjs/helpers';
import BigNumber from 'bignumber.js';
import { isUndefined } from 'util';
import {DomSanitizer} from "@angular/platform-browser";

declare var jquery:any;
declare var $ :any;

@Component({
    selector: 'app-proposal',
    templateUrl: './investments.component.html',
    animations: [
        trigger('toggleProposal', [
            state('open', style({
                'right': '0'
            })),
            state('close', style({
                'right': '-100%'
            })),
            transition('open <=> close', animate('300ms ease-in-out')),
        ])

    ]
})

export class InvestmentsComponent implements OnInit {

    state: string;
    active: boolean;

    showCreateInvestmentPopup: boolean;
    showNextPhasePopup: boolean;
    showSellInvestmentPopup: boolean;

    createInvestmentPopupStep: number;
    sellInvestmentPopupStep: number;
    nextPhasePopupStep: number;

    sellalert: boolean;
    nextphasealert: boolean;
    redeemalert: boolean;

    footerbtn1: boolean;
    footerbtn2: boolean;
    footerbtn3: boolean;

    success: boolean;
    tradeAssetval: any;

    portfolioValueInDAI = '';
    currentStake = '';
    currentStakeProportion = '';

    userValue: any;
    days = 0;
    hours = 0;
    minutes = 0;
    seconds = 0;
    phase = -1;
    expected_commission = 0.00;
    kairo_balance = 0.0000;
    monthly_pl = 0.00;
    selectedTokenSymbol = 'ETH';
    stakeAmount = '';
    symbolToPrice = '';
    activeInvestmentList: any;
    inactiveInvestmentList: any;
    sellId: any;
    tokenList: any;
    transactionId: '';
    kroRedeemed: '';
    graphWidget = document.createElement("script");
    showWidget = true;
    dailyPriceChange = 0;
    widget_tokens = [
        "ETH",
        "AE",
        "APPC",
        "BAT",
        "BLZ",
        "BNB",
        "BNT",
        "ELF",
        "ENJ",
        "KNC",
        "LEND",
        "LINK",
        "MANA",
        "OMG",
        "PAY",
        "POLY",
        "QKC",
        "RCN",
        "RDN",
        "REP",
        "REQ",
        "SNT",
        "STORM",
        "WABI",
        "WINGS",
        "ZIL",
        "ZRX"
    ];

    user_address = '0x0';

    constructor(private ms: AppComponent, private elementRef: ElementRef,private renderer:Renderer2) {
        this.state = 'close';
        this.active = false;

        this.sellalert = false;
        this.nextphasealert = false;
        this.redeemalert = false;

        this.showCreateInvestmentPopup = true;
        this.showNextPhasePopup = false;
        this.showSellInvestmentPopup = false;

        this.createInvestmentPopupStep = 0;
        this.sellInvestmentPopupStep = 0;
        this.nextPhasePopupStep = 0;

        this.footerbtn1 = true;
        this.footerbtn2 = false;
        this.footerbtn3 = false;
    }

    ngOnInit() {
        this.createWidget();

        setInterval(() => {
            this.refreshDisplay();
        }, 100);


        this.ms.getProposalPopup().subscribe((open: boolean) => {
            if (open) {
                this.state = 'open';
                this.active = true;
                this.elementRef.nativeElement.querySelector('#chartview').appendChild(this.graphWidget);
            }

            if (!open) {
                this.state = 'close';
                this.active = false;
            }
        });

        this.ms.getProposalChange().subscribe((open: boolean) => {
            if (open) {
                this.nextPhasePopup();
            }

            if (!open) {
                this.state = 'close';
                this.active = false;
            }
        });
        $('#modalBuy').on('hidden.bs.modal', () => {
            this.resetModals();
        });
        $('#modalSell').on('hidden.bs.modal', () => {
            this.resetModals();
        });
    }

    // Popup triggers

    proposalPopup() {
        this.ms.setProposalPopup();
    }

    nextPhasePopup() {
        this.proposalPopup();
        this.sellalert = false;
        this.showNextPhasePopup = true;
        this.showSellInvestmentPopup = false;
        this.showCreateInvestmentPopup = false;
        this.nextPhasePopupStep = 0;
        this.nextphasealert = false;
    }

    resetModals() {
        this.stakeAmount = '';
        this.createInvestmentPopupStep = 0;
        this.sellInvestmentPopupStep = 0;
        this.nextPhasePopupStep = 0;
    }

    // Refresh info

    refreshDisplay() {
        this.activeInvestmentList = user.investment_list().filter((data) => data.isSold === false);
        this.inactiveInvestmentList = user.investment_list().filter((data) => data.isSold === true);
        this.expected_commission = user.expected_commission().toFormat(2);
        this.kairo_balance = user.kairo_balance().toFormat(6);
        this.monthly_pl = user.monthly_roi().toFormat(4);
        this.tokenList = tokens.token_list();
        this.user_address = user.address();
        this.userValue = user.portfolio_value().toFormat(4);
        this.portfolioValueInDAI = user.portfolio_value_in_dai().toFormat(2);
        this.currentStake = user.current_stake().toFormat(4);
        this.currentStakeProportion = user.current_stake().div(user.portfolio_value()).times(100).toFixed(4);
        this.updateDates();
    }

    refresh() {
        refresh_actions.investments();
    }

    async updateDates() {
        this.days = timer.day();
        this.hours = timer.hour();
        this.minutes = timer.minute();
        this.seconds = timer.second();
        this.phase = timer.phase();
    }

    // Create investment

    createInvestment() {
        this.stakeAmount = $('#kairo-input').val();
        this.createInvestmentPopupStep = 2;

        let pending = (transactionHash) => {
            if (this.createInvestmentPopupStep !== 0) {
                this.transactionId = transactionHash;
                this.createInvestmentPopupStep = 3;
            }
        }

        let confirm = () => {
            if (this.createInvestmentPopupStep !== 0) {
                this.createInvestmentPopupStep = 4;
                this.refresh();
            }
        }
        manager_actions.new_investment(this.selectedTokenSymbol, this.stakeAmount, pending, confirm);
    }

    // Sell investment

    sell(data) {
        this.sellId = data.id;
        this.kroRedeemed = data.currValue;

        let pendingSell = (transactionHash) => {
            this.sellInvestmentPopupStep = 1;
            this.transactionId = transactionHash;
        }

        let confirmSell = () => {
            if (this.sellInvestmentPopupStep === 1) {
                this.sellInvestmentPopupStep = 2;
            }
        }

        manager_actions.sell_investment(this.sellId, pendingSell, confirmSell, (success) => {}, (error) => {
            alert(error);
        });
    }

    // UI helpers

    isLoading() {
        return loading.investments();
    }

    createWidget() {
        try {
            this.graphWidget.type = "text/javascript";
            this.graphWidget.async = true;
            this.graphWidget.innerHTML = '{"symbol": "BINANCE:ETHUSD","width": "383","height": "287","class":"peter","locale": "en","dateRange": "1m","colorTheme": "light","trendLineColor": "#37a6ef","underLineColor": "#e3f2fd","isTransparent": false,"autosize": false,"largeChartUrl": ""}';
            this.graphWidget.src = "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
        }
        catch(error) {
        }
    }

    updateWidget() {
        try {
            this.graphWidget.innerHTML = '{"symbol": "BINANCE:' + "" + this.selectedTokenSymbol + 'USD","width": "383","height": "287","class":"peter","locale": "en","dateRange": "1m","colorTheme": "light","trendLineColor": "#37a6ef","underLineColor": "#e3f2fd","isTransparent": false,"autosize": false,"largeChartUrl": ""}';
            $('#chartview').html('');
            $('#chartview').append(this.graphWidget);
        }
        catch(error){
        }
    }

    updateDisplayedTokenInfo(token) {
        if (this.widget_tokens.indexOf(token) >= 0) {
            this.showWidget = true;
            this.updateWidget();
        }
        else {
            this.showWidget = false;
            this.dailyPriceChange = this.getTokenDailyPriceChange(token);
        }
    }

    getTokenDailyPriceChange(token) {
        let result = tokens.asset_symbol_to_daily_price_change(token);
        if (isUndefined(result)) {
            result = new BigNumber(0);
        }
        return result.toFormat(4);
    }

    filterTable = (event, tableID, searchID) => {
        let searchInput = event.target.value.toLowerCase();
        let entries = $(`#${tableID} tr`);
        for (let i = 0; i < entries.length; i++) {
            let entry = entries[i];
            let searchTarget = entry.children[searchID];
            if (searchTarget) {
                if (searchTarget.innerText.toLowerCase().indexOf(searchInput) > -1)
                    entry.style.display = "";
                else
                    entry.style.display = "none";
            }
        }
    }

    assetSymbolToPrice(symbol) {
        return tokens.asset_symbol_to_price(symbol);
    }
}
