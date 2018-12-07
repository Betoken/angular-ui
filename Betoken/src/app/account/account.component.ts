import { Component, OnInit } from '@angular/core';
import {
    user,
    network,
    loading,
    refresh_actions,
    error_notifications
} from '../../betokenjs/helpers';


@Component({
    selector: 'app-account',
    templateUrl: './account.component.html',
    styleUrls: ['./account.component.scss']
})
export class AccountComponent implements OnInit {
    transactionTable: Array<Object>;
    transactionNetwork: String;

    errorMsg = '';
    constructor() {
    }

    ngOnInit() {
        error_notifications.set_error_msg("");
        setInterval(() => {
            // using this.loadData directly as arg for setInterval() DOES NOT WORK!
            // I've tried, trust me
            this.refreshDisplay();
            this.updateErrorMsg();
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

    updateErrorMsg() {
        error_notifications.check_dependency();
        this.errorMsg = error_notifications.get_error_msg();
    }
}
