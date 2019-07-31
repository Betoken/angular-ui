import { Component, OnInit } from '@angular/core';
import { tokens, loading, refresh_actions, sortTable } from '../../betokenjs/helpers';
import BigNumber from 'bignumber.js';

declare var $: any;

@Component({
    selector: 'app-market',
    templateUrl: './market.component.html'
})

export class MarketComponent implements OnInit {

    tokenData: Array<Object>;

    constructor() { }

    ngOnInit() {
        this.refreshDisplay();
    }

    ngAfterViewInit() {
        sortTable();
    }

    refreshDisplay() {
        this.tokenData = tokens.token_data().filter((x) => tokens.not_stablecoin(x.symbol));
    }

    async refresh() {
        await refresh_actions.prices();
        this.refreshDisplay();
    }

    isLoading() {
        return loading.prices();
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
