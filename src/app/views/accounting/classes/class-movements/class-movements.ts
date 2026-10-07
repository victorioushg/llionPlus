import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  GridComponent,
  SearchSettingsModel,
  SortSettingsModel,
} from '@syncfusion/ej2-angular-grids';
import { ClickEventArgs } from '@syncfusion/ej2-angular-navigations';
import {
  BehaviorSubject,
  Observable,
  Subject,
  combineLatest,
  fromEvent,
  map,
  startWith,
  takeUntil,
} from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { withToolbarTitle, GridToolbarItem } from '@shared/utils/grid-toolbar';
import { applyGridHeightAboveFooter } from '@shared/utils/layout';
import { ClassesService } from '../classes.service';
import { IAccountMovement } from '@views/accounting/accounts/account';

@Component({
  selector: 'llion-class-movements',
  templateUrl: './class-movements.html',
  styleUrls: ['./class-movements.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ClassMovementsComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('movementsgrid') grid?: GridComponent;

  movements$!: Observable<IAccountMovement[]>;
  toolbar: GridToolbarItem[] = withToolbarTitle(['Search'], 'Movimientos');
  searchSettings: SearchSettingsModel = { operator: 'contains' };
  sortSettings: SortSettingsModel = {
    columns: [{ field: 'movementDate', direction: 'Descending' }],
  };
  screenHeight = 320;
  gridEnabled = false;

  private selectedClassId = 0;
  private readonly searchStringSubject = new BehaviorSubject<string>('');
  private readonly destroy$ = new Subject<void>();

  constructor(
    private classesService: ClassesService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.classesService.classContextIdAction$
      .pipe(takeUntil(this.destroy$))
      .subscribe((classId) => {
        this.selectedClassId = classId ?? 0;
        this.applyEnabledState(this.selectedClassId > 0);
        this.cdr.markForCheck();
      });

    this.movements$ = combineLatest([
      this.classesService.classMovements$,
      this.searchStringSubject.asObservable().pipe(startWith('')),
    ]).pipe(
      map(([movements, searchStr]) => {
        const needle = (searchStr || '').toLocaleLowerCase().trim();
        if (!needle) {
          return movements;
        }
        return movements.filter((m) => {
          const hay = [
            m.journalDescription,
            m.reference,
            m.movementDescription,
            m.movementTypeLabel,
            m.amount?.toString(),
            m.fiscalPeriod?.toString(),
          ]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase();
          return hay.includes(needle);
        });
      })
    );

    fromEvent(window, 'resize')
      .pipe(debounceTime(100), takeUntil(this.destroy$))
      .subscribe(() => this.updateGridHeight());
  }

  ngAfterViewInit(): void {
    this.applyEnabledState(this.selectedClassId > 0);
    this.updateGridHeight();
    setTimeout(() => this.updateGridHeight(), 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onToolbarClick(args: ClickEventArgs): void {
    if (
      args.item?.id === 'gridToolbarTitle' ||
      args.item?.cssClass === 'e-grid-toolbar-title'
    ) {
      args.cancel = true;
      return;
    }

    const target = args.originalEvent?.target as HTMLElement | undefined;
    const targetId =
      !target || target.id === ''
        ? target?.closest('button')?.id
        : target.id.split('_').pop();

    if (targetId === 'searchbutton') {
      this.search();
      args.cancel = true;
    } else if (targetId === 'clearbutton') {
      this.search(true);
      args.cancel = true;
    }
  }

  private applyEnabledState(enabled: boolean): void {
    this.gridEnabled = enabled;
    setTimeout(() => {
      if (!this.grid?.element) {
        return;
      }
      this.grid.element.classList.toggle('disablegrid', !enabled);
      this.cdr.markForCheck();
    });
  }

  private search(clear: boolean = false): void {
    if (!this.grid?.element?.id) {
      this.searchStringSubject.next('');
      return;
    }
    const searchString = document.getElementById(
      this.grid.element.id + '_searchbar'
    ) as HTMLInputElement | null;
    if (!searchString) {
      this.searchStringSubject.next('');
      return;
    }
    if (clear) {
      searchString.value = '';
    }
    this.searchStringSubject.next(searchString.value || '');
  }

  private updateGridHeight(): void {
    this.screenHeight = applyGridHeightAboveFooter(this.grid, 200, 240);
    this.cdr.markForCheck();
  }
}
