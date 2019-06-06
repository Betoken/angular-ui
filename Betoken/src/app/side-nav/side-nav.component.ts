import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AppComponent } from '../app.component';
import { user, timer, manager_actions } from '../../betokenjs/helpers';
import { BigNumber } from 'bignumber.js';

@Component({
  selector: 'app-side-nav',
  templateUrl: './side-nav.component.html'
})

export class SideNavComponent implements OnInit {
  days: Number;
  hours: Number;
  minutes: Number;
  seconds: Number;
  phase: Number;

  ZERO_ADDR = '0x0000000000000000000000000000000000000000';
  user_address: String;
  userKairoValue: BigNumber;
  can_redeem_commission: boolean;
  
  constructor(private ms: AppComponent , private router: Router) {
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
    setInterval(() => {
      this.refreshDisplay();
    }, 500);
  }
  
  refreshDisplay() {
    this.days = timer.day();
    this.hours = timer.hour();
    this.minutes = timer.minute();
    this.seconds = timer.second();
    this.phase = timer.phase();
    
    this.can_redeem_commission = user.can_redeem_commission();

    this.user_address = user.address();
    this.userKairoValue = user.portfolio_value();
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
