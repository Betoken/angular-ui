import { Component, OnInit } from '@angular/core';
import { user, stats, loading, refresh_actions } from '../../betokenjs/helpers';

@Component({
  selector: 'app-rankings',
  templateUrl: './rankings.component.html',
  styleUrls: ['./rankings.component.scss']
})
export class RankingsComponent implements OnInit {
  rankingArray = [];
  userRanking = [];
  userValue: any;
  userAddress: any;

  constructor() {
  }

  ngOnInit() {
    setInterval(() => {
      if (user.address() !== '0x0') {
        this.refreshDisplay();
      }
    }, 100);
  }

  refreshDisplay() {
    this.rankingArray = stats.ranking();
    this.userRanking = user.rank();
    this.userValue = user.portfolio_value();
    this.userAddress = user.address();
  }

  refresh() {
    refresh_actions.ranking();
  }

  isLoading() {
    return loading.ranking();
  }
}
