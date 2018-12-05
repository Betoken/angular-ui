import { Component, OnInit } from '@angular/core';
import { user, stats, loading, refresh_actions, error_notifications } from '../../betokenjs/helpers';
import BigNumber from 'bignumber.js';

@Component({
  selector: 'app-rankings',
  templateUrl: './rankings.component.html',
  styleUrls: ['./rankings.component.scss']
})
export class RankingsComponent implements OnInit {
  rankingArray = [];
  userRanking = [];
  userValue: any;
  userAddress: String;
  userROI: any;
  errorMsg = "";

  constructor() {
  }

  ngOnInit() {
    error_notifications.set_error_msg("");
    setInterval(() => {
      this.refreshDisplay();
      setTimeout(() => {
        this.updateErrorMsg();
      }, 2000);
    }, 100);
  }

  refreshDisplay() {
    this.rankingArray = stats.ranking();
    this.userRanking = user.rank();
    this.userValue = user.portfolio_value().toFormat(10);
    this.userAddress = user.address();
    this.userROI = user.monthly_roi().toFormat(4);
  }

  refresh() {
    refresh_actions.ranking();
  }

  isLoading() {
    return loading.ranking();
  }

  updateErrorMsg() {
    error_notifications.check_dependency();
    this.errorMsg = error_notifications.get_error_msg();
  }
}
