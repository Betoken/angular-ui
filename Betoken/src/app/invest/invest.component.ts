import { Component, OnInit, } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { AppComponent } from '../app.component';
import { StockChart } from 'angular-highcharts';
import { NguCarousel, NguCarouselStore, NguCarouselService } from '@ngu/carousel';
import { Router } from '@angular/router';

import { } from 'jquery';
declare var $: any;
import { Betoken } from '../../assets/objects/betoken.js';
import {
  networkName,
  userAddress,
  displayedInvestmentBalance,
  displayedInvestmentUnit,
  displayedKairoBalance,
  displayedKairoUnit,
  expected_commission,
  sharesBalance,
  transact_box_events,
  decisions_tab_events,
  sidebar_heplers,
  stats_tab_helpers,kairoTotalSupply, sharesTotalSupply,
  countdown_timer_helpers, loadStats, decisions_tab_helpers, kairoRanking, managerROI, fundValue, totalFunds, ROIArray, ROI
} from '../../assets/body';

@Component({
    selector: 'app-invest',
    templateUrl: './invest.component.html',
    styleUrls: ['./invest.component.scss'],
    animations: [
        trigger('toggleMenu', [
            state('open', style({
                'right': '0'
            })),
            state('close', style({
                'right': '-100%'
            })),
            transition('open <=> close', animate('300ms ease-in-out')),
        ]),

    ]
})

export class InvestComponent implements OnInit {
    stock: StockChart;
    bar: StockChart;
    user_address = "0x0";
    share_balance = 0.0000;
    kairo_balance = 0.0000;
    monthly_pl = 0.00;
    inputShare = 0.00;
    calculated_balance = 0.00;
    selectedTokenSymbol = 'DAI';

    avgMonthReturn = 0;
    currMoROI = 0;
    totalUser = 0;
    AUM = 0;
    totalKairo = 0;
    totalBTFShares = 0;

    days = 0;
  hours = 0;
  minutes = 0;
  seconds = 0;
  investflow = false;
  withdrawflow = false;


    private carouselToken: string;
    public carouselBanner: NguCarousel;
    tokenList: any;
    rankingArray= [];
  

    openModalPopup() {
       this.ms.setPopUp();
    }
    openModalPopupW() {
        this.ms.setPopUpW();
     }

    walkthrough :boolean;
    step1: boolean;
    step2: boolean;
    step3: boolean;
    step4: boolean;
    investalert:boolean;
    footerbtn1:boolean;

    footerbtn2:boolean;
    changefundphase:boolean;
    changeStep1: boolean;
    changeStep2: boolean;
    changeStep3: boolean;
    changeStep4: boolean;
    changealert:boolean;

    footerbtn3:boolean;
    state: string;
    active: boolean;


    success: boolean;
    returnres : any;

    constructor(private ms: AppComponent, private carousel: NguCarouselService, private route: Router) {

        if (localStorage.getItem('walkthrough') == null) {
            this.walkthrough =true;
        }
        this.state = 'close';
        this.active = false;


        this.step1 = true;
        this.step2 = false;
        this.step3 = false;
        this.step4 = false;
        this.investalert = false;

        this.changealert =false;
        this.changefundphase=false;
        this.changeStep1 = true;
        this.changeStep2 = false;
        this.changeStep3 = false;
        this.changeStep4 = false;

        this.footerbtn1 = true;
        this.footerbtn2 = false;
        this.footerbtn3 = false;
        setInterval(()=>{
            if (userAddress.get() != "0x0"){
            this.rankingList();   
            // this.chartdata();
            }
        }, 1000);
        
    }   

    calculate_bal (event) {
         this.calculated_balance = event.target.value * 100.0000;
    }

    async updateDates() {
        this.days = countdown_timer_helpers.day();
        this.hours = countdown_timer_helpers.hour();
        this.minutes = countdown_timer_helpers.minute();
        this.seconds = countdown_timer_helpers.second();
      }

