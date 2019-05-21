import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {AppComponent} from '../app.component';

import { } from 'jquery';
declare var $: any;
import {
  user, timer, error_notifications, manager_actions, refresh_actions
} from '../../betokenjs/helpers';
import BigNumber from 'bignumber.js';
import { isNull } from 'util';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html'
})

export class HeaderComponent implements OnInit {
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
  copyInputMessage(inputElement){
    inputElement.select();
    document.execCommand('copy');
    inputElement.setSelectionRange(0, 0);
  }
 
  constructor(private ms: AppComponent, private router: Router ) {
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
    this.ms.setHeaderSidebarDisplay(!this.checkRouterURL('/start'));
    error_notifications.set_error_msg("");
    setInterval(() => {
        this.refreshDisplay();
    }, 100);
  }

  refreshDisplay() {
    this.days = timer.day();
    this.hours = timer.hour();
    this.minutes = timer.minute();
    this.seconds = timer.second();
    this.phase = timer.phase();

    this.user_address = user.address();
    if (isNull(user.address())) {
      this.user_address = this.ZERO_ADDR;
    }
    this.userKairoValue = user.portfolio_value();
    this.can_redeem_commission = user.can_redeem_commission();

    error_notifications.check_dependency();
    this.errorMsg = error_notifications.get_error_msg();
    this.ms.setHeaderSidebarDisplay(!this.checkRouterURL('/start'));
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

  reloadAll() {
    refresh_actions.reload_all();
  }
}
