import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AppComponent } from '../app.component';
import { user, timer } from '../../betokenjs/helpers';

@Component({
    selector: 'app-side-nav',
    templateUrl: './side-nav.component.html'
})

export class SideNavComponent implements OnInit {
    phase: Number;
    can_redeem_commission = true;

    constructor(private ms: AppComponent , private router: Router) {
    }

    ngOnInit() {
        setInterval(() => {
          this.refreshDisplay();
        }, 100);
    }

    refreshDisplay() {
        this.days = timer.day();
        this.hours = timer.hour();
        this.minutes = timer.minute();
        this.seconds = timer.second();
        this.phase = timer.phase();

        this.can_redeem_commission = user.can_redeem_commission();
    }

    phaseActionText() {
      switch (this.phase) {
        case 0:
          return 'until managing begins';
        case 1:
          return 'to manage';
        case 2:
          return 'to redeem commission';
      }
    }
    checkRouterURL(route) {
        return this.router.url === route;
    }
}
