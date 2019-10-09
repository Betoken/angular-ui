import { Component, OnInit } from '@angular/core';
import { AppComponent } from '../app.component';

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
