import { Injectable, PipeTransform } from '@angular/core';
import {
  BehaviorSubject,
  debounceTime,
  delay,
  from,
  Observable,
  of,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { SupabaseService } from './supabase.service';
import { SortColumn, SortDirection } from '../directives/sortable.directive';
import { DecimalPipe } from '@angular/common';
import { NgbDateParserFormatter, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { Bet } from '../models/bet.model';
import { AppState } from '../store/app.state';
import { Store } from '@ngrx/store';
import { ContentObserver } from '@angular/cdk/observers';

interface SearchResult {
  bets: Bet[];
  total: number;
}

interface State {
  page: number;
  pageSize: number;
  bookmaker: string;
  date: NgbDateStruct | null;
  result: string;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
}

const compare = (
  v1: string | number | Date | undefined,
  v2: string | number | Date | undefined
) => {
  if (v1 === undefined && v2 === undefined) {
    return 0;
  }
  if (v1 === undefined) {
    return 1;
  }
  if (v2 === undefined) {
    return -1;
  }
  return v1 < v2 ? -1 : v1 > v2 ? 1 : 0;
};

function sort(
  bets: Bet[],
  column: SortColumn,
  direction: string
): Bet[] {
  if (direction === '' || column === '') {
    return bets;
  } else {
    return [...bets].sort((a, b) => {
      const res = compare(a[column], b[column]);
      return direction === 'asc' ? res : -res;
    });
  }
}

function filterBookmaker(result: Bet, term: string) {
	return result.bookmaker.toLowerCase().includes(term.toLowerCase());
}

function filterDate(result: Bet, term: string) {
  return result.date!.toLowerCase().includes(term.toLowerCase());
}

function filteResult(result: Bet, term: string) {
  return result.result.toLowerCase().includes(term.toLowerCase());
}

@Injectable({
  providedIn: 'root',
})
export class DashboardTableService {
  private _loading$ = new BehaviorSubject<boolean>(true);
  private _search$ = new Subject<void>();
  private _bets$ = new BehaviorSubject<Bet[]>([]);
  private _total$ = new BehaviorSubject<number>(0);

  private _cachedBets: Bet[] = [];
  private _state: State = {
    page: 1,
    pageSize: 10,
    bookmaker: '',
    date: null,
    result: '',
    sortColumn: '',
    sortDirection: '',
  };

  constructor(private pipe: DecimalPipe, private store: Store<AppState>, private ngbDateParserFormatter: NgbDateParserFormatter) {
    this._search$
      .pipe(
        tap(() => this.addLoader()),
        debounceTime(200),
        switchMap(() => this._search()),
        delay(200),
        tap(() => this.removeLoader())
      )
      .subscribe((result: SearchResult) => {
        this._bets$.next(result.bets);
        this._total$.next(result.total);
      });
  }

  get bets$() {
    return this._bets$.asObservable();
  }
  get total$() {
    return this._total$.asObservable();
  }
  get loading$() {
    return this._loading$.asObservable();
  }
  get page() {
    return this._state.page;
  }
  get pageSize() {
    return this._state.pageSize;
  }
  get bookmaker() {
    return this._state.bookmaker;
  }
  get date() {
    return this._state.date;
  }
  get result() {
    return this._state.result;
  }

  set page(page: number) {
    this._set({ page });
  }
  set pageSize(pageSize: number) {
    this._set({ pageSize });
  }
  set bookmaker(bookmaker: string) {
    this._set({ bookmaker });
  }
  set date(date: NgbDateStruct | null) {
    this._set({ date });
  }
  set result(result: string) {
    this._set({ result });
  }
  set sortColumn(sortColumn: SortColumn) {
    this._set({ sortColumn });
  }
  set sortDirection(sortDirection: SortDirection) {
    this._set({ sortDirection });
  }

  private _set(patch: Partial<State>) {
    Object.assign(this._state, patch);
    this._search$.next();
  }

  private _search(): Observable<SearchResult> {

    // Se i dati sono già in cache, non fare la chiamata a Supabase
    // if (this._cachedBets) {
    //   return this._applyFiltersAndSorting(this._cachedBets);
    // }

    // return this.supabase.userInfo$.pipe(
    //   switchMap((response) => {
    //     return this._applyFiltersAndSorting(response.bets);
    //   })
    // );

    return this._applyFiltersAndSorting(this._cachedBets);
    // Se non ci sono dati in cache, fai la chiamata API a Supabase
    // return from(this.supabase.getBets()).pipe(
    //   switchMap((response) => {
    //     // Salva i dati in cache
    //     this._cachedBets = response;

    //     // Applica i filtri, l'ordinamento e la paginazione
    //     return this._applyFiltersAndSorting(this._cachedBets);
    //   })
    // );
  }

  private _applyFiltersAndSorting(bets: Bet[]): Observable<SearchResult> {
    const { sortColumn, sortDirection, pageSize, page, bookmaker, date, result } = this._state;

    // 1. sort updated_at
    let filteredBets = [...bets].sort((a, b) => {
      if ((a.updated_at === null || a.updated_at === undefined) && (b.updated_at === null || b.updated_at === undefined)) {
        return 0;
      }
      if (b.updated_at === null || b.updated_at === undefined) {
        return 1;
      }
      if (a.updated_at === null || a.updated_at === undefined) {
        return -1;
      }
      return b.updated_at < a.updated_at ? -1 : b.updated_at > a.updated_at ? 1 : 0;
    });

    // 2. sort
    filteredBets = sort(filteredBets, sortColumn, sortDirection);

    // 3. filter
    const dateFormatted = this.ngbDateParserFormatter.format(date);
    filteredBets = filteredBets.filter(
      (r) => filterBookmaker(r, bookmaker) && filterDate(r, dateFormatted) && filteResult(r, result)
    );

    const total = filteredBets.length;

    // 3. paginate
    filteredBets = filteredBets.slice(
      (page - 1) * pageSize,
      (page - 1) * pageSize + pageSize
    );

    return of({ bets: filteredBets, total });
  }

  addLoader() {
    this._loading$.next(true);
  }

  removeLoader() {
    this._loading$.next(false);
  }

  initializeBets(bets: Bet[]) {
    this._cachedBets = bets;
    this._search$.next(); 
  }

  refreshData() {
    this._cachedBets = [];  // Invalida la cache
    this._search$.next();        // Forza una nuova ricerca (e quindi una nuova chiamata a Supabase)
  }
}