    ngOnInit() {

        //------------------------------------
      setInterval(() =>{
          if (userAddress.get() != "0x0"){
            // portfolio
            this.user_address = userAddress.get();
            this.share_balance = sharesBalance.get().div(1e18).toFormat(5);
            this.kairo_balance = displayedKairoBalance.get().toFormat(18);
            this.monthly_pl = managerROI.get().toFormat(5);

           //Betoken fund share price
           this.avgMonthReturn = stats_tab_helpers.avg_roi();
           this.currMoROI = fundValue.get().sub(totalFunds.get().div(1e18)).div(totalFunds.get().div(1e18)).mul(100).toFormat(4);
           this.AUM = fundValue.get().toFormat(2);
           this.totalKairo = kairoTotalSupply.get();
           this.totalBTFShares = sharesTotalSupply.get();
           this.updateDates();
        //    this.rankingList();
          }
     }, 1000 );     

         //---------------------------------------
         setInterval(() =>{
        this.stock = new StockChart({
            rangeSelector: {
                selected: 2,
                inputEnabled: false,
                buttonSpacing: 30,
                buttonTheme: {
                    fill: 'none',
                    stroke: 'none',
                    style: { color: '#8FA9B0' },
                    states: {
                        hover: {},
                        select: {
                            fill: 'none',
                            style: { color: '#00000', fontWeight: 'bold' }
                        }
                    }
                },

                buttons: [
                    {
                        count: 1,
                        type: 'month',
                        text: '1M'
                    },
                    {
                        count: 3,
                        type: 'month',
                        text: '3M'
                    },
                    {
                        count: 6,
                        type: 'month',
                        text: '6M'
                    },
                    {
                        count: 1,
                        type: 'year',
                        text: '1Y'
                    },
                    {
                        type: 'all',
                        text: 'MAX'
                    }],
            },
            plotOptions: {
                areaspline: {
                    lineColor: '#18DAA3',
                    lineWidth: 1,
                    fillColor: '#B9EEE1',
                },
            },
            title: {
                text: ''
            },
            scrollbar: {
                enabled: false
            },
            navigator: {
                enabled: false
            },
            yAxis: {
                opposite: false
            },
            series: [{
                name: 'Betoken-share-price',
                data: ROIArray,
                type: 'areaspline'
            }]
        });
    },10000);


        // this.bar = new StockChart({
        //     rangeSelector: {
        //         selected: 2,
        //         inputEnabled: false,
        //         buttonSpacing: 30,
        //         buttonTheme: {
        //             fill: 'none',
        //             stroke: 'none',
        //             style: { color: '#8FA9B0' },
        //             states: {
        //                 hover: {},
        //                 select: {
        //                     fill: 'none',
        //                     style: { color: '#00000', fontWeight: 'bold' }
        //                 }
        //             }
        //         },

        //         buttons: [{
        //             count: 1,
        //             type: 'month',
        //             text: '1M'
        //         },
        //         {
        //             count: 3,
        //             type: 'month',
        //             text: '3M'
        //         },
        //         {
        //             count: 6,
        //             type: 'month',
        //             text: '6M'
        //         },
        //         {
        //             count: 1,
        //             type: 'year',
        //             text: '1Y'
        //         },
        //         {
        //             type: 'all',
        //             text: 'MAX'
        //         }],
        //     },
        //     plotOptions: {
        //         column: {
        //             zones: [{
        //                 value: 0, // Values up to 0 (not including) ...
        //                 color: 'red' // ... have the color Red.
        //             }, {
        //                 color: '#18DAA3' // Values from 0 (including) and up have the color Green
        //             }]
        //         }
        //     },
        //     title: {
        //         text: ''
        //     },
        //     scrollbar: {
        //         enabled: false
        //     },
        //     navigator: {
        //         enabled: false
        //     },
        //     yAxis: {
        //         opposite: false
        //     },

        //     series: [{
        //         color: '#18DAA3',
        //         name: 'Betoken-profit',
        //         data: [[1469021400000, -26276000], [1469107800000, 32702000], [1469194200000, 28313700],
        //         [1469453400000, 40382900], [1469539800000, 56239800], [1469626200000, 92344800], [1469712600000, 39869800], [1469799000000, 27733700], [1470058200000, 38167900
        //         ], [1470144600000, 33816600], [1470231000000, 30202600], [1470317400000, -27408700], [1470403800000, -40553400], [
        //             1470663000000, 28037200], [1470749400000, -26315200], [1470835800000, 24008500], [1470922200000, 27484500], [1471008600000,
        //             18660400], [1471267800000, 25868200], [1471354200000, 33794400], [1471440600000, -25356000], [1471527000000, -21984700
        //         ], [1471613400000, 25368100], [1471872600000, -25820200], [1471959000000, -21257700], [1472045400000, -23675100], [
        //             1472131800000, 25086200], [1472218200000, -27766300], [1472477400000, 24970300], [1472563800000, 24863900], [1472650200000,
        //             29662400], [1472736600000, 26701500], [1472823000000, 26802500], [1473168600000, 26880400], [1473255000000, 42364300
        //         ], [1473341400000, 53002000], [1473427800000, -46557000], [1473687000000, -45292800], [1473773400000, 62176200], [
        //             1473859800000, -110888700], [1473946200000, 89983600], [1474032600000, -79886900], [1474291800000, -47023000], [1474378200000,
        //             34514300], [1474464600000, 36003200], [1474551000000, 31074000], [1474637400000, 52481200], [1474896600000, 29869400
        //         ], [1474983000000, 24607400], [1475069400000, -29641100], [1475155800000, -35887000], [1475242200000, 36379100], [
        //             1475501400000, 21701800], [1475587800000, 29736800], [1475674200000, -21453100], [1475760600000, 28779300], [1475847000000,
        //             24358400], [1476106200000, 36236000], [1476192600000, 64041000], [1476279000000, 37586800], [1476365400000, 35192400
        //         ], [1476451800000, 35652200], [1476711000000, 23624900], [1476797400000, -24553500], [1476883800000, 20034600], [
        //             1476970200000, -24125800], [1477056600000, 23192700], [1477315800000, -23538700], [1477402200000, 48129000], [1477488600000,
        //             66134200], [1477575000000, 34562000], [1477661400000, -37861700], [1477920600000, -26419400], [1478007000000, 43825800
        //         ], [1478093400000, -28331700], [1478179800000, -26932600], [1478266200000, 30837000], [1478529000000, -32560000], [
        //             1478615400000, -24054500], [1478701800000, -59176400], [1478788200000, 57134500], [1478874600000, 34094100], [1479133800000,
        //             51175500], [1479220200000, 32264500], [1479306600000, 58840500], [1479393000000, 27632000], [1479479400000, 28428900
        //         ], [1479738600000, 29264600], [1479825000000, 25965500], [1479911400000, 27426400], [1480084200000, 11475900], [
        //             1480343400000, 27194000], [1480429800000, 28528800], [1480516200000, 36162300], [1480602600000, 37086900], [1480689000000,
        //             26528000], [1480948200000, 34324500], [1481034600000, 26195500], [1481121000000, 29998700], [1481207400000, 27068300
        //         ], [1481293800000, 34402600], [1481553000000, 26374400], [1481639400000, 43733800], [1481725800000, 34031800], [
        //             1481812200000, 46524500], [1481898600000, 44351100], [1482157800000, 27779400], [1482244200000, 21425000], [1482330600000,
        //             23783200], [1482417000000, 26085900], [1482503400000, 14181200], [1482849000000, 18296900], [1482935400000, 20905900
        //         ], [1483021800000, 15039500], [1483108200000, 30586300], [1483453800000, 28781900], [1483540200000, 21118100], [
        //             1483626600000, 22193600], [1483713000000, 31751900], [1483972200000, 33561900], [1484058600000, 24462100], [1484145000000,
        //             27588600], [1484231400000, 27086200], [1484317800000, 26111900], [1484663400000, 34439800], [1484749800000, 23713000
        //         ], [1484836200000, 25597300], [1484922600000, 32597900], [1485181800000, 22050200], [1485268200000, 23211000], [
        //             1485354600000, 32377600], [1485441000000, 26337600], [1485527400000, 20562900], [1485786600000, 30377500], [1485873000000,
        //             49201000], [1485959400000, 111985000], [1486045800000, 33710400], [1486132200000, 24507300], [1486391400000, 26845900
        //         ], [1486477800000, 38183800], [1486564200000, 23004100], [1486650600000, 28349900], [1486737000000, 20065500], [
        //             1486996200000, 23035400], [1487082600000, 33226200], [1487169000000, 35623100], [1487255400000, 22584600], [1487341800000,
        //             22198200], [1487687400000, 24507200], [1487773800000, 20836900], [1487860200000, 20788200], [1487946600000, 21776600
        //         ], [1488205800000, 20257400], [1488292200000, 23482900], [1488378600000, 36414600], [1488465000000, 26211000], [
        //             1488551400000, 21108100], [1488810600000, 21750000], [1488897000000, 17446300], [1488983400000, 18707200], [1489069800000,
        //             22155900], [1489156200000, 19612800], [1489411800000, 17421700], [1489498200000, 15309100], [1489584600000, 25691800
        //         ], [1489671000000, 19232000], [1489757400000, 43885000], [1490016600000, 21542000], [1490103000000, 39529900], [
        //             1490189400000, 25860200], [1490275800000, 20346300], [1490362200000, 22395600], [1490621400000, 23575100], [1490707800000,
        //             33374800], [1490794200000, 29190000], [1490880600000, 21207300], [1490967000000, 19661700], [1491226200000, 19985700
        //         ], [1491312600000, 19891400], [1491399000000, 27717900], [1491485400000, 21149000], [1491571800000, 16672200], [
        //             1491831000000, 18933400], [1491917400000, 30379400], [1492003800000, 20350000], [1492090200000, 17822900], [1492435800000,
        //             16582100], [1492522200000, 14697500], [1492608600000, 17328400], [1492695000000, 23319600], [1492781400000, 17320900
        //         ], [1493040600000, 17134300], [1493127000000, 18871500], [1493213400000, 20041200], [1493299800000, 14246300], [
        //             1493386200000, 20860400], [1493645400000, 33602900], [1493731800000, 45352200], [1493818200000, 45697000], [1493904600000,
        //             23371900], [1493991000000, 27327700], [1494250200000, 48752400], [1494336600000, 39130400], [1494423000000, 25805700
        //         ], [1494509400000, 27255100], [1494595800000, 32527000], [1494855000000, 26009700], [1494941400000, 20048500], [
        //             1495027800000, 50767700], [1495114200000, 33568200], [1495200600000, 26960800], [1495459800000, 22966400], [1495546200000,
        //             19918900], [1495632600000, 19178000], [1495719000000, 19235600], [1495805400000, 21701100], [1496151000000, 20126900
        //         ], [1496237400000, 24451200], [1496323800000, 16404100], [1496410200000, 27770700], [1496669400000, 25331700], [
        //             1496755800000, 26624900], [1496842200000, 21069600], [1496928600000, 21250800], [1497015000000, 64882700], [1497274200000,
        //             72307300], [1497360600000, -34165400], [1497447000000, -31531200], [1497533400000, 32165400], [1497619800000, 50361100
        //         ], [1497879000000, 32541400], [1497965400000, 24900100], [1498051800000, 21265800], [1498138200000, 19106300], [
        //             1498224600000, 35439400], [1498483800000, -25692400], [1498570200000, 24761900], [1498656600000, 22082400], [1498743000000,
        //             31499400], [1498829400000, 23024100], [1499088600000, 14258300], [1499261400000, -21569600], [1499347800000, 24128800
        //         ], [1499434200000, 19201700], [1499693400000, 21090600], [1499779800000, 19781800], [1499866200000, 24884500], [
        //             1499952600000, -25199400], [1500039000000, -20132100], [1500298200000, 23793500], [1500384600000, 17868800], [1500471000000,
        //             20923000], [1500557400000, 17243700], [1500643800000, 26252600], [1500903000000, 21493200], [1500989400000, 18853900
        //         ], [1501075800000, 15781000], [1501162200000, -32476300]
        //         ],
        //         type: 'column'
        //     }
        //     ]
        // })


        this.carouselBanner = {
            grid: { xs: 1, sm: 1, md: 1, lg: 1, all: 0 },
            slide: 1,
            speed: 400,
            interval: 400000,
            point: {visible: true},
            load: 2,
            loop: true,
            touch: true
          };
        
        

        this.ms.getPopUp().subscribe((open: boolean) => {
           this.investflow = true;
           this.withdrawflow = false;
            if (open) {
                this.state = 'open';
                this.active = true;
            }

            if (!open) {
                this.state = 'close';
                this.active = false;
            }

        });

        this.ms.getPopUpW().subscribe((open: boolean) => {
            this.investflow = false;
            this.withdrawflow = true;
            if (open) {
                this.state = 'open';
                this.active = true;
            }

            if (!open) {
                this.state = 'close';
                this.active = false;
            }

        });

        this.ms.getchangefundPopUp().subscribe((open:boolean) => {
            if (open) {
                this.state = 'open';
                this.active = true;
                this.changefundphase = true;
                this.investalert = false;
                this.changeStep1 = true;
                this.changeStep2 = false;
                this.changeStep3 = false;
                this.changeStep4 = false;
            }

            if (!open) {
                this.state = 'close';
                this.active = false;
            }
        });

    }


