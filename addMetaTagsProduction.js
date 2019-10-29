const fs = require('fs');
let locales = require('./src/locale/locales.json');
let defaultLocale = 'en-US';

for (let locale of locales) {
  let filePath;
  if (locale === defaultLocale) {
    filePath = `./dist/Betoken/index.html`;
  } else {
    filePath = `./dist/Betoken/${locale}/index.html`;
  }
  let fileData = fs.readFileSync(filePath, 'utf-8');
  let headIdx = fileData.indexOf('<head>') + 6;
  let tag = '\n  <meta name="fortmatic-site-verification" content="vkeS0rf93GzMCSPu" /> \n';
  fileData = fileData.slice(0, headIdx) + tag + fileData.slice(headIdx);

  fs.writeFileSync(filePath, fileData, 'utf-8');
}