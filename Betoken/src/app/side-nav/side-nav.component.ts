import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AppComponent } from '../app.component';
import { user, timer } from '../../betokenjs/helpers';
import { BigNumber } from 'bignumber.js';

@Component({
  selector: 'app-side-nav',
  templateUrl: './side-nav.component.html'
})

export class SideNavComponent implements OnInit {
  phase: Number;
  can_redeem_commission = true;
  days = 0;
  hours = 0;
  minutes = 0;
  seconds = 0;

  ZERO_ADDR = '0x0000000000000000000000000000000000000000';
  user_address = this.ZERO_ADDR;
  userKairoValue = new BigNumber(0);
  
  constructor(private ms: AppComponent , private router: Router) {
  }
  
  ngOnInit() {
    this.ms.setHeaderSidebarDisplay(!this.checkRouterURL('/start'));
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
    
    this.can_redeem_commission = user.can_redeem_commission();
    this.ms.setHeaderSidebarDisplay(!this.checkRouterURL('/start'));

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
}
