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

  let metaTags = require(`./src/locale/meta.${locale}.json`);
  for (let tagData of metaTags) {
    let tag = '\n<meta ';
    let keys = Object.keys(tagData);
    for (let key of keys) {
      tag += `${key}="${tagData[key]}" `;
    }
    tag += '/>\n';

    fileData = fileData.slice(0, headIdx) + tag + fileData.slice(headIdx);
  }

  let titleText = require(`./src/locale/title.${locale}.json`);
  fileData = fileData.slice(0, headIdx) + `\n<title>${titleText}</title>` + fileData.slice(headIdx);

  fs.writeFileSync(filePath, fileData, 'utf-8');
}