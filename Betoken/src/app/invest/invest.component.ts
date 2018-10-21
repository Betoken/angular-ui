import { Component, OnInit, } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { AppComponent } from '../app.component';
import { StockChart } from 'angular-highcharts';
import { NguCarousel, NguCarouselStore, NguCarouselService } from '@ngu/carousel';
import { Router } from '@angular/router';
import { BigNumber } from 'bignumber.js';

import { } from 'jquery';
declare var $: any;
import { Betoken } from '../../assets/objects/betoken.js';
import {
    networkName,
    userAddress,
    displayedInvestmentBalance,
    displayedInvestmentUnit,
    displayedKairoBalance,
    displayedKairoUnit,
    expected_commission,
    sharesBalance,
    transact_box_events,
    decisions_tab_events,
    sidebar_heplers,
    stats_tab_helpers, kairoTotalSupply, sharesTotalSupply,
    countdown_timer_helpers, loadStats, decisions_tab_helpers, kairoRanking, managerROI, fundValue, totalFunds, ROIArray, ROI,
    ROIArrayLoaded, loadDynamicData
} from '../../assets/body';

@Component({
    selector: 'app-invest',
    templateUrl: './invest.component.html',
    styleUrls: ['./invest.component.scss'],
    animations: [
        trigger('toggleMenu', [
            state('open', style({
                'right': '0'
            })),
            state('close', style({
                'right': '-100%'
            })),
            transition('open <=> close', animate('300ms ease-in-out')),
        ]),

    ]
})

export class InvestComponent implements OnInit {
    walkthrough: boolean;
    step1: boolean;
    step2: boolean;
    step3: boolean;
    step4: boolean;
    investalert: boolean;
    footerbtn1: boolean;

    footerbtn2: boolean;
    changefundphase: boolean;
    changeStep1: boolean;
    changeStep2: boolean;
    changeStep3: boolean;
    changeStep4: boolean;
    changealert: boolean;

    footerbtn3: boolean;
    state: string;
    active: boolean;


    success: boolean;
    returnres: any;

    stock: StockChart;
    bar: StockChart;
    user_address = '0x0';
    share_balance = 0.0000;
    kairo_balance = 0.0000;
    monthly_pl = 0.00;
    inputShare = 0.00;
    calculated_balance = 0.00;
    selectedTokenSymbol = 'DAI';

    sharePrice = 0;
    avgMonthReturn = 0;
    currMoROI = 0;
    totalUser = 0;
    AUM = 0;
    totalKairo = 0;
    totalBTFShares = 0;

    days = 0;
    hours = 0;
    minutes = 0;
    seconds = 0;
    investflow = false;
    withdrawflow = false;

    private carouselToken: string;
    public carouselBanner: NguCarousel;
    tokenList: any;
    rankingArray = [];

    openModalPopup() {
       this.ms.setPopUp();
    }
    openModalPopupW() {
        this.ms.setPopUpW();
    }

    constructor(private ms: AppComponent, private carousel: NguCarouselService, private route: Router) {

        if (localStorage.getItem('walkthrough') == null) {
            this.walkthrough = true;
        }
        this.state = 'close';
        this.active = false;


        this.step1 = true;
        this.step2 = false;
        this.step3 = false;
        this.step4 = false;
        this.investalert = false;

        this.changealert = false;
        this.changefundphase = false;
        this.changeStep1 = true;
        this.changeStep2 = false;
        this.changeStep3 = false;
        this.changeStep4 = false;

        this.footerbtn1 = true;
        this.footerbtn2 = false;
        this.footerbtn3 = false;
        setInterval(() => {
            if (userAddress.get() !== '0x0') {
                this.rankingList();
                // this.chartdata();
            }
        }, 1000);
    }

    calculate_bal (event) {
        this.calculated_balance = event.target.value * 100.0000;
    }

    async updateDates() {
        this.days = countdown_timer_helpers.day();
        this.hours = countdown_timer_helpers.hour();
        this.minutes = countdown_timer_helpers.minute();
        this.seconds = countdown_timer_helpers.second();
    }

