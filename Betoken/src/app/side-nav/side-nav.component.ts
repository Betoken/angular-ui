
import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { AppComponent } from '../app.component';
import { user, timer } from '../../betokenjs/helpers';
@Component({
  selector: 'app-side-nav',
  templateUrl: './side-nav.component.html',
  animations: [
    trigger('toggleMenu', [
      state('open', style({
        'left': '0',
      })),
      state('close', style({
        'left': '-100%',
      })),
      transition('open <=> close', animate('300ms ease-in-out')),
    ])
  ]

})
export class SideNavComponent implements OnInit {

  state: any;
  notification: boolean;

  days = 0;
  hours = 0;
  minutes = 0;
  seconds = 0;
  phase = -1;

  constructor(private ms: AppComponent , private router: Router) {

    if (window.innerWidth >= 992) {
      this.state = 'open';
    } else {
      this.state = 'close';
    }

    this.notification = false;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    if (event.target.innerWidth >= 992) {
      this.state = 'open';
    } else {
      this.state = 'close';
    }
  }

  ngOnInit() {
    setInterval(() => {
      this.refreshDisplay();
    }, 1000 );

    this.ms.getToggleMenu().subscribe((open: boolean) => {

      if (open) {
        this.state = 'open';
      }

      if (!open) {
        this.state = 'close';
      }

    });

  }


  closePopup() {
    this.notification = false;
  }


  navigate(page) {
    this.notification = false;
    this.router.navigateByUrl(page);
  }

  refreshDisplay() {
    this.days = timer.day();
    this.hours = timer.hour();
    this.minutes = timer.minute();
    this.seconds = timer.second();
    this.phase = timer.phase();
    //  this.phase -=1;
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
