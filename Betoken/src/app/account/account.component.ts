import { Component, OnInit } from '@angular/core';
import {
  networkName,
  userAddress,
  transaction_history,
  transactionHistory,
  loadTxHistory,
  displayedInvestmentBalance,
  displayedInvestmentUnit,
  displayedKairoBalance,
  displayedKairoUnit,
  expected_commission,
  sharesBalance,
  transact_box_events,
  decisions_tab_events,
  sidebar_heplers,
  stats_tab_helpers,kairoTotalSupply, sharesTotalSupply,
  countdown_timer_helpers, loadStats, decisions_tab_helpers
} from '../../assets/body';


@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss']
})
export class AccountComponent implements OnInit {
  transactionTable: any;

  constructor() {

    setInterval(() =>{
      if (userAddress.get() != "0x0"){
        this.transactionsDetails();
      }
 }, 1000 );     
   }

  ngOnInit() {
  }
  transactionsDetails() {
    // let value = loadTxHistory.getDepositWithdrawHistory();
    // console.log(value);
    this.transactionTable = transactionHistory.get();
    console.log(this.transactionTable)
  }

  copyToClipBoard(event) {
    console.log(event);
    alert('copied  '  +event +  '  To ClipBoard');
  }
  
}
