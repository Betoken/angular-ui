import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {AppComponent} from '../app.component';

import { } from 'jquery';
declare var $: any;
import {
  user, timer, network
} from '../../betokenjs/helpers';


@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  btn1: boolean;
  btn2: boolean;
  btn3: boolean;

  tradebtn: boolean;
  nextphasebtn: boolean;
  redeembtn: boolean;

  newcyclebtn: boolean;
  phase = -1;

  user_address = '0x0';
  share_balance = 0.0000;
  kairo_balance = 0.0000;
  monthly_pl = 0.00;
  expected_commission = 0.00;
  curr_network = '';

  constructor(private ms: AppComponent, private router: Router ) {
    this.btn1 = true;
    this.btn2 = false;
    this.btn3 = false;
    this.tradebtn = true;
    this.nextphasebtn = false;
    this.redeembtn = false;
    this.newcyclebtn = false;
  }

  ngOnInit() {
    setInterval(() => {
      if (user.address() !== '0x0') {
        // portfolio
        this.user_address = user.address();
        this.kairo_balance = user.kairo_balance().toFormat(4);
        this.monthly_pl = user.monthly_roi().toFormat(4);
        this.expected_commission = user.expected_commission().toFormat(18);
        this.curr_network = network.network_prefix();
      }
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

  async updateDates() {
    this.phase = timer.phase();
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
    this.ms.setproposalPopUp();
  }

  changeproposal() {
    this.ms.setproposalchange();
  }

  redeemPopup() {
    this.ms.setredeemPopUp();
  }

  checkRouterURL(route) {
    return this.router.url === route;
  }

}
