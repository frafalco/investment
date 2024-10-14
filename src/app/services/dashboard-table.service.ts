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
import { Result, SupabaseService } from './supabase.service';
import { SortColumn, SortDirection } from '../directives/sortable.directive';
import { DecimalPipe } from '@angular/common';
import { NgbDateParserFormatter, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';

interface SearchResult {
  results: Result[];
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
  countries: Result[],
  column: SortColumn,
  direction: string
): Result[] {
  if (direction === '' || column === '') {
    return countries;
  } else {
    return [...countries].sort((a, b) => {
      const res = compare(a[column], b[column]);
      return direction === 'asc' ? res : -res;
    });
  }
}

function filterBookmaker(result: Result, term: string) {
	return result.bookmaker.toLowerCase().includes(term.toLowerCase());
}

function filterDate(result: Result, term: string) {
  return result.date.toLowerCase().includes(term.toLowerCase());
}

function filteResult(result: Result, term: string) {
  return result.result.toLowerCase().includes(term.toLowerCase());
}

@Injectable({
  providedIn: 'root',
})
export class DashboardTableService {
  private _loading$ = new BehaviorSubject<boolean>(true);
  private _search$ = new Subject<void>();
  private _results$ = new BehaviorSubject<Result[]>([]);
  private _total$ = new BehaviorSubject<number>(0);

  private _cachedResults: Result[] | null = null;
  private _state: State = {
    page: 1,
    pageSize: 10,
    bookmaker: '',
    date: null,
    result: '',
    sortColumn: '',
    sortDirection: '',
  };

  constructor(private pipe: DecimalPipe, private supabase: SupabaseService, private ngbDateParserFormatter: NgbDateParserFormatter) {
    this._search$
      .pipe(
        tap(() => this._loading$.next(true)),
        debounceTime(200),
        switchMap(() => this._search()),
        delay(200),
        tap(() => this._loading$.next(false))
      )
      .subscribe((result: SearchResult) => {
        this._results$.next(result.results);
        this._total$.next(result.total);
      });

    this._search$.next();
  }

  get results$() {
    return this._results$.asObservable();
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
    if (this._cachedResults) {
      return this._applyFiltersAndSorting(this._cachedResults);
    }

    // Se non ci sono dati in cache, fai la chiamata API a Supabase
    return from(this.supabase.getResults()).pipe(
      switchMap((response) => {
        // Salva i dati in cache
        this._cachedResults = response;

        // Applica i filtri, l'ordinamento e la paginazione
        return this._applyFiltersAndSorting(this._cachedResults);
      })
    );
  }

  private _applyFiltersAndSorting(results: Result[]): Observable<SearchResult> {
    const { sortColumn, sortDirection, pageSize, page, bookmaker, date, result } = this._state;

    // 1. sort
    let filteredResults = sort(results, sortColumn, sortDirection);

    // 2. filter
    const dateFormatted = this.ngbDateParserFormatter.format(date);
    filteredResults = filteredResults.filter(
      (r) => filterBookmaker(r, bookmaker) && filterDate(r, dateFormatted) && filteResult(r, result)
    );

    const total = filteredResults.length;

    // 3. paginate
    filteredResults = filteredResults.slice(
      (page - 1) * pageSize,
      (page - 1) * pageSize + pageSize
    );

    return of({ results: filteredResults, total });
  }

  refreshData() {
    this._cachedResults = null;  // Invalida la cache
    this._search$.next();        // Forza una nuova ricerca (e quindi una nuova chiamata a Supabase)
  }
}
