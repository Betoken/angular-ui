import { Component, OnInit } from '@angular/core';
import {
  userAddress, countdown_timer_helpers, displayedKairoBalance, decisions_tab_events, assetSymbolToPrice,
  decisions_tab_helpers, ranking_tab, kairoRanking, user_rank
} from '../../assets/body';

@Component({
  selector: 'app-rankings',
  templateUrl: './rankings.component.html',
  styleUrls: ['./rankings.component.scss']
})
export class RankingsComponent implements OnInit {
  rankingArray= [];
  userRanking =[];
  userValue: any;
  userAddress: any;

  constructor() { 
    setInterval(()=>{
      if (userAddress.get() != "0x0"){
      this.rankingList();   
      this.userRank();   }
       }, 1000);
  }

  ngOnInit() {
  }
  rankingList() {
this.rankingArray =  kairoRanking.get();
// console.log(this.rankingArray);
  }
  async userRank(){
    this.userRanking = await ranking_tab.user_rank();
    this.userValue = await ranking_tab.user_value();
    this.userAddress = await userAddress.get();
    // console.log(this.userRanking, this.userValue);
  }
}
