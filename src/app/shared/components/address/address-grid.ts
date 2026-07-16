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

  toolbar: ToolbarItems[] = [];
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
      this.applicationService.enableAddressChildGridAction$,
    ]).pipe(
      map(([addresses]) => addresses.filter(Boolean)),
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
        'Debe editar la organización para gestionar direcciones',
        toastType.warning
      );
      return;
    }

    if (args.requestType === 'beginEdit' || args.requestType === 'add') {
      const row = (args.rowData ?? {}) as Partial<IAddress>;
      this.addressData = {
        ...this.createEmptyAddress(),
        ...row,
        organizationId: this.organizationId,
        entityId: this.entityId || row.entityId || 0,
      };
      this.cdr.markForCheck();
    }

    if (args.requestType === 'save') {
      if (this.addressForm?.valid) {
        const payload: IAddress = {
          ...this.addressData,
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
        };
        args.data = payload;

        if (payload.addressId && payload.addressId > 0) {
          this.addressService.updateAddress(payload);
        } else {
          this.addressService.addAddress(payload);
        }
      } else {
        args.cancel = true;
      }
    }

    if (args.requestType === 'delete') {
      const row = (args.data ?? {}) as IAddress;
      if (row.addressId > 0) {
        this.addressService.deleteAddress(row);
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

  private applyEditState(): void {
    const enabled = this.gridEnabled;
    this.toolbar = enabled ? ['Add', 'Edit', 'Delete'] : [];
    this.editSettings = {
      allowAdding: enabled,
      allowEditing: enabled,
      allowDeleting: enabled,
      mode: 'Dialog',
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