     /* It will be triggered on every slide*/
     onmoveFn(data: NguCarouselStore) {
        console.log(data);
      }

     initDataFn(key: NguCarouselStore) {
        this.carouselToken = key.token;
      }

      resetFn() {
        this.carousel.reset(this.carouselToken);
      }
    
      shift() {
            for(let i=0; i <2 ;i++){
                this.carousel.moveToSlide(this.carouselToken, i, false);
            }       
      }

      dismiss(){
            this.walkthrough = false;
            localStorage.setItem('walkthrough', '1');
      }
    
    closePopup() {
        this.state = 'close';
        this.active = false;
        this.step1 = true;
        this.step2 = false;
        this.step3 = false;
        this.step4 = false;
        this.footerbtn1 = false;
        this.footerbtn2 = true;

        if(this.changefundphase == true){
            this.changeStep1 = true;
            this.changeStep2 = false;
            this.changeStep3 = false;
            this.changeStep4 = false;
            this.footerbtn2 = false;
            this.footerbtn3 = true;
        }
        
    }

    async withdraw() {
        transact_box_events.withdraw_button(this.calculated_balance/100, this.selectedTokenSymbol, (success)=>{
            console.log(JSON.stringify(success));
            this.step2 = true;
            this.step1 = false;
            this.step3 = false;
            this.step4 = false; 
        }, (error)=> {
          alert(error);
        });
    }

