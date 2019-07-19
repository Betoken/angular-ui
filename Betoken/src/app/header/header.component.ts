import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AppComponent } from '../app.component';

import { } from 'jquery';
declare var $: any;
import {
  user, timer, error_notifications, manager_actions, refresh_actions
} from '../../betokenjs/helpers';
import BigNumber from 'bignumber.js';
import { isNull } from 'util';

import { ApolloEnabled } from '../apollo';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html'
})

export class HeaderComponent extends ApolloEnabled implements OnInit {
  ZERO_ADDR = '0x0000000000000000000000000000000000000000';

  days: Number;
  hours: Number;
  minutes: Number;
  seconds: Number;
  phase: Number;

  user_address: String;
  userKairoValue: BigNumber;

  can_redeem_commission: boolean;

  errorMsg: String;

  /* To copy Text from Textbox */
  copyInputMessage(inputElement) {
    inputElement.select();
    document.execCommand('copy');
    inputElement.setSelectionRange(0, 0);
  }

  constructor(private ms: AppComponent, private router: Router, private apollo: Apollo) {
    super();
    
    this.days = 0;
    this.hours = 0;
    this.minutes = 0;
    this.seconds = 0;
    this.phase = -1;

    this.user_address = this.ZERO_ADDR;
    this.userKairoValue = new BigNumber(0);

    this.can_redeem_commission = true;

    this.errorMsg = '';
  }

  ngOnInit() {
    this.refreshHeaderSidebarDisplay();
    error_notifications.set_error_msg("");
    this.refreshDisplay();
    setInterval(() => this.updateTimer(), 1000);
    setInterval(() => this.refreshHeaderSidebarDisplay(), 1000);
  }

  updateTimer() {
    this.days = timer.day();
    this.hours = timer.hour();
    this.minutes = timer.minute();
    this.seconds = timer.second();
  }

  refreshDisplay() {
    this.user_address = user.address();
    
    error_notifications.check_dependency();
    this.errorMsg = error_notifications.get_error_msg();

    let userAddress = user.address().toLowerCase();
    this.querySubscription = this.apollo
      .watchQuery({
        query: gql`
          {
            fund(id: "BetokenFund") {
              cycleNumber
              cyclePhase
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

        this.phase = fund.cyclePhase === 'INTERMISSION' ? 0 : 1;
        this.userKairoValue = new BigNumber(manager.kairoBalanceWithStake);
        this.can_redeem_commission = this.phase == 0 && +manager.lastCommissionRedemption < +fund.cycleNumber && userAddress !== this.ZERO_ADDR;
      });
  }

  refreshHeaderSidebarDisplay() {
    this.ms.setHeaderSidebarDisplay(!this.checkRouterURL('/start') && !this.checkRouterURL('/start-managing'));
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

  async reloadAll() {
    await refresh_actions.reload_all();
    this.refreshDisplay();
  }
}
