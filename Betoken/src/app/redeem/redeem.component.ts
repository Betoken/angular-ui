import { Component, OnInit } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { AppComponent } from '../app.component';
import { user, timer, manager_actions, refresh_actions } from '../../betokenjs/helpers';

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
        this.state = 'open';
        this.active = true;

        this.redeemalert = true;

        this.footerbtn1 = true;
        this.footerbtn2 = false;

        this.step1 = true;
        this.step2 = false;
        this.step3 = false;
        this.step4 = false;
    }

    ngOnInit() {
        setInterval(() => {
            this.updateDates();
            this.redeemcommissionvalue = user.expected_commission().toFormat(18);
        }, 100 );

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
    }

    async updateDates() {
        this.days = timer.day();
        this.hours = timer.hour();
        this.minutes = timer.minute();
        this.seconds = timer.second();
        this.phase = timer.phase();
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
        refresh_actions.records();
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
    }

    redeemPopup() {
        this.openredeemModal();
    }

    async redeemCommission() {
        if (this.selectedOption === 1) {
            this.redeemvalue = await manager_actions.redeem_commission(this.pending, this.confirm);
        }
        if (this.selectedOption === 2) {
            this.redeemvalue = await manager_actions.redeem_commission_in_shares(this.pending, this.confirm);
        }
    }

    updateRedeemOption(event) {
        const value = event.target.value.trim();
        if (value === 'DAI Stablecoin') {
            this.selectedOption = 1;
        } else {
            this.selectedOption = 2;
        }
    }
}
