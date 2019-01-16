import { Component, OnInit } from '@angular/core';
import {
    user,
    network,
    loading,
    refresh_actions
} from '../../betokenjs/helpers';


@Component({
    selector: 'app-account',
    templateUrl: './commissions.component.html'
})
export class CommissionsComponent implements OnInit {
    transactionTable: Array<Object>;
    transactionNetwork: String;

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
        this.transactionTable = user.transaction_history();
        this.transactionNetwork = network.network_prefix();
    }

    refresh() {
        refresh_actions.records();
    }

    linkopen(values) {
        window.open(`https://` + this.transactionNetwork + `.etherscan.io/tx/` + values + ``);
    }

    isLoading() {
        return loading.records();
    }

}
