import { Component, OnInit, } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { AppComponent } from '../app.component';
import { Chart } from 'angular-highcharts';
import { NguCarousel, NguCarouselStore, NguCarouselService } from '@ngu/carousel';
import { Router } from '@angular/router';
import { BigNumber } from 'bignumber.js';

import { } from 'jquery';
declare var $: any;

import {
    userAddress,
    transact_box_events,
    stats_tab_helpers, kairoTotalSupply, sharesTotalSupply,
    countdown_timer_helpers, decisions_tab_helpers, kairoRanking, fundValue, totalFunds, ROIArray,
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

    stock: Chart;
    bar: Chart;
    user_address = '0x0';
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

    transactionId: '';

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
        let hasDrawnChart = false;
        setInterval(() => {
            if (userAddress.get() !== '0x0') {
                // portfolio
                this.user_address = userAddress.get();

                // Betoken fund share price
                this.avgMonthReturn = stats_tab_helpers.avg_roi();
                this.currMoROI = fundValue.get().sub(totalFunds.get()).div(totalFunds.get()).mul(100).toFormat(4);
                this.AUM = fundValue.get().div(1e18).toFormat(2);
                this.totalKairo = kairoTotalSupply.get().div(1e18).toFormat(2);
                this.totalBTFShares = sharesTotalSupply.get().div(1e18).toFormat(2);
                this.sharePrice = fundValue.get().div(sharesTotalSupply.get()).toFormat(4);
                this.updateDates();
                this.rankingList();
                if (ROIArray.length > 0) {
                    if (!hasDrawnChart) {
                        hasDrawnChart = true;
                        this.drawChart();
                    }
                }
            }
        }, 1000);

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

    pending = (transactionHash) => {
        this.transactionId = transactionHash;
        this.step1 = false;
        this.step2 = false;
        this.step3 = true;
        this.step4 = false;
    }

    confirm = () => {
        this.step1 = false;
        this.step3 = false;
        this.step3 = false;
        this.step4 = true;
    }


    async withdraw() {
        transact_box_events.withdraw_button(this.calculated_balance, this.selectedTokenSymbol, this.pending, this.confirm, (success) => {
            this.step2 = true;
            this.step1 = false;
            this.step3 = false;
            this.step4 = false;
        }, (error) => {
            alert(error);
        });
    }

    async invest() {
        transact_box_events.deposit_button(this.calculated_balance, this.selectedTokenSymbol, this.pending, this.confirm, (success) => {
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


    drawChart = () => {
        // Prepare data
        const cycles = [];
        const rois = [];
        for (const data of ROIArray) {
            cycles.push(data[0]);
            rois.push({
                y: data[1],
                color: data[1] > 0 ? '#18DAA3' : '#F4406B'
            });
        }
        cycles.push(cycles.length + 1);
        rois.push({
            y: (new BigNumber(this.currMoROI)).toNumber(),
            color: (new BigNumber(this.currMoROI)).toNumber() > 0 ? '#18DAA3' : '#F4406B'
        });

        this.stock = new Chart({
            title: {
                text: ''
            },
            xAxis: {
                categories: cycles,
                title: {
                    text: 'Months since fund\'s birth'
                }
            },
            yAxis: {
                title: {
                    text: 'ROI / %'
                }
            },
            credits: {
                enabled: false
            },
            legend: {
                enabled: false
            },
            series: [{
                type: 'column',
                name: 'ROI',
                data: rois
            }]
        });
    }
}
