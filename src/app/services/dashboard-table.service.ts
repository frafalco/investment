import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  debounceTime,
  delay,
  Observable,
  of,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { SortColumn, SortDirection } from '../directives/sortable.directive';
import { NgbDateParserFormatter, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { TableBet } from '../models/table-bet.model';

interface SearchResult {
  bets: TableBet[];
  total: number;
}

interface State {
  page: number;
  pageSize: number;
  event: string;
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
  bets: TableBet[],
  column: SortColumn,
  direction: string
): TableBet[] {
  if (direction === '' || column === '') {
    return bets;
  } else {
    return [...bets].sort((a, b) => {
      const res = compare(a[column], b[column]);
      return direction === 'asc' ? res : -res;
    });
  }
}

function filterEvent(result: TableBet, term: string) {
	return result.event.toLowerCase().includes(term.toLowerCase());
}

// function filterBookmaker(result: TableBet, term: string) {
// 	return result.bookmaker.toLowerCase().includes(term.toLowerCase());
// }

function filterDate(result: TableBet, term: string) {
  return result.date!.toLowerCase().includes(term.toLowerCase());
}

function filteResult(result: TableBet, term: string) {
  return result.result.toLowerCase().includes(term.toLowerCase());
}

@Injectable({
  providedIn: 'root',
})
export class DashboardTableService {
  private _loading$ = new BehaviorSubject<boolean>(true);
  private _search$ = new Subject<void>();
  private _bets$ = new BehaviorSubject<TableBet[]>([]);
  private _total$ = new BehaviorSubject<number>(0);

  private _cachedBets: TableBet[] = [];
  private _state: State = {
    page: 1,
    pageSize: 30,
    event: '',
    bookmaker: '',
    date: null,
    result: '',
    sortColumn: '',
    sortDirection: '',
  };

  constructor(private ngbDateParserFormatter: NgbDateParserFormatter) {
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
  get event() {
    return this._state.event;
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
  set event(event: string) {
    this._set({ event });
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
    return this._applyFiltersAndSorting(this._cachedBets);
  }

  private _applyFiltersAndSorting(bets: TableBet[]): Observable<SearchResult> {
    const { sortColumn, sortDirection, pageSize, page, event, bookmaker, date, result } = this._state;

    // 1. sort updated_at
    let filteredBets = [...bets].sort((a, b) => {
      if ((a.date === null || a.date === undefined) && (b.date === null || b.date === undefined)) {
        return 0;
      }
      if (a.date === null || a.date === undefined) {
        return 1;
      }
      if (b.date === null || b.date === undefined) {
        return -1;
      }
      if(a.date < b.date) {
        return -1;
      }
      if(a.date > b.date) {
        return 1;
      }
      if ((a.updated_at === null || a.updated_at === undefined) && (b.updated_at === null || b.updated_at === undefined)) {
        return 0;
      }
      if (a.updated_at === null || a.updated_at === undefined) {
        return 1;
      }
      if (b.updated_at === null || b.updated_at === undefined) {
        return -1;
      }
      return a.updated_at < b.updated_at ? -1 : a.updated_at > b.updated_at ? 1 : 0;
    });

    // 2. sort
    filteredBets = sort(filteredBets, sortColumn, sortDirection);

    // 3. filter
    const dateFormatted = this.ngbDateParserFormatter.format(date);
    filteredBets = filteredBets.filter(
      (r) => filterEvent(r, event) && filterDate(r, dateFormatted) && filteResult(r, result)
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

  initializeBets(bets: TableBet[]) {
    this._cachedBets = bets;
    this._search$.next(); 
  }

  refreshData() {
    this._cachedBets = [];  // Invalida la cache
    this._search$.next();        // Forza una nuova ricerca (e quindi una nuova chiamata a Supabase)
  }
}
