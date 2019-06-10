import {Component, OnInit} from '@angular/core';
import { AppComponent } from '../app.component';
import { user, timer, manager_actions, loading, tokens, refresh_actions} from '../../betokenjs/helpers';
import BigNumber from 'bignumber.js';
import { isUndefined } from 'util';

declare var $ :any;

@Component({
    selector: 'app-proposal',
    templateUrl: './upgrade.component.html'
})

export class UpgradeComponent implements OnInit {

    constructor(private ms: AppComponent) {
    }

    ngOnInit() {
    }
}
