import { Component, OnInit } from '@angular/core';
import {
    user,
    loading,
    refresh_actions,
    manager_actions
} from '../../betokenjs/helpers';

import { } from 'jquery';
import BigNumber from 'bignumber.js';
declare var $: any;
@Component({
    selector: 'app-account',
    templateUrl: './commissions.component.html'
})
export class CommissionsComponent implements OnInit {
    commissionHistory: Array<Object>;
    commissionAmount: BigNumber;
    transactionId: String;
    step: Number;

    constructor() {
        this.commissionHistory = new Array<Object>();
        this.commissionAmount = new BigNumber(0);
        this.transactionId = '';
        this.step = 0;
    }

    ngOnInit() {
        setInterval(() => {
            // using this.loadData directly as arg for setInterval() DOES NOT WORK!
            // I've tried, trust me
            this.refreshDisplay();
        }, 100);
        $('#modalRedeem').on('hidden.bs.modal', () => {
            this.resetModals();
        });
    }

    refreshDisplay() {
        this.commissionHistory = user.commission_history();
        this.commissionAmount = user.expected_commission();
    }

    refresh() {
        refresh_actions.records();
    }

    isLoading() {
        return loading.records();
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
