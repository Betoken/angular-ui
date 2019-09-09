ng build --prod --base-href=/portal-staging/
ng build --configuration=ja --base-href=/portal-staging/ja/
ng build --configuration=pt --base-href=/portal-staging/pt/

ng deploy --repo=git@github.com:Betoken/portal-staging.git --branch=master --no-build