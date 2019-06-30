import { Component, OnInit } from '@angular/core';
import {
    user,
    timer,
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
    cycle: Number;
    errorMsg: String;

    constructor() {
        this.commissionHistory = new Array<Object>();
        this.commissionAmount = new BigNumber(0);
        this.transactionId = '';
        this.step = 0;
        this.cycle = 0;
        this.errorMsg = "";
    }

    ngOnInit() {
        this.refreshDisplay();
        $('#modalRedeem').on('hidden.bs.modal', () => {
            this.resetModals();
        });
    }

    refreshDisplay() {
        this.commissionHistory = user.commission_history();
        this.commissionAmount = user.expected_commission();
        this.cycle = timer.cycle();
    }

    async refresh() {
        await refresh_actions.records();
        this.refreshDisplay();
    }

    isLoading() {
        return loading.records();
    }

    resetModals() {
        this.step = 0;
    }

    redeemCommission(option) {
        let cycle = +$('#redeem-commission-cycle-input').val();

        let pending = (transactionHash) => {
            this.transactionId = transactionHash;
            if (this.step != 0) {
                this.step = 2;
            }
        }

        let confirm = () => {
            if (this.step != 0) {
                this.step = 3;
            }
            refresh_actions.records();
        }

        let error = (e) => {
            if (this.step != 0) {
                this.step = -1;
                this.errorMsg = e.toString();
            }
        }

        var inShares = (option == 0);
        if (cycle == 0) {
            manager_actions.redeem_commission(inShares, pending, confirm, error);
        } else {
            manager_actions.redeem_commission_for_cycle(inShares, cycle, pending, confirm, error);
        }

        this.step = 1;
    }
}
