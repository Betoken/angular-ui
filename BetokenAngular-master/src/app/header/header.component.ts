import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {AppComponent} from '../app.component';


@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  btn1: boolean;
  btn2: boolean;
  btn3: boolean;

  tradebtn : boolean;
  nextphasebtn : boolean;
  redeembtn : boolean;

  newcyclebtn :boolean;

  constructor(private ms: AppComponent, private router: Router ) {
    this.btn1 = true;
    this.btn2 = false;
    this.btn3 = false;
    this.tradebtn = true;
    this.nextphasebtn = false;
    this.redeembtn = false;
    this.newcyclebtn = false;
   }

  toggle() {
    this.ms.setToggleMenu();
  }

  openModalPopup(){
    this.ms.setPopUp();
  }

  changefundPopup(){
    this.ms.setchangefundPopUp();
  }
  
  proposalPopup(){
    this.ms.setproposalPopUp();
  }
  
  changeproposal(){
    this.ms.setproposalchange();
  }

  redeemPopup(){
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

    this.ms.getNextButton().subscribe((nextbutton: boolean) =>{
      if(nextbutton){
        this.nextphasebtn = true;
        this.tradebtn = false;
        this.redeembtn = false;
      }
    });

    this.ms.getRedeemButton().subscribe((redeembutton :boolean) =>{
      if(redeembutton){
        this.redeembtn = true;
        this.nextphasebtn = false;
        this.tradebtn = false;
      }
    });

    this.ms.getnewcyclebtn().subscribe((newcyclebutton :boolean) =>{
      if(newcyclebutton){
        this.newcyclebtn = true;
      }
    });
  }

}
