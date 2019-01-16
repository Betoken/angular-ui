import { Component, OnInit } from '@angular/core';
import { user, stats, loading, refresh_actions } from '../../betokenjs/helpers';
import BigNumber from 'bignumber.js';

@Component({
    selector: 'app-rankings',
    templateUrl: './rankings.component.html'
})
export class RankingsComponent implements OnInit {
    rankingArray = [];
    userRanking = [];
    userValue: any;
    userAddress: String;
    userROI: any;

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
        this.userValue = user.portfolio_value().toFormat(10);
        this.userAddress = user.address();
        this.userROI = user.monthly_roi().toFormat(4);
    }

    refresh() {
        refresh_actions.ranking();
    }

    isLoading() {
        return loading.ranking();
    }

}
