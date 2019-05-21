import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {AppComponent} from '../app.component';

import { } from 'jquery';
declare var $: any;
import {
  user, timer, network, error_notifications
} from '../../betokenjs/helpers';
import BigNumber from 'bignumber.js';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html'
})

export class HeaderComponent implements OnInit {
  days = 0;
  hours = 0;
  minutes = 0;
  seconds = 0;
  phase = -1;

  user_address = '0x0';
  userKairoValue = new BigNumber(0);

  can_redeem_commission = true;

  errorMsg = '';

  /* To copy Text from Textbox */
 copyInputMessage(inputElement){
   inputElement.select();
   document.execCommand('copy');
   inputElement.setSelectionRange(0, 0);
 }
 
  constructor(private ms: AppComponent, private router: Router ) {}

  ngOnInit() {
    error_notifications.set_error_msg("");
    setInterval(() => {
        this.updateErrorMsg();
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
    this.userKairoValue = user.portfolio_value();
    this.can_redeem_commission = user.can_redeem_commission();

    error_notifications.check_dependency();
    this.errorMsg = error_notifications.get_error_msg();
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

  updateErrorMsg() {
      error_notifications.check_dependency();
      this.errorMsg = error_notifications.get_error_msg();
  }
}
