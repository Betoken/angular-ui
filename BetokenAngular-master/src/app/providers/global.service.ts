import { Observable } from 'rxjs/Rx';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, catchError, timeout } from 'rxjs/operators';


@Injectable({
  providedIn: 'root'
})
export class GlobalService {

  constructor(private http: HttpClient) { }

  // getServerTime(data): Observable<any> {
  //   return this.http.post(`chups\RstCtl`, data)
  //   .pipe(map(res => res), timeout(globalTimeOut), catchError(this.handleError));
  //  }
}
