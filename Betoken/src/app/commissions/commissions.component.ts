import { Component, OnInit } from '@angular/core';
import {
    user,
    network,
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

    isLoading() {
        return loading.records();
    }

    filterTable = (event, tableID, searchID) => {
        let searchInput = event.target.value.toLowerCase();
        let entries = $(`#${tableID} tr`);
        for (let i = 0; i < entries.length; i++) {
            let entry = entries[i];
            let searchTarget = entry.children[searchID];
            if (searchTarget) {
                if (searchTarget.innerText.toLowerCase().indexOf(searchInput) > -1)
                    entry.style.display = "";
                else
                    entry.style.display = "none";
            }
        }
    }
}
