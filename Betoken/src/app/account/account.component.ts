import { Component, OnInit } from '@angular/core';
import {
    userAddress,
    transactionHistory,
    loadTxHistory,
    networkPrefix,
    copyToClipBoard,
    isLoadingRecords
} from '../../assets/body';


@Component({
    selector: 'app-account',
    templateUrl: './account.component.html',
    styleUrls: ['./account.component.scss']
})
export class AccountComponent implements OnInit {
    transactionTable: any;
    transactionNetwork: any;

    constructor() {
        setInterval(() => {
            if (userAddress.get() !== '0x0') {
                this.transactionsDetails();
            }
        }, 10000 );
    }

    ngOnInit() {
    }
    async transactionsDetails() {
        await loadTxHistory();
        this.transactionTable = transactionHistory.get();
        this.transactionNetwork = networkPrefix.get();
    }

    copy(event) {
        // console.log(event);
        console.log(event);
        alert('Copied  '  + event +  '  to clipBoard');
    }

    linkopen(values) {
        window.open(`https://` + this.transactionNetwork + `etherscan.io/tx/` + values + ``);
    }

    isLoading() {
        return isLoadingRecords.get();
    }
}
