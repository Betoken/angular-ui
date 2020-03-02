import { Component, OnInit, OnDestroy } from '@angular/core';
import { user, stats, timer, sortTable } from '../../betokenjs/helpers';

import { ApolloEnabled } from '../apollo';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';

import { } from 'jquery';
import BigNumber from 'bignumber.js';
import { isNull, isUndefined } from 'util';
declare var $: any;;

@Component({
    selector: 'app-rankings',
    templateUrl: './rankings.component.html'
})

export class RankingsComponent extends ApolloEnabled implements OnInit, OnDestroy {
    rankingArray: any;
    userRanking: String;
    userValue: BigNumber;
    userROI: BigNumber;
    userTotalCommission: BigNumber;
    isLoading: Boolean;

    constructor(private apollo: Apollo) {
        super();
        this.rankingArray = null;
        this.userRanking = '';
        this.userValue = new BigNumber(0);
        this.userROI = new BigNumber(0);
        this.userTotalCommission = new BigNumber(0);
        this.isLoading = true;
    }

    ngOnInit() {
        this.createQuery();
    }

    createQuery() {
        let userAddress = user.address().toLowerCase();
        this.query = this.apollo
            .watchQuery({
                pollInterval: this.pollInterval,
                fetchPolicy: this.fetchPolicy,
                query: gql`
                    {
                        managers(orderBy: "kairoBalanceWithStake", orderDirection: desc, first: 1000, where: {kairoBalanceWithStake_gt: 0}) {
                            id
                            kairoBalance
                            kairoBalanceWithStake
                            baseStake
                            totalCommissionReceived
                        }
                        manager(id: "${userAddress}") {
                            kairoBalance
                            kairoBalanceWithStake
                            baseStake
                            totalCommissionReceived
                        }
                    }
                `
            });
        this.querySubscription = this.query.valueChanges.subscribe((result) => this.handleQuery(result));
    }

    async handleQuery({ data, loading }) {
        this.isLoading = loading || isUndefined(loading);
        if (!loading) {
            this.rankingArray = data['managers'];
            setTimeout(sortTable, 100);
            let userAddress = user.address().toLowerCase();

            this.userRanking = this.rankingArray.findIndex((x) => x.id === userAddress) + 1;
            let userData = data['manager'];
            if (!isNull(userData)) {
                this.userValue = this.getManagerKairoBalance(userData);
                this.userROI = this.userValue.div(userData.baseStake).minus(1).times(100);
                this.userTotalCommission = new BigNumber(userData.totalCommissionReceived);
            }

            console.log('Generating list of dead managers...');
            const currentCycle = timer.cycle();
            let deadManagers = [];
            let deadKairo = 0;
            for (const m of this.rankingArray) {
                const lastActiveCycle = +(await user.last_active_cycle(m.id));
                const balance = +m.kairoBalance;
                if (lastActiveCycle <= currentCycle - 3 && balance > 0) {
                    deadManagers.push(m.id);
                    deadKairo += balance;
                }
            }
            console.log(`Dead managers: ${JSON.stringify(deadManagers)}`);
            console.log(`Dead Kairo: ${deadKairo}`);
        }
    }

    refreshDisplay() {
        this.isLoading = true;

        this.query.refetch().then((result) => this.handleQuery(result));
    }

    formatNumber(n) {
        return new BigNumber(n).toFixed(6);
    }

    isSupporter(_addr) {
        return stats.is_supporter(_addr);
    }

    handleNaN(n) {
        if (n === 'NaN') {
            return '0.000000';
        }
        return n;
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
