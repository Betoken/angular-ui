import { Component, OnInit } from '@angular/core';
import {
    user,
    network
} from '../../betokenjs/helpers';
import {
    isLoadingRecords,
    loadTxHistory
} from '../../betokenjs/data-controller';
import { load } from '@angular/core/src/render3/instructions';


@Component({
    selector: 'app-account',
    templateUrl: './account.component.html',
    styleUrls: ['./account.component.scss']
})
export class AccountComponent implements OnInit {
    transactionTable: Array<Object>;
    transactionNetwork: String;

    constructor() {
    }

    ngOnInit() {
        setInterval(() => {
            // using this.loadData directly as arg for setInterval() DOES NOT WORK!
            // I've tried, trust me
            this.refreshDisplay();
        }, 1000);
    }

    refreshDisplay() {
        this.transactionTable = user.transaction_history();
        this.transactionNetwork = network.network_prefix();
    }

    linkopen(values) {
        window.open(`https://` + this.transactionNetwork + `.etherscan.io/tx/` + values + ``);
    }

    isLoading() {
        return isLoadingRecords.get();
    }
}
