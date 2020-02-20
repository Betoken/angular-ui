import { Component, OnInit } from '@angular/core';

import { ApolloEnabled } from '../apollo';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';

import {
  user, governance
} from '../../betokenjs/helpers';
import { BigNumber } from 'bignumber.js';

declare var $: any;

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
  PASSED_NOT_FINALIZED,
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

  chunk: number;
  subchunk: number;

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

  managerAddress: string;
  managerVotingWeight: string;
  managerVotingSupport: boolean;
  managerSignal: boolean;
  managerProposedCandidate: string;

  modalStep: number;
  transactionId: string;
  errorMsg: string;

  constructor(private apollo: Apollo) {
    super();
    this.ZERO_ADDR = '0x0000000000000000000000000000000000000000';
    this.managerVotingSupport = true;
    this.modalStep = 0;
  }

  async ngOnInit() {
    $('#modalUpgrade').on('hidden.bs.modal', () => {
      this.resetModals();
    });
    this.createQuery();
    this.managerAddress = user.address().toLowerCase();
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

      if (manager) {
        this.managerVotingWeight = (await governance.getVotingWeight(user.address())).toFixed(4);
        this.managerSignal = manager.upgradeSignal;
      }

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
          this.chunk = governance.chunk();
          this.subchunk = governance.subchunk();
          const voteSuccessful = (chunkNum) => {
            const forVotes = isNaN(+fund.forVotes[chunkNum - 1]) ? 0 : +fund.forVotes[chunkNum - 1];
            const againstVotes = isNaN(+fund.againstVotes[chunkNum - 1]) ? 0 : +fund.againstVotes[chunkNum - 1];
            const totalSubmittedVotes = forVotes + againstVotes;
            const totalVotingWeight = governance.totalVotingWeight();
            const hasQuorum = totalVotingWeight.times(0.1).lt(totalSubmittedVotes);
            const hasConsensus = (totalSubmittedVotes > 0) && (forVotes / totalSubmittedVotes > 0.75);
            return hasQuorum && hasConsensus;
          }
          if (this.chunk == 0) {
            // Chunk 0, no voting, waiting for news of vote to propagate
            this.upgradeState = UpgradeStateEnum.PROPAGATING;
          } else if (this.chunk <= 5) {
            // Chunks 1-5, voting active
            if (fund.hasFinalizedNextVersion) {
              // There was a successful vote, voting inactive, display successful candidate
              this.nextVersion = fund.nextVersion;
              this.upgradeState = UpgradeStateEnum.PASSED;
            } else {
              // Check whether there has been a successful vote
              for (let c = 1; c < this.chunk; c++) {
                if (voteSuccessful(c)) {
                  this.nextVersion = fund.candidates[c - 1];
                  this.upgradeState = UpgradeStateEnum.PASSED_NOT_FINALIZED;
                  return;
                }
              }
              // No successful vote yet, let people vote
              let candidate = fund.candidates[this.chunk - 1];
              if (!candidate) candidate = this.ZERO_ADDR;
              if (this.subchunk == 0) {
                // Propose candidate
                if (candidate === this.ZERO_ADDR) {
                  this.upgradeState = UpgradeStateEnum.PROPOSING_NO_CANDIDATE;
                } else {
                  this.nextVersion = candidate;
                  this.proposer = fund.proposers[this.chunk - 1];
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

                  const forVotes = isNaN(+fund.forVotes[this.chunk - 1]) ? 0 : +fund.forVotes[this.chunk - 1];
                  const againstVotes = isNaN(+fund.againstVotes[this.chunk - 1]) ? 0 : +fund.againstVotes[this.chunk - 1];
                  const totalSubmittedVotes = forVotes + againstVotes;
                  const totalVotingWeight = governance.totalVotingWeight();
                  this.progressBarValue = new BigNumber(forVotes).toFixed(2);
                  this.progressBarMax = new BigNumber(totalSubmittedVotes).toFixed(2);
                  this.forVotes = new BigNumber(forVotes).toFixed(2);
                  this.againstVotes = new BigNumber(againstVotes).toFixed(2);
                  this.quorumPercentage = new BigNumber(totalSubmittedVotes).div(totalVotingWeight).times(100).toFixed(2);
                  this.supportPercentage = totalSubmittedVotes == 0 ? '0.00' : new BigNumber(forVotes).div(totalSubmittedVotes).times(100).toFixed(2);
                  if (voteSuccessful(this.chunk)) {
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
              // Check whether there has been a successful vote
              for (let c = 1; c < this.chunk; c++) {
                if (voteSuccessful(c)) {
                  this.nextVersion = fund.candidates[c - 1];
                  this.upgradeState = UpgradeStateEnum.PASSED_NOT_FINALIZED;
                  return;
                }
              }
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

  resetModals() {
    this.modalStep = 0;
    this.transactionId = '';
  }

  continue() {
    this.modalStep = 1;

    let pending = (transactionHash) => {
      if (this.modalStep != 0) {
        this.transactionId = transactionHash;
        this.modalStep = 2;
      }
    }

    let confirm = () => {
      if (this.modalStep != 0) {
        this.modalStep = 3;
      }
      this.refreshDisplay();
    }

    let error = (e) => {
      if (this.modalStep != 0) {
        this.modalStep = -1;
        this.errorMsg = JSON.stringify(e);
      }
    }

    switch (this.upgradeState) {
      case UpgradeStateEnum.SIGNALING_ENOUGH:
      case UpgradeStateEnum.SIGNALING_NOT_ENOUGH:
        // Submit signal
        governance.signalUpgrade(this.managerVotingSupport, pending, confirm, error);
        break;
      case UpgradeStateEnum.PROPOSING_HAS_CANDIDATE:
      case UpgradeStateEnum.PROPOSING_NO_CANDIDATE:
        // Propose candidate
        governance.proposeCandidate(this.chunk, this.managerProposedCandidate, pending, confirm, error);
        break;
      case UpgradeStateEnum.VOTING_ENOUGH:
      case UpgradeStateEnum.VOTING_NOT_ENOUGH:
        // Vote
        governance.voteOnCandidate(this.chunk, this.managerVotingSupport, pending, confirm, error);
        break;
      case UpgradeStateEnum.PASSED_NOT_FINALIZED:
        // Finalize vote
        governance.finalizeSuccessfulVote(this.chunk, pending, confirm, error);
        break;
      default:
        break;
    }
  }

  canPropose() {
    return this.upgradeState == UpgradeStateEnum.PROPOSING_NO_CANDIDATE
      || (this.upgradeState == UpgradeStateEnum.PROPOSING_HAS_CANDIDATE && (+this.managerVotingWeight > +this.proposerVotingWeight || this.managerAddress === this.proposer));
  }
}