    async invest() {
         transact_box_events.deposit_button(this.calculated_balance, this.selectedTokenSymbol, (success)=>{
          console.log(JSON.stringify(success));
          this.step2 = true;
          this.step1 = false;
          this.step3 = false;
          this.step4 = false; 
        }, (error)=>{
           alert(error);
        });

        //expected comission 
        // alert(sidebar_heplers.expected_commission());

        //user Address
        //alert (sidebar_heplers.user_address());



        //user Kairo
        //alert (sidebar_heplers.user_kairo_balance());

        //create New investment
        decisions_tab_events.new_investment(this.selectedTokenSymbol, '0.01', (success)=>{
            console.log(JSON.stringify(success));
        }, (error)=> {
          alert(error);
        });

    }

    updateTokenSymbol(value) {
        this.selectedTokenSymbol = value;
    }

    confirm() {
        this.step3 = true;
        this.step1 = false;
        this.step2 = false;
        this.step4 = false;
        setTimeout(() => {
            this.step4 = true;
            this.investalert =true;
            this.step1 = false;
            this.step2 = false;
            this.step3 = false;
            this.ms.setNextPhaseBtn();
        }, 1000);
    }

    changefund() {
        this.changefundphase = true;
        this.investalert = false;
        this.openModalPopup();
        this.openModalPopupW();
    }

