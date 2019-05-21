import { Component, OnInit } from '@angular/core';
import { user, stats, loading, refresh_actions } from '../../betokenjs/helpers';

import { } from 'jquery';
import BigNumber from 'bignumber.js';
declare var $: any;

@Component({
    selector: 'app-rankings',
    templateUrl: './rankings.component.html'
})

export class RankingsComponent implements OnInit {
    rankingArray: Array<Object>;
    userRanking = "";
    userValue = new BigNumber(0);
    userAddress = "";
    userROI = new BigNumber(0);
    userHistCommission = new BigNumber(0);

    constructor() {
    }

    ngOnInit() {
        setInterval(() => {
            this.refreshDisplay();
        }, 100);
    }

    refreshDisplay() {
        this.rankingArray = stats.ranking();
        this.userRanking = user.rank();
        this.userValue = user.portfolio_value();
        this.userAddress = user.address();
        this.userROI = user.monthly_roi();
        this.userHistCommission = user.historical_commission();
    }

    refresh() {
        refresh_actions.ranking();
    }

    isLoading() {
        return loading.ranking();
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
