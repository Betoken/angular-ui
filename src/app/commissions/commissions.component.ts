import { Component, OnInit } from '@angular/core';
import {
    user,
    manager_actions
} from '../../betokenjs/helpers';

import { ApolloEnabled } from '../apollo';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';

import { } from 'jquery';
import BigNumber from 'bignumber.js';
import { isNull, isUndefined } from 'util';
declare var $: any;;
@Component({
    selector: 'app-account',
    templateUrl: './commissions.component.html'
})
export class CommissionsComponent extends ApolloEnabled implements OnInit {
    commissionHistory: Array<Object>;
    commissionAmount: BigNumber;
    totalCommissionReceived: BigNumber;
    transactionId: String;
    step: Number;
    cycle: Number;
    errorMsg: String;

    isLoading: Boolean;

    constructor(private apollo: Apollo) {
        super();

        this.commissionHistory = new Array<Object>();
        this.commissionAmount = new BigNumber(0);
        this.totalCommissionReceived = new BigNumber(0);
        this.transactionId = '';
        this.step = 0;
        this.cycle = 0;
        this.errorMsg = "";

        this.isLoading = true;
    }

    ngOnInit() {
        $('#modalRedeem').on('hidden.bs.modal', () => {
            this.resetModals();
        });
        $('[data-toggle="tooltip"]').tooltip();
        this.createQuery();
    }

    createQuery() {
        let userAddress = user.address().toLowerCase();
        this.query = this.apollo
            .watchQuery({
                pollInterval: 300000,
                fetchPolicy: 'cache-and-network',
                query: gql`
                    {
                        fund(id: "BetokenFund") {
                            kairoTotalSupply
                            cyclePhase
                            cycleTotalCommission
                            aum
                            totalFundsInDAI
                            cycleNumber
                            totalFundsAtPhaseStart
                        }
                        manager(id: "${userAddress}") {
                            kairoBalance
                            totalCommissionReceived
                            kairoBalanceWithStake
                            commissionHistory(orderBy: timestamp, orderDirection: desc) {
                                timestamp
                                cycleNumber
                                amountInDAI
                                txHash
                            }
                        }
                    }
                `
            });
        this.querySubscription = this.query.valueChanges.subscribe((result) => this.handleQuery(result));
    }

    handleQuery({ data, loading }) {
        this.isLoading = isUndefined(loading) || loading;

        if (!loading) {
            let fund = data['fund'];
            let manager = data['manager'];

            this.cycle = +fund.cycleNumber;

            if (!isNull(manager)) {
                this.totalCommissionReceived = new BigNumber(manager.totalCommissionReceived);
                this.commissionHistory = manager.commissionHistory;

                // calculate expected commission
                if (+fund.kairoTotalSupply > 0) {
                    let userValue = new BigNumber(manager.kairoBalanceWithStake);
                    if (fund.cyclePhase === 'INTERMISSION') {
                        // Actual commission that will be redeemed
                        this.commissionAmount = new BigNumber(manager.kairoBalance).div(fund.kairoTotalSupply).times(fund.cycleTotalCommission);
                    } else {
                        // Expected commission based on previous average ROI
                        let actualKairoSupply = new BigNumber(fund.kairoTotalSupply).div(fund.totalFundsInDAI).times(fund.aum);
                        let totalProfit = new BigNumber(fund.aum).minus(fund.totalFundsAtPhaseStart);
                        totalProfit = BigNumber.max(totalProfit, 0);
                        let commission = totalProfit.div(actualKairoSupply).times(userValue).times(user.commission_rate());
                        let assetFee = new BigNumber(fund.aum).div(actualKairoSupply).times(userValue).times(user.asset_fee_rate());
                        this.commissionAmount = commission.plus(assetFee);
                    }
                }
            }
        }
    }

    refreshDisplay() {
        this.isLoading = true;
        this.query.refetch().then((result) => this.handleQuery(result));
    }

    resetModals() {
        this.step = 0;
    }

    redeemCommission(option) {
        let cycle = +$('#redeem-commission-cycle-input').val();

        let pending = (transactionHash) => {
            this.transactionId = transactionHash;
            if (this.step != 0) {
                this.step = 2;
            }
        }

        let confirm = () => {
            if (this.step != 0) {
                this.step = 3;
            }
            this.refreshDisplay();
        }

        let error = (e) => {
            if (this.step != 0) {
                this.step = -1;
                this.errorMsg = e.toString();
            }
        }

        var inShares = (option == 0);
        if (cycle == 0) {
            manager_actions.redeem_commission(inShares, pending, confirm, error);
        } else {
            manager_actions.redeem_commission_for_cycle(inShares, cycle, pending, confirm, error);
        }

        this.step = 1;
    }
}
