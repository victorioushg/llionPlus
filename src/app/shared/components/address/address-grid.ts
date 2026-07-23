import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  DialogEditEventArgs,
  EditSettingsModel,
  GridComponent,
  SaveEventArgs,
  ToolbarItems,
} from '@syncfusion/ej2-angular-grids';
import { ClickEventArgs } from '@syncfusion/ej2-navigations';
import { NgForm } from '@angular/forms';
import {
  Observable,
  Subject,
  catchError,
  combineLatest,
  EMPTY,
  map,
  takeUntil,
} from 'rxjs';
import { withToolbarTitle } from '@shared/utils/grid-toolbar';
import { IAddress, IAddressType } from './address';
import { AddressService } from './address.service';
import { ApplicationService } from '@shared/services/applicattionService';
import { ToastService } from '@shared/services/toastService';
import { sharedSetting, toastType } from '@shared/enums/enums';

@Component({
  selector: 'llion-grid-address',
  templateUrl: './address-grid.html',
  styleUrls: ['./address-grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AddressGridComponent implements OnInit, OnDestroy {
  @ViewChild('grid') grid?: GridComponent;
  @ViewChild('addressForm') addressForm?: NgForm;

  addresses$!: Observable<IAddress[]>;
  addressTypes$!: Observable<IAddressType[]>;
  enabled$!: Observable<boolean>;

  gridHeight = sharedSetting.formGridHeight;
  gridEnabled = false;
  organizationId = 0;
  entityId = 0;

  addressTypeFields: Object = {
    text: 'typeDescription',
    value: 'addressTypeId',
  };

  addressData: IAddress = this.createEmptyAddress();
  private addressTypes: IAddressType[] = [];

  toolbar = withToolbarTitle([], 'Direcciones') as ToolbarItems[];
  editSettings: EditSettingsModel = {
    allowAdding: false,
    allowEditing: false,
    allowDeleting: false,
    mode: 'Dialog',
  };

  private readonly destroy$ = new Subject<void>();

  constructor(
    private addressService: AddressService,
    private applicationService: ApplicationService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.addressTypes$ = this.addressService.addressTypes$;
    this.enabled$ = this.applicationService.enableAddressChildGridAction$;

    this.addresses$ = combineLatest([
      this.addressService.addressWithCRUD$,
      this.addressTypes$,
      this.applicationService.enableAddressChildGridAction$,
    ]).pipe(
      map(([addresses, types]) => {
        this.addressTypes = types ?? [];
        return (addresses ?? [])
          .filter(Boolean)
          .map((row) => this.withTypeDescription(row));
      }),
      catchError((err) => {
        this.toastService.showMyToast(err, toastType.error);
        return EMPTY;
      })
    );

    combineLatest([
      this.applicationService.enableAddressChildGridAction$,
      this.applicationService.organizationIdSelectedAction$,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([editing, organizationId]) => {
        this.organizationId = organizationId ?? 0;
        this.gridEnabled = !!editing && this.organizationId > 0;
        this.applyEditState();
        this.cdr.markForCheck();
      });

    this.applicationService.entitySelectedAction$
      .pipe(takeUntil(this.destroy$))
      .subscribe((entityId) => {
        this.entityId = entityId ?? 0;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  actionBegin(args: SaveEventArgs): void {
    const needsEditMode =
      args.requestType === 'beginEdit' ||
      args.requestType === 'add' ||
      args.requestType === 'save' ||
      args.requestType === 'delete';

    if (needsEditMode && !this.gridEnabled) {
      args.cancel = true;
      this.toastService.showMyToast(
        'Debe seleccionar una organización para gestionar direcciones',
        toastType.warning
      );
      return;
    }

    if (args.requestType === 'beginEdit' || args.requestType === 'add') {
      const row = (args.rowData ?? {}) as Partial<IAddress>;
      this.addressData = {
        ...this.createEmptyAddress(),
        ...row,
        addressId: Number(row.addressId) || 0,
        addressTypeId:
          row.addressTypeId === null || row.addressTypeId === undefined
            ? ''
            : row.addressTypeId,
        organizationId: this.organizationId,
        entityId: this.entityId || row.entityId || 0,
      };
      this.cdr.markForCheck();
    }

    if (args.requestType === 'save') {
      if (this.addressForm?.valid) {
        const typeId = Number(this.addressData.addressTypeId) || 0;
        const payload: IAddress = this.withTypeDescription({
          ...this.addressData,
          addressId: Number(this.addressData.addressId) || 0,
          addressTypeId: typeId,
          organizationId: this.organizationId,
          entityId: this.entityId,
          displayAddress: [
            this.addressData.address1,
            this.addressData.address2,
            this.addressData.city,
            this.addressData.county,
            this.addressData.state,
          ]
            .filter(Boolean)
            .join('. '),
        });
        args.data = payload;

        if (payload.addressId > 0) {
          this.addressService.updateAddress(payload);
        } else {
          this.addressService.addAddress(payload);
        }
      } else {
        args.cancel = true;
      }
    }

    if (args.requestType === 'delete') {
      const raw = (args.data ?? {}) as IAddress | IAddress[];
      const row = Array.isArray(raw) ? raw[0] : raw;
      const addressId = Number(row?.addressId) || 0;
      if (addressId > 0) {
        this.addressService.deleteAddress({
          ...row,
          addressId,
        });
      } else {
        args.cancel = true;
        this.toastService.showMyToast(
          'No se puede eliminar una dirección sin identificador',
          toastType.warning
        );
      }
    }
  }

  actionComplete(args: DialogEditEventArgs): void {
    if (args.requestType === 'beginEdit' || args.requestType === 'add') {
      const dialog = args.dialog as { header?: string } | undefined;
      if (dialog) {
        dialog.header =
          args.requestType === 'add'
            ? 'Agregar dirección'
            : 'Editar dirección';
      }
    }
  }

  onToolbarClick(args: ClickEventArgs): void {
    const itemId = (args.item?.id ?? '').toString().toLowerCase();
    if (!itemId.includes('delete')) {
      return;
    }

    if (!this.gridEnabled) {
      args.cancel = true;
      this.toastService.showMyToast(
        'Debe seleccionar una organización para gestionar direcciones',
        toastType.warning
      );
      return;
    }

    const selected = this.grid?.getSelectedRecords?.() as IAddress[] | undefined;
    const row = selected?.[0];
    const addressId = Number(row?.addressId) || 0;
    if (!row || addressId <= 0) {
      args.cancel = true;
      this.toastService.showMyToast(
        'Seleccione una dirección para eliminar',
        toastType.warning
      );
    }
  }

  private withTypeDescription(row: IAddress): IAddress {
    const typeId = Number(row.addressTypeId);
    const raw = row as IAddress & { TypeDescription?: string };
    const fromApi = String(raw.typeDescription ?? raw.TypeDescription ?? '').trim();
    const match = this.addressTypes.find(
      (t) => Number(t.addressTypeId) === typeId
    );
    const description =
      (fromApi && fromApi !== String(typeId) ? fromApi : '') ||
      match?.typeDescription ||
      '';

    return {
      ...row,
      addressTypeId:
        Number.isFinite(typeId) && typeId > 0 ? typeId : row.addressTypeId,
      typeDescription: description,
    };
  }

  private applyEditState(): void {
    const enabled = this.gridEnabled;
    this.toolbar = withToolbarTitle(
      enabled ? ['Add', 'Edit', 'Delete'] : [],
      'Direcciones'
    ) as ToolbarItems[];
    this.editSettings = {
      allowAdding: enabled,
      allowEditing: enabled,
      allowDeleting: enabled,
      mode: 'Dialog',
      showDeleteConfirmDialog: true,
    };

    if (this.grid) {
      this.grid.toolbar = this.toolbar;
      this.grid.editSettings = { ...this.editSettings };
    }
  }

  private createEmptyAddress(): IAddress {
    return {
      addressId: 0,
      address1: '',
      address2: '',
      addressTypeId: '',
      typeDescription: '',
      address3: '',
      city: '',
      county: '',
      state: '',
      country: '',
      postalCode: '',
      displayAddress: '',
      entityId: this.entityId,
      organizationId: this.organizationId,
    };
  }
}
