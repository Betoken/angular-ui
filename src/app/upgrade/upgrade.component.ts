import { Component, OnInit } from '@angular/core';

import { ApolloEnabled } from '../apollo';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';

import {
  user, governance
} from '../../betokenjs/helpers';
import { BigNumber } from 'bignumber.js';

enum UpgradeStateEnum {
  DEV_PROPOSED,
  SIGNALING_ENOUGH,
  SIGNALING_NOT_ENOUGH,
  PROPAGATING,
  PROPOSING_NO_CANDIDATE,
  PROPOSING_HAS_CANDIDATE,
  VOTING_NO_CANDIDATE,
  VOTING_ENOUGH,
  VOTING_NOT_ENOUGH,
  PASSED,
  ALL_FAILED,
  FINALIZED,
  IDLE,
}

@Component({
  selector: 'app-proposal',
  templateUrl: './upgrade.component.html'
})

export class UpgradeComponent extends ApolloEnabled implements OnInit {
  ZERO_ADDR: string;
  UpgradeState = UpgradeStateEnum;

  nextVersion: any;
  proposer: string;
  proposerVotingWeight: string;
  upgradeState: UpgradeStateEnum;
  progressBarValue: string;
  progressBarMax: string;
  forVotes: string;
  againstVotes: string;
  quorumPercentage: string;
  supportPercentage: string;
  upgradeHistory: Array<string>;

  constructor(private apollo: Apollo) {
    super();
    this.ZERO_ADDR = '0x0000000000000000000000000000000000000000';
  }

  async ngOnInit() {
    this.createQuery();
    this.upgradeHistory = await governance.getUpgradeHistory();
  }

  createQuery() {
    let userAddress = user.address().toLowerCase();
    this.query = this.apollo
      .watchQuery({
        pollInterval: this.pollInterval,
        fetchPolicy: this.fetchPolicy,
        query: gql`
          {
            fund(id: "BetokenFund") {
              cycleNumber
              cyclePhase
              upgradeVotingActive
              nextVersion
              hasFinalizedNextVersion
              proposers
              candidates
              forVotes
              againstVotes
              upgradeSignalStrength
            }
            manager(id: "${userAddress}") {
              upgradeSignal
              votes
            }
          }
        `
      });
    this.querySubscription = this.query.valueChanges.subscribe((result) => this.handleQuery(result));
  }

