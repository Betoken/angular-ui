import { Component, OnInit, } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { AppComponent } from '../app.component';
import { NguCarousel, NguCarouselStore, NguCarouselService } from '@ngu/carousel';
import { Router } from '@angular/router';
import { BigNumber } from 'bignumber.js';
import { Chart } from 'chart.js';
//import { Chart } from '../../assets/js/charts.js';

import { } from 'jquery';
declare var $: any;

import {
    user, timer, stats, investor_actions, manager_actions, tokens, refresh_actions
} from '../../betokenjs/helpers';

@Component({
    selector: 'app-invest',
    templateUrl: './dashboard.component.html',
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

export class DashboardComponent implements OnInit {
    userRanking = [];
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

    inputShare = 0.00;
    calculated_balance = 0.00;
    selectedTokenSymbol = 'DAI';

    kairo_balance = 0.0000;
    monthly_pl = 0.00;
    expected_commission = 0.00;
    sharePrice = 0;
    avgMonthReturn = 0;
    currMoROI = 0;
    totalUser = 0;
    AUM = 0;
    totalKairo = 0;
    totalBTFShares = 0;
    sortinoRatio = 0;
    standardDeviation = 0;

    portfolioValueInDAI = '';

    hasDrawnChart = false;

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
    }

    calculate_bal (event) {
        this.calculated_balance = event.target.value * 100.0000;
    }

    async updateDates() {
        this.days = timer.day;
        this.hours = timer.hour;
        this.minutes = timer.minute;
        this.seconds = timer.second;
    }

    ngOnInit() {
        setInterval(() => {
            this.refreshDisplay();
        }, 100);

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

    refreshDisplay() {
        this.kairo_balance = user.portfolio_value().toFormat(4);
        this.monthly_pl = user.monthly_roi().toFormat(4);
        this.expected_commission = user.expected_commission().toFormat(2);
        this.avgMonthReturn = stats.avg_roi().toFormat(2);
        this.currMoROI = stats.cycle_roi().toFormat(4);
        this.AUM = stats.fund_value().toFormat(2);
        this.userRanking = user.rank();
        this.portfolioValueInDAI = user.portfolio_value_in_dai().toFormat(2);
        this.updateDates();
        this.rankingList();
        if (stats.raw_roi_data().length > 0 && !this.hasDrawnChart) {
            this.hasDrawnChart = true;
            this.drawChart();
        }
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
        investor_actions.withdraw_button(this.calculated_balance, this.selectedTokenSymbol, this.pending, this.confirm, (success) => {
            this.step2 = true;
            this.step1 = false;
            this.step3 = false;
            this.step4 = false;
        }, (error) => {
            alert(error);
        });
    }

    async invest() {
        investor_actions.deposit_button(this.calculated_balance, this.selectedTokenSymbol, this.pending, this.confirm, (success) => {
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

    hideNextPhaseAlert() {
        this.changealert = false;
    }

    makeInvestment() {
        this.openModalPopup();
        this.openModalPopupW();
        this.route.navigate(['/proposal']);
    }

    async tokensList() {
        this.tokenList = tokens.token_list();
    }

    rankingList() {
        this.rankingArray =  stats.ranking();
        this.totalUser = this.rankingArray.length;
    }

    drawChart = () => {
        let BONDS_MONTHLY_INTEREST = 2.4662697e-3 // 3% annual interest rate
        let NUM_DECIMALS = 4;
        let betokenROIList = stats.raw_roi_data();

        const convertToCumulative = (list) => {
            var tmp = new BigNumber(1);
            var tmpArray = [new BigNumber(0)];
            for (let roi of list) {
                tmp = new BigNumber(roi).div(100).plus(1).times(tmp);
                tmpArray.push(tmp.times(100).minus(100).dp(NUM_DECIMALS));
            }
            return tmpArray;
        }

        // calculate stats for Betoken
        let calcMean = function(list) {
            return list.reduce(function(accumulator, curr) {
            return new BigNumber(accumulator).plus(curr);
            }).div(list.length);
        };
        let calcSampleStd = function(list) {
            var mean, sampleStd, sampleVar;
            mean = calcMean(list);
            sampleVar = list.reduce(function(accumulator, curr) {
            return new BigNumber(accumulator).plus(new BigNumber(curr - mean).pow(2));
            }, 0).div(list.length - 1);
            return sampleStd = sampleVar.sqrt();
        };
        let calcDownsideStd = (list, minAcceptableRate) => {
            let sampleVar = list.reduce(
                (accumulator, curr) => (new BigNumber(accumulator)).plus(new BigNumber(BigNumber.min(curr - minAcceptableRate, 0)).pow(2))
                , 0).div(list.length - 1);
            let sampleStd = sampleVar.sqrt();
            return sampleStd;
        }

        // Sortino Ratio (against bonds, since inception)
        let meanExcessReturn = calcMean(betokenROIList).minus(BONDS_MONTHLY_INTEREST);
        let excessReturnStd = calcDownsideStd(betokenROIList, BONDS_MONTHLY_INTEREST);
        this.sortinoRatio = meanExcessReturn.div(excessReturnStd).dp(NUM_DECIMALS);

        // Get cumulative data & calc std
        betokenROIList = convertToCumulative(betokenROIList);
        this.standardDeviation = calcSampleStd(betokenROIList).dp(NUM_DECIMALS);

        // Compute timestamps
        let phase = timer.phase();
        let now = Math.floor(new Date().getTime() / 1000);
        let phaseStart = timer.phase_start_time();
        let phaseLengths = timer.phase_lengths();
        let timestamps = new Array(betokenROIList.length - 1);
        switch (phase) {
            case 0:
                // invest & withdraw phase
                // use last cycle's data
                timestamps[timestamps.length - 1] = {
                    end: phaseStart - phaseLengths[2],
                    start: phaseStart - phaseLengths[2] - phaseLengths[1]
                }
                break;
            case 1:
                // manage phase
                // use current data
                timestamps[timestamps.length - 1] = {
                    end: now,
                    start: phaseStart
                }
                break;
            case 2:
                // redeem commission phase
                // use data from manage phase
                timestamps[timestamps.length - 1] = {
                    end: phaseStart,
                    start: phaseStart - phaseLengths[1]
                }
                break;
        }
        for (let i = timestamps.length - 2; i >= 0; i--) {
            timestamps[i] = {
                start: 0,
                end: 0
            }
            timestamps[i].end = timestamps[i+1].start - phaseLengths[0] - phaseLengths[2];
            timestamps[i].start = timestamps[i].end - phaseLengths[1];
        }

        let MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        var timestampStrs = [];
        for (var i = 0; i < timestamps.length; i++) {
            timestampStrs.push(new Date(timestamps[i].start * 1e3).toLocaleDateString());
        }
        timestampStrs.push(new Date(timestamps[timestamps.length - 1].end * 1e3).toLocaleDateString());

        var xLabels = [];
        for (var i = 0; i < timestamps.length; i++) {
            var date = new Date(timestamps[i].start * 1e3);
            var formattedString = `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
            xLabels.push(formattedString);
        }
        xLabels.push("Now");

        // draw chart
        var ctx = document.getElementById("roi-chart");
        var performanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: xLabels,
                datasets: [
                    {
                        label: 'Betoken',
                        borderColor: '#22c88a',
                        backgroundColor: 'rgba(185, 238, 225, 0.5)',
                        fill: true,
                        data: betokenROIList
                    }
                ]
            },
            options: {
                maintainAspectRatio: false,
                scales: {
                    xAxes: [{
                        gridLines: {
                            display: false
                        }
                    }],
                    yAxes: [{
                        gridLines: {
                            display: true
                        },
                        ticks: {
                            callback: function(value, index, values) {
                                return value + '%';
                            }
                        }
                    }]
                },
                title: {
                    display: false
                },
                tooltips: {
                    enabled: true,
                    mode: 'index',
					intersect: false,
                    displayColors: true,
                    callbacks: {
                        label: function(tooltipItems, data) {
                            return tooltipItems.yLabel + '%';
                        },
                        title: function(tooltipItems, data) {
                            return timestampStrs[tooltipItems[0].index];
                        }
                    }
                },
                legend: {
                    display: false
                }
            }
        });
    }
}
