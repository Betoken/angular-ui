import { Component, OnInit } from '@angular/core';
import {
    user,
    loading,
    refresh_actions
} from '../../betokenjs/helpers';

import { } from 'jquery';
declare var $: any;
@Component({
    selector: 'app-account',
    templateUrl: './commissions.component.html'
})
export class CommissionsComponent implements OnInit {
    commissionHistory: Array<Object>;

    constructor() {
    }

    ngOnInit() {
        setInterval(() => {
            // using this.loadData directly as arg for setInterval() DOES NOT WORK!
            // I've tried, trust me
            this.refreshDisplay();
        }, 100);
    }

    refreshDisplay() {
        this.commissionHistory = user.commission_history();
    }

    refresh() {
        refresh_actions.records();
    }

    isLoading() {
        return loading.records();
    }
}
