import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import {
  DialogEditEventArgs,
  EditSettingsModel,
  GridComponent,
  SaveEventArgs,
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
  take,
  takeUntil,
} from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { toastType } from '@shared/enums/enums';
import { ToastService } from '@shared/services/toastService';
import { withToolbarTitle, GridToolbarItem } from '@shared/utils/grid-toolbar';
import { applyGridHeightAboveFooter } from '@shared/utils/layout';
import { TreasuryService } from '../treasury.service';
import {
  ITreasuryMovement,
  TREASURY_BANK_MOVEMENT_TYPES,
  TREASURY_CASH_MOVEMENT_TYPES,
  TREASURY_TYPE_CASHBOX,
} from '../treasury';

@Component({
  selector: 'llion-treasury-movements',
  templateUrl: './treasury-movements.html',
  styleUrls: ['./treasury-movements.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class TreasuryMovementsComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('movementsgrid') grid?: GridComponent;
  @ViewChild('movementForm') movementForm?: NgForm;

  movements$!: Observable<ITreasuryMovement[]>;
  toolbar: GridToolbarItem[] = withToolbarTitle(['Search'], 'Movimientos');
  searchSettings: SearchSettingsModel = { operator: 'contains' };
  sortSettings: SortSettingsModel = {
    columns: [{ field: 'movementDate', direction: 'Descending' }],
  };
  screenHeight = 320;
  gridEnabled = false;
  editSettings: EditSettingsModel = {
    allowAdding: false,
    allowEditing: false,
    allowDeleting: false,
    mode: 'Dialog',
  };

  movementTypes = TREASURY_BANK_MOVEMENT_TYPES;
  movementTypeFields: Object = { text: 'description', value: 'code' };
  movementData: ITreasuryMovement = this.createEmptyMovement();

  private selectedTreasuryId = 0;
  private organizationId = 0;
  private defaultOrigin = 'BAN';
  private defaultMovementType = 'DP';
  private toolbarTitle = 'Movimientos';
  private readonly searchStringSubject = new BehaviorSubject<string>('');
  private readonly destroy$ = new Subject<void>();

  constructor(
    private treasuryService: TreasuryService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.organizationId = this.treasuryService.currentOrganizationId;

    this.treasuryService.treasuryTypeFilterAction$
      .pipe(takeUntil(this.destroy$))
      .subscribe((type) => {
        const isCash = type === TREASURY_TYPE_CASHBOX;
        this.defaultOrigin = isCash ? 'CAJ' : 'BAN';
        this.defaultMovementType = isCash ? 'EN' : 'DP';
        this.movementTypes = isCash
          ? TREASURY_CASH_MOVEMENT_TYPES
          : TREASURY_BANK_MOVEMENT_TYPES;
        this.toolbarTitle = isCash
          ? 'Movimientos de caja'
          : 'Movimientos de banco';
        this.applyEditState(this.selectedTreasuryId > 0);
        this.cdr.markForCheck();
      });

    this.treasuryService.treasuryContextIdAction$
      .pipe(takeUntil(this.destroy$))
      .subscribe((treasuryId) => {
        this.selectedTreasuryId = treasuryId ?? 0;
        this.organizationId = this.treasuryService.currentOrganizationId;
        this.applyEditState(this.selectedTreasuryId > 0);
        this.cdr.markForCheck();
      });

    this.movements$ = combineLatest([
      this.treasuryService.treasuryMovements$,
      this.searchStringSubject.asObservable().pipe(startWith('')),
    ]).pipe(
      map(([movements, searchStr]) => {
        const needle = (searchStr || '').toLocaleLowerCase().trim();
        if (!needle) {
          return movements;
        }
        return movements.filter((m) => {
          const hay = [
            m.movementDocument,
            m.movementType,
            m.concept,
            m.origin,
            m.originDocument,
            m.beneficiary,
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
    this.applyEditState(this.selectedTreasuryId > 0);
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

  actionBegin(args: SaveEventArgs): void {
    if (args.requestType === 'beginEdit') {
      args.cancel = true;
      return;
    }

    const needsSelection =
      args.requestType === 'add' ||
      args.requestType === 'save' ||
      args.requestType === 'delete';

    if (needsSelection && this.selectedTreasuryId <= 0) {
      args.cancel = true;
      this.toastService.showMyToast(
        this.defaultOrigin === 'CAJ'
          ? 'Debe seleccionar una caja para gestionar movimientos'
          : 'Debe seleccionar un banco para gestionar movimientos',
        toastType.warning
      );
      return;
    }

    if (args.requestType === 'add') {
      this.movementData = {
        ...this.createEmptyMovement(),
        treasuryId: this.selectedTreasuryId,
        organizationId: this.organizationId,
        movementId: 0,
        fiscalPeriod: new Date().getFullYear(),
      };
      this.cdr.markForCheck();
    }

    if (args.requestType === 'save') {
      if (!this.movementForm?.valid) {
        args.cancel = true;
        return;
      }

      const movementDate = this.asDate(this.movementData.movementDate);
      const payload: ITreasuryMovement = {
        ...this.movementData,
        movementId: 0,
        treasuryId: this.selectedTreasuryId,
        organizationId: this.organizationId,
        movementDate,
        fiscalPeriod:
          this.movementData.fiscalPeriod || movementDate.getFullYear(),
        reconciled: !!this.movementData.reconciled,
        batchCancellation: !!this.movementData.batchCancellation,
      };
      args.data = payload;

      this.treasuryService
        .addMovement(payload)
        .pipe(take(1))
        .subscribe({
          error: () => {
            args.cancel = true;
          },
        });
    }

    if (args.requestType === 'delete') {
      const row = (args.data ?? {}) as ITreasuryMovement;
      if (row.movementId > 0 && row.treasuryId > 0) {
        this.treasuryService
          .deleteMovement(row.movementId, row.treasuryId)
          .pipe(take(1))
          .subscribe({
            error: () => {
              args.cancel = true;
            },
          });
      }
    }
  }

  actionComplete(args: DialogEditEventArgs): void {
    if (args.requestType === 'add') {
      const dialog = args.dialog as { header?: string } | undefined;
      if (dialog) {
        dialog.header = 'Agregar movimiento';
      }

      setTimeout(() => {
        const form = args.form as HTMLFormElement | undefined;
        const field = form?.elements.namedItem(
          'movementDocument'
        ) as HTMLInputElement | null;
        field?.focus();
      });
    }
  }

  private applyEditState(enabled: boolean): void {
    this.gridEnabled = enabled;
    this.toolbar = withToolbarTitle(
      enabled ? ['Add', 'Delete', 'Search'] : ['Search'],
      this.toolbarTitle
    );
    this.editSettings = {
      allowAdding: enabled,
      allowEditing: false,
      allowDeleting: enabled,
      mode: 'Dialog',
    };

    setTimeout(() => {
      if (!this.grid?.element) {
        return;
      }
      this.grid.toolbar = this.toolbar;
      this.grid.editSettings = { ...this.editSettings };
      this.grid.element.classList.toggle('disablegrid', !enabled);
      this.cdr.markForCheck();
    });
  }

  private createEmptyMovement(): ITreasuryMovement {
    const today = new Date();
    return {
      movementId: 0,
      treasuryId: this.selectedTreasuryId,
      movementDate: today,
      movementDocument: '',
      movementType: this.defaultMovementType,
      concept: '',
      amount: null,
      origin: this.defaultOrigin,
      originDocument: '',
      originType: '',
      beneficiary: '',
      paymentReceipt: '',
      reconciled: false,
      reconciledMonth: null,
      reconciledDate: null,
      batchCancellation: false,
      journalEntryNumber: '',
      journalEntryDate: '',
      customer_Provider: null,
      salesPersonId: null,
      accountId: null,
      classId: null,
      lock_Date: null,
      fiscalPeriod: today.getFullYear(),
      organizationId: this.organizationId,
    };
  }

  private asDate(value: Date | string | null | undefined): Date {
    if (value instanceof Date) {
      return value;
    }
    if (value) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
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
