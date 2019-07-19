import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AppComponent } from '../app.component';
import { user, timer, manager_actions } from '../../betokenjs/helpers';
import { BigNumber } from 'bignumber.js';

import { ApolloEnabled } from '../apollo';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';

@Component({
  selector: 'app-side-nav',
  templateUrl: './side-nav.component.html'
})

export class SideNavComponent extends ApolloEnabled implements OnInit {
  days: Number;
  hours: Number;
  minutes: Number;
  seconds: Number;
  phase: Number;

  ZERO_ADDR = '0x0000000000000000000000000000000000000000';
  user_address: String;
  userKairoValue: BigNumber;
  can_redeem_commission: boolean;
  
  constructor(private router: Router, private apollo: Apollo) {
    super();
    this.days = 0;
    this.hours = 0;
    this.minutes = 0;
    this.seconds = 0;
    this.phase = 0;

    this.user_address = this.ZERO_ADDR;
    this.userKairoValue = new BigNumber(0);
    this.can_redeem_commission = true;
  }
  
  ngOnInit() {
    this.refreshDisplay();
    setInterval(() => this.refreshDisplay(), 1000);
  }
  
  refreshDisplay() {
    this.days = timer.day();
    this.hours = timer.hour();
    this.minutes = timer.minute();
    this.seconds = timer.second();
    
    this.user_address = user.address();
    let userAddress = user.address().toLowerCase();
    this.querySubscription = this.apollo
      .watchQuery({
        query: gql`
          {
            fund(id: "BetokenFund") {
              cyclePhase
              cycleNumber
            }
            manager(id: "${userAddress}") {
              kairoBalanceWithStake
              lastCommissionRedemption
            }
          }
        `
      })
      .valueChanges.subscribe(({ data, loading }) => {
        let fund = data['fund'];
        let manager = data['manager'];

        this.userKairoValue = new BigNumber(manager.kairoBalanceWithStake);
        this.phase = fund.cyclePhase === 'INTERMISSION' ? 0 : 1;
        this.can_redeem_commission = this.phase == 0 && +manager.lastCommissionRedemption < +fund.cycleNumber && userAddress !== this.ZERO_ADDR;
      });
  }
  
  phaseActionText() {
    switch (this.phase) {
      case 0:
      return 'until managing begins';
      case 1:
      return 'to manage';
      case 2:
      return 'to redeem commission';
    }
  }

  checkRouterURL(route) {
    return this.router.url === route;
  }

  nextPhase() {
    manager_actions.nextPhase();
  }
}
