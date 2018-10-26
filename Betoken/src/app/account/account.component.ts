import { Component, OnInit } from '@angular/core';
import {
    user,
    network
} from '../../betokenjs/helpers';
import {
    isLoadingRecords,
    loadTxHistory
} from '../../betokenjs/data-controller';


@Component({
    selector: 'app-account',
    templateUrl: './account.component.html',
    styleUrls: ['./account.component.scss']
})
export class AccountComponent implements OnInit {
    transactionTable: any;
    transactionNetwork: any;

    constructor() {
    }

    ngOnInit() {
        // this.loadData();
    }

    async loadData() {
        await loadTxHistory();
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
