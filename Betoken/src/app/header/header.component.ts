import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {AppComponent} from '../app.component';

import { } from 'jquery';
declare var $: any;
import {
  user, timer, network, error_notifications
} from '../../betokenjs/helpers';


@Component({
  selector: 'app-header',
  templateUrl: './header.component.html'
})
export class HeaderComponent implements OnInit {

  btn1: boolean;
  btn2: boolean;
  btn3: boolean;

  tradebtn: boolean;
  nextphasebtn: boolean;
  redeembtn: boolean;

  sellalert: boolean;
  nextphasealert: boolean;
  redeemalert: boolean;

  newcyclebtn: boolean;

  days = 0;
  hours = 0;
  minutes = 0;
  seconds = 0;
  phase = -1;

  user_address = '0x0';
  share_balance = 0.0000;
  
  curr_network = '';
  can_redeem_commission = true;

  errorMsg = '';

  constructor(private ms: AppComponent, private router: Router ) {
    this.btn1 = true;
    this.btn2 = false;
    this.btn3 = false;
    this.tradebtn = true;
    this.nextphasebtn = false;
    this.redeembtn = false;
    this.newcyclebtn = false;
    this.sellalert = false;
    this.nextphasealert = false;
    this.redeemalert = false;
  }

  ngOnInit() {
    error_notifications.set_error_msg("");
    setInterval(() => {
        this.updateErrorMsg();
        this.refreshDisplay();
    }, 100);

    this.ms.getNextPhaseBtn().subscribe((nextbtn: boolean) => {

      if (nextbtn) {
        this.btn2 = true;
        this.btn1 = false;
        this.btn3 = false;
      }

    });

    this.ms.getTradeBtn().subscribe((tradebtn: boolean) => {

      if (tradebtn) {
        this.btn3 = true;
        this.btn1 = false;
        this.btn2 = false;
      }

    });

    this.ms.getNextButton().subscribe((nextbutton: boolean) => {
      if (nextbutton) {
        this.nextphasebtn = true;
        this.tradebtn = false;
        this.redeembtn = false;
      }
    });

    this.ms.getRedeemButton().subscribe((redeembutton: boolean) => {
      if (redeembutton) {
        this.redeembtn = true;
        this.nextphasebtn = false;
        this.tradebtn = false;
      }
    });

    this.ms.getnewcyclebtn().subscribe((newcyclebutton: boolean) => {
      if (newcyclebutton) {
        this.newcyclebtn = true;
      }
    });
  }

  refreshDisplay() {
    this.days = timer.day();
    this.hours = timer.hour();
    this.minutes = timer.minute();
    this.seconds = timer.second();
    this.phase = timer.phase();

    this.curr_network = network.network_prefix();
    this.user_address = user.address();
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

  toggle() {
    this.ms.setToggleMenu();
  }

  openModalPopup() {
    this.router.navigate(['/home']);
    this.ms.setPopUp();
  }

  openModalPopupW() {
    this.router.navigate(['/home']);
    this.ms.setPopUpW();
  }

  changefundPopup() {
    this.ms.setchangefundPopUp();
  }

  proposalPopup() {
    this.router.navigate(['/proposal']);
    this.ms.setProposalPopup();
  }

  nextPhase() {
    this.ms.setProposalChange();
  }

  redeemPopup() {
    this.ms.setredeemPopUp();
  }

  checkRouterURL(route) {
    return this.router.url === route;
  }

  updateErrorMsg() {
      error_notifications.check_dependency();
      this.errorMsg = error_notifications.get_error_msg();
  }

}
