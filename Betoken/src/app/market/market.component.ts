import { Component, OnInit } from '@angular/core';
import { user, stats, loading, refresh_actions } from '../../betokenjs/helpers';
import BigNumber from 'bignumber.js';

@Component({
  selector: 'app-market',
  templateUrl: './market.component.html',
  styleUrls: ['./market.component.scss']
})
export class MarketComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
