import { Component, Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs/index';

import { } from 'jquery';
declare var $: any;

import { Betoken } from '../betokenjs/betoken-obj';
import { loadAllData } from '../betokenjs/data-controller';

@Injectable()

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  title = 'app';

  private open: boolean;
  active: boolean;

  private subject: Subject<boolean> = new Subject<boolean>();
  private popup: Subject<boolean> = new Subject<boolean>();
  private popupw: Subject<boolean> = new Subject<boolean>();
  private changefundphase: Subject<boolean> = new Subject<boolean>();
  private proposalphase: Subject<boolean> = new Subject<boolean>();
  private changeproposal: Subject<boolean> = new Subject<boolean>();
  private redeemphase: Subject<boolean> = new Subject<boolean>();

  private phasebtn1: Subject<boolean> = new Subject<boolean>();
  private tradebtn: Subject<boolean> = new Subject<boolean>();
  private nextbtn: Subject<boolean> = new Subject<boolean>();
  private redeembtn: Subject<boolean> = new Subject<boolean>();
  private newcyclebtn: Subject<boolean> = new Subject<boolean>();


  constructor() {
    const betoken = new Betoken();
    betoken.init().then(() => {
      const checkReady = setInterval(() => {
        if (betoken.isReady()) {
          loadAllData();
          clearInterval(checkReady);
        }
      }, 100);
    });
  }

  async start(errMessage) {
      alert(errMessage);
      location.reload();
      // do based on error messgae
  }

  setToggleMenu(): void {
    this.open = !this.open;
    this.active = !this.active;
    this.subject.next(this.open);
  }

  getToggleMenu(): Observable<any> {
    return this.subject.asObservable();
  }

  overlayhide() {
    this.open = false;
    this.active = false;
    this.subject.next(this.open);
  }

  setchangefundPopUp() {
    this.open = !this.open;
    this.changefundphase.next(this.open);
  }

  getchangefundPopUp(): Observable<any> {
    return this.changefundphase.asObservable();
  }

  setPopUp() {
    this.popup.next(true);
  }

  setPopUpW() {
    this.popupw.next(true);
  }

  getPopUpW(): Observable<any> {
    return this.popupw.asObservable();
  }

  getPopUp(): Observable<any> {
    return this.popup.asObservable();
  }

  setNextPhaseBtn() {
    this.phasebtn1.next(true);
  }

  getNextPhaseBtn() {
    return this.phasebtn1.asObservable();
  }

  setTradeBtn() {
    this.tradebtn.next(true);
  }

  getTradeBtn() {
    return this.tradebtn.asObservable();
  }

  setproposalPopUp() {
    this.open = !this.open;
    this.active = false;
    this.proposalphase.next(true);
  }

  getproposalPopUp(): Observable<any> {
    return this.proposalphase.asObservable();
  }

  setproposalchange() {
    this.open = !this.open;
    this.active = false;
    this.changeproposal.next(true);
  }

  getproposalchange() {
    return this.changeproposal.asObservable();
  }

  setNextButton() {
    this.nextbtn.next(true);
  }

  getNextButton() {
    return this.nextbtn.asObservable();
  }

  setRedeemButton() {
    this.redeembtn.next(true);
  }

  getRedeemButton() {
    return this.redeembtn.asObservable();
  }

  setredeemPopUp() {
    this.redeemphase.next(true);
  }

  getredeemPopUp() {
    return this.redeemphase.asObservable();
  }

  setnewcyclebtn() {
    this.newcyclebtn.next(true);
  }

  getnewcyclebtn() {
    return this.newcyclebtn.asObservable();
  }
}
