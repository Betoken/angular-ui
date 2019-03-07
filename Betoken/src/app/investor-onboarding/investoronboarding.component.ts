import { Component, OnInit } from '@angular/core';
import { AppComponent } from '../app.component';
import { Router } from '@angular/router';
import { isUndefined } from 'util';

import { } from 'jquery';
declare var $: any;

import {
    user, error_notifications, tokens, investor_actions
} from '../../betokenjs/helpers';

@Component({
    selector: 'app-account',
    templateUrl: './investoronboarding.component.html'
})
export class InvestoronboardingComponent implements OnInit {
    tokenList: any;
    user_address = '0x0';
    errorMsg = '';
    step = 0;
    checkboxes = [false, false, false];
    selectedTokenSymbol = '';
    transactionId = '';

    constructor(private ms: AppComponent, private router: Router) {
    }

    ngOnInit() {
        error_notifications.set_error_msg("");
        this.tokenList = tokens.token_list();
        setInterval(() => {
            this.updateErrorMsg();
            this.refreshDisplay();
        }, 100);
        $('[data-toggle="tooltip"]').tooltip();
        $('#modalInvestorOnboarding').on('hidden.bs.modal', () => {
            this.resetModals();
        });
    }

    refreshDisplay() {
        this.user_address = user.address();
        error_notifications.check_dependency();
        this.errorMsg = error_notifications.get_error_msg();
        this.ms.setHeaderSidebarDisplay(!this.checkRouterURL('/start'));
    }

    resetModals() {
        this.step = 0;
        this.selectedTokenSymbol = '';
        this.checkboxes = [false, false, false];
    }

    deposit() {
        var payAmount = $('#sharesAmountToBuy').val();
        let pending = (txHash) => {
            if (this.step == 3) {
                this.transactionId = txHash;
                this.step = 4;
            }
        };
        let confirm = () => {
            if (this.step == 4) {
                this.step = 5;
            }
        };
        switch (this.selectedTokenSymbol) {
            case 'ETH':
                investor_actions.depositETH(payAmount, pending, confirm);
                break;
            case 'DAI':
                investor_actions.depositDAI(payAmount, pending, confirm);
                break;
            default:
                investor_actions.depositToken(payAmount, this.selectedTokenSymbol, pending, confirm);
                break;
        }
    }

    filterList = (event, listID, searchID) => {
        let searchInput = event.target.value.toLowerCase();
        let entries = $(`#${listID} li`);
        for (let i = 1; i < entries.length; i++) { // skip first item (titles etc.)
            let entry = entries[i];
            let searchTarget = entry.children[searchID];
            if (searchTarget) {
                if (searchTarget.innerText.toLowerCase().indexOf(searchInput) > -1)
                entry.style.display = "";
                else
                entry.style.display = "none";
            }
        }
    }

    assetSymbolToPrice(symbol) {
        return tokens.asset_symbol_to_price(symbol);
    }

    getTokenName(token) {
        let result = tokens.asset_symbol_to_metadata(token);
        if (isUndefined(result)) {
            return '';
        }
        return result.name;
    }

    getTokenLogoUrl(token) {
        let result = tokens.asset_symbol_to_metadata(token);
        if (isUndefined(result)) {
            return '';
        }
        return result.logoUrl;
    }

    updateErrorMsg() {
        error_notifications.check_dependency();
        this.errorMsg = error_notifications.get_error_msg();
    }

    checkRouterURL(route) {
        return this.router.url === route;
    }

    agreementsChecked() {
        for (var checked of this.checkboxes) {
            if (!checked) {
                return false;
            }
        }
        return true;
    }
}
