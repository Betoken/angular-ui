import { Component, Injectable, Inject } from '@angular/core';
import { Betoken } from '../betokenjs/betoken-obj';
import { loadAllData, loadDynamicData } from '../betokenjs/data-controller';
import { LOCALE_ID } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Injectable()

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {
  display_header_sidebar = true;
  is_loading = true;
  load_progress = 20;

  constructor(@Inject(LOCALE_ID) private locale: string, private meta: Meta, private title: Title) {
    const betoken = new Betoken();
    betoken.init().then(() => {
      this.load_progress = 50;
      return loadAllData(() => {
        this.load_progress += 10;
      });
    }).then(() => {
      this.load_progress = 100;
      setInterval(loadDynamicData, 120 * 1000); // refresh everything every 2 minutes
      this.is_loading = false;
    });

    let metaTags = require(`../locale/meta.${locale}.json`);
    this.meta.addTags(metaTags);

    let titleText = require(`../locale/title.${locale}.json`);
    this.title.setTitle(titleText);
  }

  loadProgressPercentage() {
    return `${this.load_progress}%`;
  }

  setHeaderSidebarDisplay(val) {
    this.display_header_sidebar = val;
  }
}
