import { Component, OnInit } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { AppComponent } from '../app.component';
import {
    userAddress, countdown_timer_helpers, displayedKairoBalance, decisions_tab_events, assetSymbolToPrice,
    decisions_tab_helpers, sidebar, sidebar_heplers
} from '../../assets/body';

@Component({
    selector: 'app-redeem',
    templateUrl: './redeem.component.html',
    styleUrls: ['./redeem.component.scss'],
    animations: [
        trigger('toggleRedeem', [
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
export class RedeemComponent implements OnInit {
    redeemvalue: any;
    redeemcommissionvalue: any;
    selectedOption = 1;
    tableData: any;
    state: string;
    active: boolean;

    redeemalert: boolean;
    newcyclealert: boolean;

    step1: boolean;
    step2: boolean;
    step3: boolean;
    step4: boolean;

    footerbtn1: boolean;
    footerbtn2: boolean;

    days = 0;
    hours = 0;
    minutes = 0;
    seconds = 0;
    phase = -1;

    transactionId: '';

    openredeemModal() {
        this.ms.setredeemPopUp();
    }

    constructor(private ms: AppComponent) {
        setInterval(() => {
            if (userAddress.get() !== '0x0') {
                this.updateDates();
                this.list();
                this.redeemcommissionvalue = sidebar_heplers.expected_commission();
                //   console.log(this.redeemcommissionvalue);
            }
        }, 1000 );

        this.state = 'open';
        this.active = true;

        this.redeemalert = true;
        this.newcyclealert = false;

        this.footerbtn1 = true;
        this.footerbtn2 = false;

        this.step1 = true;
        this.step2 = false;
        this.step3 = false;
        this.step4 = false;
    }

    ngOnInit() {
        this.ms.getredeemPopUp().subscribe((open: boolean) => {

            if (open) {
                this.state = 'open';
                this.active = true;
            }

            if (!open) {
                this.state = 'close';
                this.active = false;
            }
        });

        this.redeemcommissionvalue = sidebar_heplers.expected_commission();
        console.log(this.redeemcommissionvalue);
    }

    async updateDates() {
        this.days = countdown_timer_helpers.day();
        this.hours = countdown_timer_helpers.hour();
        this.minutes = countdown_timer_helpers.minute();
        this.seconds = countdown_timer_helpers.second();
        this.phase = countdown_timer_helpers.phase();
    }

    redeem() {

        this.step2 = true;
        this.step3 = false;
        this.step4 = false;
        this.step1 = false;
        this.redeemCommission();
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
        this.step2 = false;
        this.step3 = false;
        this.step4 = true;
    }

    confirmredeem() {
        this.step3 = true;
        this.step4 = false;
        this.step1 = false;
        this.step2 = false;
        setTimeout(() => {
            this.step4 = true;
            this.step1 = false;
            this.step2 = false;
            this.step3 = false;
            this.redeemalert = false;
            this.newcyclealert = true;
            this.ms.setnewcyclebtn();
            this.footerbtn2 = true;
        }, 1000);
    }

    closePopup() {
        this.state = 'close';
        this.active = false;
        this.step1 = true;
        this.step2 = false;
        this.step3 = false;
        this.step4 = false;
    }

    hidealert() {
        this.redeemalert = false;
        this.newcyclealert = true;
    }

    redeemPopup() {
        this.openredeemModal();
    }

    async redeemCommission() {
        console.log(this.selectedOption);
        if (this.selectedOption === 1) {
            this.redeemvalue = await sidebar.redeem_commission(this.pending, this.confirm);
            console.log(this.redeemvalue);
        }
        if (this.selectedOption === 2) {
            this.redeemvalue = await sidebar.redeem_commission_in_shares(this.pending, this.confirm);
            console.log(this.redeemvalue);
        }
    }

    updateRedeemOption(event) {
        const value = event.target.value.trim();
        console.log(value);
        if (value === 'DAI - redeem commission') {
            this.selectedOption = 1;
            console.log(this.selectedOption);
        } else {
            this.selectedOption = 2;
            console.log(this.selectedOption);
        }
        console.log(this.selectedOption);

    }

    async list() {
        this.tableData = decisions_tab_helpers.investment_list();
        console.log(this.tableData);
    }

}
