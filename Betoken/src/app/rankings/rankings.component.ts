import { Component, OnInit, OnDestroy } from '@angular/core';
import { user, stats, sortTable } from '../../betokenjs/helpers';

import { ApolloEnabled } from '../apollo';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';

import { } from 'jquery';
import BigNumber from 'bignumber.js';
import { isNull } from 'util';
declare var $: any;

@Component({
    selector: 'app-rankings',
    templateUrl: './rankings.component.html'
})

export class RankingsComponent extends ApolloEnabled implements OnInit, OnDestroy {
    rankingArray: any;
    userRanking: String;
    userValue: BigNumber;
    userROI: BigNumber;
    isLoading: Boolean;

    constructor(private apollo: Apollo) {
        super();
        this.rankingArray = null;
        this.userRanking = '';
        this.userValue = new BigNumber(0);
        this.userROI = new BigNumber(0);
        this.isLoading = true;
    }

    ngOnInit() {
        this.refreshDisplay();
    }

    refreshDisplay() {
        this.isLoading = true;
        let userAddress = user.address().toLowerCase();
        this.querySubscription = this.apollo
            .watchQuery({
                query: gql`
                    {
                        managers(orderBy: kairoBalanceWithStake, orderDirection: desc, first: 1000) {
                            id
                            kairoBalanceWithStake
                            baseStake
                        }
                        manager(id: "${userAddress}") {
                            kairoBalanceWithStake
                            baseStake
                        }
                    }
                `
            })
            .valueChanges.subscribe((result) => {
                this.isLoading = result.loading;
                this.rankingArray = result.data['managers'];
                setTimeout(sortTable, 100);

                this.userRanking = this.rankingArray.findIndex((x) => x.id === userAddress) + 1;
                let userData = result.data['manager'];
                if (!isNull(userData)) {
                    this.userValue = new BigNumber(userData.kairoBalanceWithStake);
                    this.userROI = this.userValue.div(userData.baseStake).minus(1).times(100);
                }
            });
    }

    formatNumber(n) {
        return new BigNumber(n).toFixed(6);
    }

    isSupporter(_addr) {
        return stats.is_supporter(_addr);
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
