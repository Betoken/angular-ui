import { Component, OnInit } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { AppComponent } from '../app.component';

@Component({
  selector: 'app-proposal',
  templateUrl: './proposal.component.html',
  styleUrls: ['./proposal.component.scss'],
  animations: [
    trigger('toggleProposal', [
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

export class ProposalComponent implements OnInit {

    openchangefundModal(){
      this.ms.setproposalPopUp();
    }

    state: string;
    active: boolean;
  
    proposalfund:boolean; 
    changeproposalfund:boolean;
    tradeproposalfund:boolean;

    step1: boolean;
    step2: boolean;
    step3: boolean;
    step4: boolean;
    
    sellStep1: boolean;
    sellStep2: boolean;
    sellStep3: boolean;
    sellStep4: boolean;
    
   
    

    changeStep1: boolean;
    changeStep2: boolean;
    changeStep3: boolean;
    changeStep4: boolean;

    sellalert:boolean;
    nextphasealert:boolean;
    redeemalert:boolean;
    
    footerbtn1:boolean;
    footerbtn2:boolean;
    footerbtn3:boolean;


    success: boolean;

  constructor(private ms: AppComponent) {
    this.state = 'open';
    this.active = true;

    this.step1 = true;
    this.step2 = false;
    this.step3 = false;
    
    this.sellalert = false;
    this.nextphasealert =false;
    this.redeemalert = false;

    this.proposalfund=true;
    this.changeproposalfund=false;
    this.tradeproposalfund=false;

    this.sellStep1 = true;
    this.sellStep2 = false;
    this.sellStep3 = false;
    this.sellStep4 = false;

    this.changeStep1 = true;
    this.changeStep2 = false;
    this.changeStep3 = false;
    this.changeStep4 = false;

    this.footerbtn1 = true;
    this.footerbtn2 = false;
    this.footerbtn3 = false;
   }

  ngOnInit() {
    this.ms.getproposalPopUp().subscribe((open: boolean) => {
      
      if (open) {
          this.state = 'open';
          this.active = true;
      }

      if (!open) {
          this.state = 'close';
          this.active = false;
      }
  });

    this.ms.getproposalchange().subscribe((open:boolean) =>{

      if (open) {
        this.changeproposal();
    }

    if (!open) {
        this.state = 'close';
        this.active = false;
    }
    });

  }

  proposalPopup(){
    this.ms.setproposalPopUp();
  }

  changeproposalPopup(){
    this.sellalert = false;
    this.changeproposal();
  }

  closePopup(){
    this.state = 'close';
    this.active = false;
    if(this.proposalfund=true){
      this.proposalfund=true;
      this.tradeproposalfund=false;
      this.changeproposalfund=false;
      this.step1 = true;
      this.step2 = false;
      this.step3 = false;
      this.step4 = false;
    }else if(this.tradeproposalfund=true){
      this.tradeproposalfund=true;
      this.proposalfund=false;
      this.changeproposalfund=false;
      this.sellStep1 = true;
      this.sellStep2 = false;
      this.sellStep3 = false;
      this.sellStep4 = false;
    }else if(this.changeproposalfund=true){
      this.changeproposalfund=true;
      this.proposalfund=false;
      this.tradeproposalfund=false;
      this.changeStep1 = true;
      this.changeStep2 = false;
      this.changeStep3 = false;
      this.changeStep4 = false;
    }
    
  }

  support(){
    this.step2 = true;
    this.step3 = false;
    this.step4 = false;
    this.step1 = false;
  }

  confirm(){
    this.step3 = true;
    this.step4 = false;
    this.step1 = false;
    this.step2 = false; 
    setTimeout(() => {
      this.step4 = true;
      this.step1 = false;
      this.step2 = false;
      this.step3 = false;
  }, 1000);
  }

  newsupport(){
    this.closePopup();
  }

  hidealert(){
    this.sellalert = false;
    this.nextphasealert = true;
    this.ms.setNextButton();
  }

  sell(){
    this.openchangefundModal();
    this.tradeproposalfund=true;
    this.changeproposalfund=false; 
    this.proposalfund = false;
    this.redeemalert = false;
    this.nextphasealert = false;
    this.sellStep1=true; 
    this.sellStep2=false;
    this.sellStep3=false;
    this.sellStep4=false;
  }

  confirmsell(){
    this.sellStep2 = true;
    this.sellStep3 = false;
    this.sellStep1 = false;
    setTimeout(() => {
      this.sellStep3 = true;
      this.sellalert = true;
      this.footerbtn2 = true;
      this.footerbtn3 = false;
      this.footerbtn1 = false;
      this.sellStep1 = false;
      this.sellStep2 = false;
      this.ms.setNextButton();
  }, 1000);
  }

  changeproposal(){
    this.openchangefundModal();
    this.changeproposalfund=true; 
    this.tradeproposalfund=false;
    this.proposalfund = false;
    this.changeStep1 = true;
    this.changeStep2 = false;
    this.changeStep3 = false;
    this.nextphasealert = false;
  }

  changefundstep1(){
    this.changeStep2 = true;
    this.changeStep3 = false;
    this.changeStep1 = false;
  }

  confirmcchangefund(){
    this.changeStep3 = true;
    this.changeStep1 = false;
    this.changeStep2 = false;
    this.footerbtn3 = true;
    this.footerbtn1 = false;
    this.footerbtn2 = false;
  }

  finalchangefund(){
    this.closePopup();
    this.redeemalert= true;
    this.ms.setRedeemButton();
  }

}