    changefundstep1() {
        this.changeStep2 = true;
        this.changeStep1 = false;
        this.changeStep3 = false;
        this.changeStep4 = false;
    }

    confirmcchangefund() {
        this.changeStep3 = true;
        this.changealert = true;
        this.changeStep1 = false;
        this.changeStep2 = false;
        this.changeStep4 = false;
        this.ms.setTradeBtn();
    }

    hidechangealert(){
        this.changealert=false;
    }

    makeInvestment(){
        this.openModalPopup();
        this.openModalPopupW();
        this.route.navigate(['/proposal']);
    }

    // async chartdata() {
    //     // let chart = await loadStats.get();
    //     //  console.log(chart);
    //     console.log(ROIArray, "HEYYYYYY");
    //     //console.log([[1,0], [11, 22]], "SUPPPP");
    //  }

    async tokensList(){
        this.tokenList = decisions_tab_helpers.tokens();
        console.log(this.tokenList);
      }
     
    copyToClipBoard(event) {
        // console.log(event);
        alert('copied  '  +event +  '  To ClipBoard');
      }
      
    rankingList() {
        this.rankingArray =  kairoRanking.get();
        this.totalUser = this.rankingArray.length;
        // console.log(this.rankingArray, this.rankingArray.length);
        
    }
      

    
}
