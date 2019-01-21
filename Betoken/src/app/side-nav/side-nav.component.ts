
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AppComponent } from '../app.component';
import { timer } from '../../betokenjs/helpers';

@Component({
  selector: 'app-side-nav',
  templateUrl: './side-nav.component.html'
})

export class SideNavComponent implements OnInit {
  phase: Number;

  constructor(private ms: AppComponent , private router: Router) {
  }

  ngOnInit() {
    setInterval(() => {
      this.refreshDisplay();
    }, 100);
  }

  refreshDisplay() {
    this.phase = timer.phase();
  }

  checkRouterURL(route) {
    return this.router.url === route;
  }
}
