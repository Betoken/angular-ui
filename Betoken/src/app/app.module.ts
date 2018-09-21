import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { CollapseModule } from 'ngx-bootstrap/collapse';
import { AccordionModule } from 'ngx-bootstrap';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import { RouterModule, Routes } from '@angular/router';
import {HashLocationStrategy, LocationStrategy} from '@angular/common';
import { NguCarouselModule } from '@ngu/carousel';

import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';
import { SideNavComponent } from './side-nav/side-nav.component';
import { InvestComponent } from './invest/invest.component';
import { ChartModule, HIGHCHARTS_MODULES } from 'angular-highcharts';
import stock from 'highcharts/modules/stock.src';
import more from 'highcharts/highcharts-more.src';
import { ProposalComponent } from './proposal/proposal.component';
import { RedeemComponent } from './redeem/redeem.component';
import { AccountComponent } from './account/account.component';
 
export function highchartsModules() {
  // apply Highcharts Modules to this array
  return [stock, more];
}

const routes: Routes = [
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full'
},
  {
    path: 'home',
    component: InvestComponent,
    pathMatch: 'full'
},
{
  path: 'proposal',
  component: ProposalComponent,
  pathMatch: 'full'
},
{
  path: 'redeem',
  component: RedeemComponent,
  pathMatch: 'full'
},
{
  path: 'account',
  component: AccountComponent,
  pathMatch: 'full'
}

];

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    SideNavComponent,
    InvestComponent,
    ProposalComponent,
    RedeemComponent,
    AccountComponent,
  ],
  imports: [
     NguCarouselModule,
     AccordionModule.forRoot(),
     BrowserModule,
     CollapseModule.forRoot(),
     BrowserAnimationsModule,
     RouterModule.forRoot(routes),
     ChartModule
  ],
  providers: [{ provide: LocationStrategy, useClass: HashLocationStrategy},
    {provide: HIGHCHARTS_MODULES, useFactory: highchartsModules}],
  bootstrap: [AppComponent]
})
export class AppModule { }