    ngOnInit() {
        setInterval(() => {
            if (userAddress.get() !== '0x0') {
                // portfolio
                this.user_address = userAddress.get();
                this.share_balance = sharesBalance.get().div(1e18).toFormat(5);
                this.kairo_balance = displayedKairoBalance.get().toFormat(18);
                this.monthly_pl = managerROI.get().toFormat(5);

                // Betoken fund share price
                this.avgMonthReturn = stats_tab_helpers.avg_roi();
                this.currMoROI = fundValue.get().sub(totalFunds.get()).div(totalFunds.get()).mul(100).toFormat(4);
                this.AUM = fundValue.get().div(1e18).toFormat(2);
                this.totalKairo = kairoTotalSupply.get().div(1e18).toFormat(2);
                this.totalBTFShares = sharesTotalSupply.get().div(1e18).toFormat(2);
                this.sharePrice = fundValue.get().div(sharesTotalSupply.get()).toFormat(4);
                this.updateDates();
                this.rankingList();
            }
        }, 1000);

        setTimeout(() => {
            this.stock = new StockChart({
                rangeSelector: {
                    selected: 2,
                    inputEnabled: false,
                    buttonSpacing: 30,
                    buttonTheme: {
                        fill: 'none',
                        stroke: 'none',
                        style: { color: '#8FA9B0' },
                        states: {
                            hover: {},
                            select: {
                                fill: 'none',
                                style: { color: '#00000', fontWeight: 'bold' }
                            }
                        }
                    },
    
                    buttons: [],
                },
                plotOptions: {
                    areaspline: {
                        lineColor: '#18DAA3',
                        lineWidth: 1,
                        fillColor: '#B9EEE1',
                    },
                },
                title: {
                    text: 'Betoken Fund\'s ROI Per Cycle'
                },
                scrollbar: {
                    enabled: false
                },
                navigator: {
                    enabled: false
                },
                yAxis: {
                    opposite: false
                },
                series: [{
                    name: 'Monthly ROI',
                    data: ROIArray,
                    type: 'areaspline'
                }]
            });
        },5000);

        this.stock = new StockChart({
            rangeSelector: {
                selected: 2,
                inputEnabled: false,
                buttonSpacing: 30,
                buttonTheme: {
                    fill: 'none',
                    stroke: 'none',
                    style: { color: '#8FA9B0' },
                    states: {
                        hover: {},
                        select: {
                            fill: 'none',
                            style: { color: '#00000', fontWeight: 'bold' }
                        }
                    }
                },

                buttons: [],
            },
            plotOptions: {
                areaspline: {
                    lineColor: '#18DAA3',
                    lineWidth: 1,
                    fillColor: '#B9EEE1',
                },
            },
            title: {
                text: ''
            },
            scrollbar: {
                enabled: false
            },
            navigator: {
                enabled: false
            },
            yAxis: {
                opposite: false
            },
            series: [{
                name: 'Monthly ROI',
                data: ROIArray,
                type: 'areaspline'
            }]
        });
        

        this.carouselBanner = {
            grid: { xs: 1, sm: 1, md: 1, lg: 1, all: 0 },
            slide: 1,
            speed: 400,
            interval: 400000,
            point: {visible: true},
            load: 2,
            loop: true,
            touch: true
        };

        this.ms.getPopUp().subscribe((open: boolean) => {
           this.investflow = true;
           this.withdrawflow = false;
            if (open) {
                this.state = 'open';
                this.active = true;
            }

            if (!open) {
                this.state = 'close';
                this.active = false;
            }

        });

        this.ms.getPopUpW().subscribe((open: boolean) => {
            this.investflow = false;
            this.withdrawflow = true;
            if (open) {
                this.state = 'open';
                this.active = true;
            }

            if (!open) {
                this.state = 'close';
                this.active = false;
            }

        });

        this.ms.getchangefundPopUp().subscribe((open: boolean) => {
            if (open) {
                this.state = 'open';
                this.active = true;
                this.changefundphase = true;
                this.investalert = false;
                this.changeStep1 = true;
                this.changeStep2 = false;
                this.changeStep3 = false;
                this.changeStep4 = false;
            }

            if (!open) {
                this.state = 'close';
                this.active = false;
            }
        });
    }


    /* It will be triggered on every slide*/
    onmoveFn(data: NguCarouselStore) {
        console.log(data);
    }

    initDataFn(key: NguCarouselStore) {
        this.carouselToken = key.token;
    }

    resetFn() {
        this.carousel.reset(this.carouselToken);
    }

    shift() {
        for (let i = 0; i < 2 ; i++) {
            this.carousel.moveToSlide(this.carouselToken, i, false);
        }
    }

    dismiss() {
        this.walkthrough = false;
        localStorage.setItem('walkthrough', '1');
    }

    closePopup() {
        this.state = 'close';
        this.active = false;
        this.step1 = true;
        this.step2 = false;
        this.step3 = false;
        this.step4 = false;
        this.footerbtn1 = false;
        this.footerbtn2 = true;

        if (this.changefundphase === true) {
            this.changeStep1 = true;
            this.changeStep2 = false;
            this.changeStep3 = false;
            this.changeStep4 = false;
            this.footerbtn2 = false;
            this.footerbtn3 = true;
        }
    }

    async withdraw() {
        transact_box_events.withdraw_button(this.calculated_balance, this.selectedTokenSymbol, (success) => {
            this.step2 = true;
            this.step1 = false;
            this.step3 = false;
            this.step4 = false;
        }, (error) => {
          alert(error);
        });
    }

    async invest() {
         transact_box_events.deposit_button(this.calculated_balance, this.selectedTokenSymbol, (success) => {
          this.step2 = true;
          this.step1 = false;
          this.step3 = false;
          this.step4 = false;
        }, (error) => {
           alert(error);
        });
    }

    updateTokenSymbol(value) {
        this.selectedTokenSymbol = value;
    }

    confirm() {
        this.step3 = true;
        this.step1 = false;
        this.step2 = false;
        this.step4 = false;
        setTimeout(() => {
            this.step4 = true;
            this.investalert = true;
            this.step1 = false;
            this.step2 = false;
            this.step3 = false;
            this.ms.setNextPhaseBtn();
        }, 1000);
    }

    changefund() {
        this.changefundphase = true;
        this.investalert = false;
        this.openModalPopup();
        this.openModalPopupW();
    }

    changefundstep1() {
        this.changeStep2 = true;
        this.changeStep1 = false;
        this.changeStep3 = false;
        this.changeStep4 = false;
    }

    confirmcchangefund() {
        this.changeStep3 = true;
        this.changealert = true;
        this.changeStep1 = false;
        this.changeStep2 = false;
        this.changeStep4 = false;
        this.ms.setTradeBtn();
    }

    hidechangealert() {
        this.changealert = false;
    }

    makeInvestment() {
        this.openModalPopup();
        this.openModalPopupW();
        this.route.navigate(['/proposal']);
    }

    async tokensList() {
        this.tokenList = decisions_tab_helpers.tokens();
    }

    copyToClipBoard(event) {
        alert('Copied  '  + event +  '  to clipBoard');
    }

    rankingList() {
        this.rankingArray =  kairoRanking.get();
        this.totalUser = this.rankingArray.length;
    }
}