  async handleQuery({ data, loading }) {
    if (!loading) {
      let fund = data['fund'];
      let manager = data['manager'];

      if (fund.cyclePhase === 'INTERMISSION') {
        // Intermission phase
        if (fund.hasFinalizedNextVersion) {
          // Had a successful vote last cycle, will upgrade
          this.upgradeState = UpgradeStateEnum.FINALIZED;
          this.nextVersion = fund.nextVersion;
        } else {
          // Normal
          if (fund.upgradeVotingActive) {
            // The developer have initiated an upgrade
            this.upgradeState = UpgradeStateEnum.DEV_PROPOSED;
            this.nextVersion = fund.nextVersion;
          } else {
            // No upgrade active, users could signal their desire for an upgrade
            let totalVotingWeight = governance.totalVotingWeight();
            if (totalVotingWeight.times(0.5).lt(fund.upgradeSignalStrength)) {
              // More than 50% Kairo have signaled for an upgrade
              this.upgradeState = UpgradeStateEnum.SIGNALING_ENOUGH;
            } else {
              // Not enought Kairo have signaled an upgrade
              this.upgradeState = UpgradeStateEnum.SIGNALING_NOT_ENOUGH;
            }
            this.progressBarValue = new BigNumber(fund.upgradeSignalStrength).toFixed(2);
            this.progressBarMax = totalVotingWeight.toFixed(2);
          }
        }
      } else {
        // Manage phase
        if (fund.upgradeVotingActive) {
          // Upgrade initiated, voting active
          let chunk = governance.chunk();
          let subchunk = governance.subchunk();
          if (chunk == 0) {
            // Chunk 0, no voting, waiting for news of vote to propagate
            this.upgradeState = UpgradeStateEnum.PROPAGATING;
          } else if (chunk <= 5) {
            // Chunks 1-5, voting active
            if (fund.hasFinalizedNextVersion) {
              // There was a successful vote, voting inactive, display successful candidate
              this.nextVersion = fund.nextVersion;
              this.upgradeState = UpgradeStateEnum.PASSED;
            } else {
              // No successful vote yet, let people vote
              let candidate = fund.candidates[chunk - 1];
              if (!candidate) candidate = this.ZERO_ADDR;
              if (subchunk == 0) {
                // Propose candidate
                if (candidate === this.ZERO_ADDR) {
                  this.upgradeState = UpgradeStateEnum.PROPOSING_NO_CANDIDATE;
                } else {
                  this.nextVersion = candidate;
                  this.proposer = fund.proposers[chunk - 1];
                  this.proposerVotingWeight = (await governance.getVotingWeight(this.proposer)).toFixed(2);
                  this.upgradeState = UpgradeStateEnum.PROPOSING_HAS_CANDIDATE;
                }
              } else {
                // Vote on candidate
                if (candidate === this.ZERO_ADDR) {
                  // No candidate
                  this.upgradeState = UpgradeStateEnum.VOTING_NO_CANDIDATE;
                } else {
                  // Has candidate, vote
                  this.nextVersion = candidate;

                  const forVotes = isNaN(+fund.forVotes[chunk - 1]) ? 0 : +fund.forVotes[chunk - 1];
                  const againstVotes = isNaN(+fund.againstVotes[chunk - 1]) ? 0 : +fund.againstVotes[chunk - 1];
                  const totalSubmittedVotes = forVotes + againstVotes;
                  const totalVotingWeight = governance.totalVotingWeight();
                  const hasQuorum = totalVotingWeight.times(0.1).lt(totalSubmittedVotes);
                  const hasConsensus = (totalSubmittedVotes > 0) && (forVotes / totalSubmittedVotes > 0.75);
                  this.progressBarValue = new BigNumber(forVotes).toFixed(2);
                  this.progressBarMax = new BigNumber(totalSubmittedVotes).toFixed(2);
                  this.forVotes = new BigNumber(forVotes).toFixed(2);
                  this.againstVotes = new BigNumber(againstVotes).toFixed(2);
                  this.quorumPercentage = new BigNumber(totalSubmittedVotes).div(totalVotingWeight).times(100).toFixed(2);
                  this.supportPercentage = totalSubmittedVotes == 0 ? '0.00' : new BigNumber(forVotes).div(totalSubmittedVotes).times(100).toFixed(2);
                  if (hasQuorum && hasConsensus) {
                    // Already has enough votes to succeed
                    this.upgradeState = UpgradeStateEnum.VOTING_ENOUGH;
                  } else {
                    // Not enough votes to succeed
                    this.upgradeState = UpgradeStateEnum.VOTING_NOT_ENOUGH;
                  }
                }
              }
            }
          } else {
            // Chunks 6-8, no voting, reserved for reviewing the upgrade candidate's code
            if (fund.hasFinalizedNextVersion) {
              this.nextVersion = fund.nextVersion;
              this.upgradeState = UpgradeStateEnum.PASSED;
            } else {
              this.upgradeState = UpgradeStateEnum.ALL_FAILED;
            }
          }
        } else {
          if (fund.hasFinalizedNextVersion) {
            this.nextVersion = fund.nextVersion;
            this.upgradeState = UpgradeStateEnum.PASSED;
          } else {
            // No upgrade, nothing active
            this.upgradeState = UpgradeStateEnum.IDLE;
          }
        }
      }
    }
  }

  refreshDisplay() {
    this.query.refetch().then((result) => this.handleQuery(result));
  }
}
