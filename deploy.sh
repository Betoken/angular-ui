ng build --prod --base-href=/portal/
ng build --configuration=ja --base-href=/portal/ja/
ng build --configuration=pt --base-href=/portal/pt/
ng build --configuration=zh-Hans --base-href=/portal/zh-Hans/

node addMetaTags.js

ng deploy --repo=git@github.com:Betoken/portal.git --branch=master --no-build