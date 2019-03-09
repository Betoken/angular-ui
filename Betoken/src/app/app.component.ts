import { Component, Injectable } from '@angular/core';
import { Betoken } from '../betokenjs/betoken-obj';
import { loadAllData, loadDynamicData } from '../betokenjs/data-controller';

@Injectable()

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {
  title = 'Betoken';
  display_header_sidebar = true;
  is_loading = true;

  constructor() {
    const betoken = new Betoken();
    setTimeout(() => this.is_loading = false, 12 * 1000);
    betoken.init().then(loadAllData).then(() => {
      setInterval(loadDynamicData, 120 * 1000); // refresh everything every 2 minutes
      this.is_loading = false;
    });
  }

  setHeaderSidebarDisplay(val) {
    this.display_header_sidebar = val;
  }
}
