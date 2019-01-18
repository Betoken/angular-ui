import { Component, OnInit } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { AppComponent } from '../app.component';
import { user, manager_actions, refresh_actions } from '../../betokenjs/helpers';
import { Router } from '@angular/router';


declare var jquery:any;
declare var $ :any;
@Component({
    selector: 'app-redeem',
    templateUrl: './redeem.component.html',
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
    commissionAmount: any;

    step: Number;

    transactionId: '';

    openredeemModal() {
        this.ms.setredeemPopUp();
    }

    constructor(private ms: AppComponent, private router: Router) {
        this.step = 0;
    }

    ngOnInit() {
        setInterval(() => {
            this.commissionAmount = user.expected_commission().toFormat(4);
        }, 100 );
        $('#modalRedeem').on('hidden.bs.modal', () => {
            this.resetModals();
            this.router.navigate(['/dashboard']);
        });
    }

    resetModals() {
        this.step = 0;
    }

    redeemCommission(option) {
        this.step = 1;

        let pending = (transactionHash) => {
            this.transactionId = transactionHash;
            this.step = 2;
        }
    
        let confirm = () => {
            this.step = 3;
            refresh_actions.records();
        }

        if (option === 0) {
            manager_actions.redeem_commission(pending, confirm);
        }
        if (option === 1) {
            manager_actions.redeem_commission_in_shares(pending, confirm);
        }
    }
}
