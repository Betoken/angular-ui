import { Component, OnInit } from '@angular/core';

import { ApolloEnabled } from '../apollo';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';

import {
  user, governance
} from '../../betokenjs/helpers';

@Component({
  selector: 'app-proposal',
  templateUrl: './upgrade.component.html'
})

export class UpgradeComponent extends ApolloEnabled implements OnInit {

  constructor(private apollo: Apollo) {
    super();
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

  handleQuery({ data, loading }) {
    if (!loading) {
      let fund = data['fund'];
      let manager = data['manager'];

      if (fund.cyclePhase === 'INTERMISSION') {
        // Intermission phase
        if (fund.hasFinalizedNextVersion) {
          // Had a successful vote last cycle, will upgrade
          
        } else {
          // Normal
          if (fund.upgradeVotingActive) {
            // The developer have initiated an upgrade
            
          } else {
            // No upgrade active, users could signal their desire for an upgrade
            let totalVotingWeight = governance.totalVotingWeight();
            if (totalVotingWeight.times(0.5).lte(fund.upgradeSignalStrength)) {
              // More than 50% Kairo have signaled for an upgrade
            } else {
              // Not enought Kairo have signaled an upgrade
            }
          }
        }
      } else {
        // Manage phase
        if (fund.upgradeVotingActive) {
          // Upgrade initiated, voting active
          const chunk = governance.chunk();
          const subchunk = governance.subchunk();
          if (chunk == 0) {
            // Chunk 0, no voting, waiting for news of vote to propagate
          } else if (chunk <= 5) {
            // Chunks 1-5, voting active
            if (fund.hasFinalizedNextVersion) {
              // There was a successful vote, voting inactive, display successful candidate
            } else {
              // No successful vote yet, let people vote
              if (subchunk == 0) {
                // Propose candidate
              } else {
                // Vote on candidate
                const forVotes = +fund.forVotes[chunk-1];
                const againstVotes = +fund.againstVotes[chunk-1];
                const totalSubmittedVotes = forVotes + againstVotes;
                const totalVotingWeight = governance.totalVotingWeight();
                const hasQuorum = totalVotingWeight.times(0.1).lte(totalSubmittedVotes);
                const hasConsensus = (totalSubmittedVotes > 0) && (forVotes / totalSubmittedVotes > 0.75);
                if (hasQuorum && hasConsensus) {
                  // Already has enough votes to succeed
                } else {
                  // Not enough votes to succeed
                }
              }
            }
          } else {
            // Chunks 6-8, no voting, reserved for reviewing the upgrade candidate's code
          }
        } else {
          // No upgrade, nothing active
        }
      }
    }
  }

  refreshDisplay() {
    this.query.refetch().then((result) => this.handleQuery(result));
  }
}
