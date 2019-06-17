import { Component, OnInit } from '@angular/core';
import { tokens, loading, refresh_actions } from '../../betokenjs/helpers';
import BigNumber from 'bignumber.js';
import { isUndefined } from 'util';

declare var $ :any;

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

    refreshDisplay() {
        this.tokenData = tokens.token_data().get().filter((x) => tokens.not_stablecoin(x.symbol));
    }

    refresh() {
        refresh_actions.prices();
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
