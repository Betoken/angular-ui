import { Component, OnInit } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { AppComponent } from '../app.component';

@Component({
  selector: 'app-redeem',
  templateUrl: './redeem.component.html',
  styleUrls: ['./redeem.component.scss'],
  animations: [
    trigger('toggleRedeem', [
        state('open', style({
            'right': '0'
        })),
        state('close', style({
            'right': '-100%'
        })),
        transition('open <=> close', animate('300ms ease-in-out')),
    ])
]
})
export class RedeemComponent implements OnInit {

  openredeemModal(){
    this.ms.setredeemPopUp();
  }

  
  state: string;
  active: boolean;

  redeemalert:boolean;
  newcyclealert:boolean;

  step1: boolean;
  step2: boolean;
  step3: boolean;
  step4: boolean;

  footerbtn1 :boolean;
  footerbtn2 :boolean;

  constructor(private ms :AppComponent) { 
    this.state = 'open';
    this.active = true;

    this.redeemalert = true;
    this.newcyclealert = false;

    this.footerbtn1 = true;
    this.footerbtn2 = false;

    this.step1=true;
    this.step2=false;
    this.step3=false;
    this.step4=false;
  }

  ngOnInit() {
     this.ms.getredeemPopUp().subscribe((open: boolean) => {
      
      if (open) {
          this.state = 'open';
          this.active = true;
      }

      if (!open) {
          this.state = 'close';
          this.active = false;
      }
  });
  }

redeem(){
    this.step2=true;
    this.step3=false;
    this.step4=false;
    this.step1=false;
  }
  
 confirmredeem(){
  this.step3=true;
  this.step4=false;
  this.step1=false;
  this.step2=false;
  setTimeout(()=>{
    this.step4=true;
    this.step1=false;
    this.step2=false;
    this.step3=false;
    this.redeemalert = false;
    this.newcyclealert = true;
    this.ms.setnewcyclebtn();
    this.footerbtn2 = true;
  },1000);
 }

 closePopup(){
  this.state = 'close';
  this.active = false;
  this.step1=true;
  this.step2=false;
  this.step3=false;
  this.step4=false;
 }

 hidealert(){
  this.redeemalert = false;
  this.newcyclealert = true;
}

redeemPopup(){
    this.openredeemModal();
}
 
}
