import { Component, OnInit, OnDestroy } from '@angular/core';
import { user, stats, sortTable } from '../../betokenjs/helpers';

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

            let afterAUM = new BigNumber('6008.686061116096317715');
            let cycleROI = new BigNumber('0.08508490787182957362721748443953303149695851452111654543409043472130220013624746576266635494538887180');
            let beforeAUM = afterAUM.div(cycleROI.plus(1));
            let profit = afterAUM.minus(beforeAUM);
            let cycleStartBlock = '9773838';
            let cycleEndBlock = '9969868';
            const betoken = window['betoken'];
            let commissions = [];
            let kroTotalSupply = new BigNumber(await betoken.contracts.Kairo.methods.totalSupplyAt(cycleEndBlock).call());
            for (let m of this.rankingArray) {
                let riskTaken = new BigNumber(await betoken.getDoubleMapping("riskTakenInCycle", m.id, 10));
                let baseStake = new BigNumber(await betoken.contracts.Kairo.methods.balanceOfAt(m.id, cycleStartBlock).call());
                let riskThreshold = baseStake.times(3 * 24 * 60 * 60);
                let riskRatio = BigNumber.min(riskTaken.div(riskThreshold), 1);
                let kroBalance = new BigNumber(await betoken.contracts.Kairo.methods.balanceOfAt(m.id, cycleEndBlock).call());
                let managerCommission = profit.times(0.2).times(kroBalance).div(kroTotalSupply).times(riskRatio);
                if (managerCommission.gt(0)) {
                    commissions.push({
                        manager: m.id,
                        commission: managerCommission.toString()
                    });
                }

            }
            console.log(JSON.stringify(commissions));
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
