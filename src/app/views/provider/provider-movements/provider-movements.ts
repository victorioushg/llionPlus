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
  SelectionSettingsModel,
  SortSettingsModel,
} from '@syncfusion/ej2-angular-grids';
import { ClickEventArgs } from '@syncfusion/ej2-angular-navigations';
import { ItemModel } from '@syncfusion/ej2-navigations';
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
import { ProviderService } from '../provider.service';
import {
  IProviderMovement,
  PROVIDER_MOVEMENT_TYPES,
  PROVIDER_PAYMENT_METHODS,
  providerMovementCreditDebit,
} from '../provider';

@Component({
  selector: 'llion-provider-movements',
  templateUrl: './provider-movements.html',
  styleUrls: ['./provider-movements.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ProviderMovementsComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('movementsgrid') grid?: GridComponent;
  @ViewChild('movementForm') movementForm?: NgForm;

  movements$!: Observable<IProviderMovement[]>;
  toolbar: GridToolbarItem[] = withToolbarTitle(['Search'], 'Movimientos');
  searchSettings: SearchSettingsModel = { operator: 'contains' };
  sortSettings: SortSettingsModel = {
    columns: [
      { field: 'documentNumber', direction: 'Ascending' },
      { field: 'movementDate', direction: 'Ascending' },
    ],
  };
  selectionSettings: SelectionSettingsModel = { type: 'Single' };
  editSettings: EditSettingsModel = {
    allowAdding: false,
    allowEditing: false,
    allowDeleting: false,
    mode: 'Dialog',
  };
  screenHeight = 320;
  gridEnabled = false;
  historicView = false;
  movementData: IProviderMovement = this.createEmptyMovement();
  movementTypes = PROVIDER_MOVEMENT_TYPES;
  paymentMethods = PROVIDER_PAYMENT_METHODS;
  dropdownFields: Object = { text: 'description', value: 'code' };

  private selectedProviderId = 0;
  private organizationId = 0;
  private readonly searchStringSubject = new BehaviorSubject<string>('');
  private readonly destroy$ = new Subject<void>();

  constructor(
    private providerService: ProviderService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.organizationId = this.providerService.currentOrganizationId;

    this.providerService.providerContextIdAction$
      .pipe(takeUntil(this.destroy$))
      .subscribe((providerId) => {
        this.selectedProviderId = providerId ?? 0;
        this.organizationId = this.providerService.currentOrganizationId;
        this.historicView = false;
        this.applyEnabledState(this.selectedProviderId > 0);
        this.cdr.markForCheck();
      });

    this.movements$ = combineLatest([
      this.providerService.providerMovements$,
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
            m.reference,
            m.origin,
            m.originDocument,
            m.paymentMethod,
            m.paymentDocument,
            m.treasuryName,
            m.paymentReceipt,
            m.beneficiary,
            m.cancellationDocumentType,
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
    this.applyEnabledState(this.selectedProviderId > 0);
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

    const action = this.toolbarActionId(args);
    if (action === 'addMovement') {
      args.cancel = true;
      this.addMovement();
      return;
    }
    if (action === 'deleteMovement') {
      args.cancel = true;
      this.deleteSelected();
      return;
    }
    if (action === 'historicUp') {
      args.cancel = true;
      this.uploadToHistoric();
      return;
    }
    if (action === 'historicDown') {
      args.cancel = true;
      this.downloadFromHistoric();
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

    if (needsSelection && this.selectedProviderId <= 0) {
      args.cancel = true;
      this.toastService.showMyToast(
        'Debe seleccionar un proveedor para gestionar movimientos',
        toastType.warning
      );
      return;
    }

    if (args.requestType === 'add') {
      if (this.historicView) {
        args.cancel = true;
        this.toastService.showMyToast(
          'No se pueden agregar movimientos en el histórico',
          toastType.warning
        );
        return;
      }
      this.movementData = this.createEmptyMovement();
      this.cdr.markForCheck();
    }

    if (args.requestType === 'save') {
      if (!this.movementForm?.valid) {
        args.cancel = true;
        return;
      }

      const movementDate = this.asDate(this.movementData.movementDate);
      const payload: IProviderMovement = {
        ...this.movementData,
        movementId: 0,
        providerId: this.selectedProviderId,
        organizationId: this.organizationId,
        movementDate,
        creditDebit: providerMovementCreditDebit(this.movementData.movementType),
        historic: 0,
        fiscalPeriod: 0,
      };
      args.data = payload;

      this.providerService
        .addMovement(payload)
        .pipe(take(1))
        .subscribe({
          error: () => {
            args.cancel = true;
          },
        });
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
          'documentNumber'
        ) as HTMLInputElement | null;
        field?.focus();
      });
    }
  }

  private addMovement(): void {
    if (!this.ensureProviderSelected()) {
      return;
    }
    if (this.historicView) {
      this.toastService.showMyToast(
        'No se pueden agregar movimientos en el histórico',
        toastType.warning
      );
      return;
    }
    this.grid?.addRecord();
  }

  private deleteSelected(): void {
    if (!this.ensureProviderSelected()) {
      return;
    }
    const row = this.getSelectedMovement();
    if (!row?.movementId) {
      this.toastService.showMyToast(
        'Seleccione un movimiento para eliminar',
        toastType.warning
      );
      return;
    }

    this.providerService
      .deleteMovement(row.movementId, row.providerId || this.selectedProviderId)
      .pipe(take(1))
      .subscribe();
  }

  private uploadToHistoric(): void {
    if (!this.ensureProviderSelected()) {
      return;
    }
    if (this.historicView) {
      this.setHistoricView(false);
      this.toastService.showMyToast(
        'Seleccione un movimiento vigente para subirlo a histórico',
        toastType.warning
      );
      return;
    }

    const row = this.getSelectedMovement();
    if (!row?.movementId) {
      this.toastService.showMyToast(
        'Seleccione un movimiento para subir a histórico',
        toastType.warning
      );
      return;
    }

    this.providerService
      .setMovementHistoric(
        row.movementId,
        row.providerId || this.selectedProviderId,
        1
      )
      .pipe(take(1))
      .subscribe();
  }

  private downloadFromHistoric(): void {
    if (!this.ensureProviderSelected()) {
      return;
    }
    if (!this.historicView) {
      this.setHistoricView(true);
      return;
    }

    const row = this.getSelectedMovement();
    if (!row?.movementId) {
      this.toastService.showMyToast(
        'Seleccione un movimiento del histórico para bajarlo',
        toastType.warning
      );
      return;
    }

    this.providerService
      .setMovementHistoric(
        row.movementId,
        row.providerId || this.selectedProviderId,
        0
      )
      .pipe(take(1))
      .subscribe();
  }

  private setHistoricView(historic: boolean): void {
    this.historicView = historic;
    this.providerService.setMovementsHistoricView(historic);
    this.applyEnabledState(this.selectedProviderId > 0);
    this.cdr.markForCheck();
  }

  private applyEnabledState(enabled: boolean): void {
    this.gridEnabled = enabled;
    const title = this.historicView ? 'Histórico' : 'Movimientos';
    this.toolbar = withToolbarTitle(
      enabled ? this.actionToolbarItems() : ['Search'],
      title
    );
    this.editSettings = {
      allowAdding: enabled && !this.historicView,
      allowEditing: false,
      allowDeleting: false,
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

  private actionToolbarItems(): GridToolbarItem[] {
    return [
      this.iconButton('addMovement', 'e-add', 'Agregar'),
      this.iconButton('deleteMovement', 'e-delete', 'Eliminar'),
      this.iconButton('historicUp', 'e-upload-1', 'Subir a Histórico'),
      this.iconButton('historicDown', 'e-download', 'Bajar de Histórico'),
      'Search',
    ];
  }

  private iconButton(id: string, icon: string, tooltip: string): ItemModel {
    return {
      id,
      text: tooltip,
      prefixIcon: icon,
      tooltipText: tooltip,
      align: 'Left',
    };
  }

  private toolbarActionId(args: ClickEventArgs): string {
    const known = [
      'addMovement',
      'deleteMovement',
      'historicUp',
      'historicDown',
    ];
    const raw = args.item?.id || '';
    const fromItem = known.find((id) => raw === id || raw.endsWith('_' + id));
    if (fromItem) {
      return fromItem;
    }

    const target = args.originalEvent?.target as HTMLElement | undefined;
    const buttonId = target?.closest('button')?.id || target?.id || '';
    return known.find((id) => buttonId.endsWith(id)) || '';
  }

  private getSelectedMovement(): IProviderMovement | null {
    const rows = (this.grid?.getSelectedRecords() ?? []) as IProviderMovement[];
    return rows[0] ?? null;
  }

  private ensureProviderSelected(): boolean {
    if (this.selectedProviderId > 0) {
      return true;
    }
    this.toastService.showMyToast(
      'Debe seleccionar un proveedor para gestionar movimientos',
      toastType.warning
    );
    return false;
  }

  private createEmptyMovement(): IProviderMovement {
    return {
      movementId: 0,
      providerId: this.selectedProviderId,
      movementDate: new Date(),
      movementType: 'FC',
      documentNumber: '',
      dueDate: null,
      reference: '',
      concept: '',
      amount: null,
      vatPortion: null,
      paymentMethod: '',
      paymentDocument: '',
      treasuryId: null,
      paymentReceipt: '',
      beneficiary: '',
      origin: '',
      originDocument: '',
      cancellationDocumentType: '',
      creditDebit: 0,
      historic: 0,
      fiscalPeriod: 0,
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
