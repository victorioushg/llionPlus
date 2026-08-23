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
import { CustomerService } from '../customer.service';
import { ICustomerMovement } from '../customer';

@Component({
  selector: 'llion-customer-movements',
  templateUrl: './customer-movements.html',
  styleUrls: ['./customer-movements.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class CustomerMovementsComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('movementsgrid') grid?: GridComponent;

  movements$!: Observable<ICustomerMovement[]>;
  toolbar: GridToolbarItem[] = withToolbarTitle(['Search'], 'Movimientos');
  searchSettings: SearchSettingsModel = { operator: 'contains' };
  sortSettings: SortSettingsModel = {
    columns: [{ field: 'movementDate', direction: 'Descending' }],
  };
  screenHeight = 320;
  gridEnabled = false;

  private selectedCustomerId = 0;
  private readonly searchStringSubject = new BehaviorSubject<string>('');
  private readonly destroy$ = new Subject<void>();

  constructor(
    private customerService: CustomerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.customerService.customerContextIdAction$
      .pipe(takeUntil(this.destroy$))
      .subscribe((customerId) => {
        this.selectedCustomerId = customerId ?? 0;
        this.applyEnabledState(this.selectedCustomerId > 0);
        this.cdr.markForCheck();
      });

    this.movements$ = combineLatest([
      this.customerService.customerMovements$,
      this.searchStringSubject.asObservable().pipe(startWith('')),
    ]).pipe(
      map(([movements, searchStr]) => {
        const needle = (searchStr || '').toLocaleLowerCase().trim();
        if (!needle) {
          return movements;
        }
        return movements.filter((m) => {
          const hay = [
            m.documentNumber,
            m.movementType,
            m.concept,
            m.origin,
            m.originDocument,
            m.paymentMethod,
            m.reference,
            m.amount?.toString(),
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
    this.applyEnabledState(this.selectedCustomerId > 0);
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
