
import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { AppComponent } from '../app.component';
import {
  userAddress, countdown_timer_helpers
} from '../../assets/body';
@Component({
  selector: 'app-side-nav',
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.scss'],
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

    setInterval(() => {
      if (userAddress.get() !== '0x0') {
        this.updateDates();
      }
    }, 1000 );
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

  async updateDates() {
    this.days = countdown_timer_helpers.day();
    this.hours = countdown_timer_helpers.hour();
    this.minutes = countdown_timer_helpers.minute();
    this.seconds = countdown_timer_helpers.second();
    this.phase = countdown_timer_helpers.phase();
    //  this.phase -=1;
  }
}
