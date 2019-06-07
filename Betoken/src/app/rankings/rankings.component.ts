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
    userRanking: String;
    userValue: BigNumber;
    userAddress: String;
    userROI: BigNumber;

    constructor() {
        this.rankingArray = new Array<Object>();
        this.userRanking = '';
        this.userValue = new BigNumber(0);
        this.userAddress = '';
        this.userROI = new BigNumber(0);
    }

    ngOnInit() {
        this.refreshDisplay();
    }

    refreshDisplay() {
        this.rankingArray = stats.ranking();
        this.userRanking = user.rank();
        this.userValue = user.portfolio_value();
        this.userAddress = user.address();
        this.userROI = user.monthly_roi();
    }

    async refresh() {
        await refresh_actions.ranking();
        this.refreshDisplay();
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
