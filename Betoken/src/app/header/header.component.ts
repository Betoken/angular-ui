import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {AppComponent} from '../app.component';

import { } from 'jquery';
declare var $: any;
import {
  userAddress, countdown_timer_helpers
} from '../../assets/body';


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
  days = 0;
  hours = 0;
  minutes = 0;
  seconds = 0;
  phase = -1;

  constructor(private ms: AppComponent, private router: Router ) {
    this.btn1 = true;
    this.btn2 = false;
    this.btn3 = false;
    this.tradebtn = true;
    this.nextphasebtn = false;
    this.redeembtn = false;
    this.newcyclebtn = false;


   setInterval(() => {
    if (userAddress.get() !== '0x0') {
      this.updateDates();
    }
     }, 1000 );

  }

    async updateDates() {
      this.days = countdown_timer_helpers.day();
      this.hours = countdown_timer_helpers.hour();
      this.minutes = countdown_timer_helpers.minute();
      this.seconds = countdown_timer_helpers.second();
      this.phase = countdown_timer_helpers.phase();
      //  this.phase -=1;
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

  ngOnInit() {
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

}
