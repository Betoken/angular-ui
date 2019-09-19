import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AppComponent } from '../app.component';

import { } from 'jquery';
declare var $: any;;
import {
  user, timer, error_notifications, manager_actions, refresh_actions
} from '../../betokenjs/helpers';

import { ApolloEnabled } from '../apollo';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html'
})

export class HeaderComponent extends ApolloEnabled implements OnInit {
  ZERO_ADDR = '0x0000000000000000000000000000000000000000';

  days: Number;
  hours: Number;
  minutes: Number;
  seconds: Number;
  phase: Number;

  user_address: String;

  errorMsg: String;

  /* To copy Text from Textbox */
  copyInputMessage(inputElement) {
    inputElement.select();
    document.execCommand('copy');
    inputElement.setSelectionRange(0, 0);
  }

  constructor(private ms: AppComponent, private router: Router, private apollo: Apollo) {
    super();

    this.days = 0;
    this.hours = 0;
    this.minutes = 0;
    this.seconds = 0;
    this.phase = -1;

    this.user_address = this.ZERO_ADDR;

    this.errorMsg = '';
  }

  ngOnInit() {
    this.refreshHeaderSidebarDisplay();
    error_notifications.set_error_msg("");
    this.refreshDisplay();
    setInterval(() => this.updateTimer(), 1000);
    setInterval(() => this.refreshHeaderSidebarDisplay(), 1000);
  }

  updateTimer() {
    this.days = timer.day();
    this.hours = timer.hour();
    this.minutes = timer.minute();
    this.seconds = timer.second();
  }

  refreshDisplay() {
    this.user_address = user.address();

    error_notifications.check_dependency();
    this.errorMsg = error_notifications.get_error_msg();

    this.phase = timer.phase();
  }

  refreshHeaderSidebarDisplay() {
    this.ms.setHeaderSidebarDisplay(!this.checkRouterURL('/start') && !this.checkRouterURL('/start-managing'));
  }

  checkRouterURL(route) {
    return this.router.url === route;
  }

  nextPhase() {
    manager_actions.nextPhase();
  }

  async reloadAll() {
    await refresh_actions.reload_all();
    this.refreshDisplay();
  }
}
