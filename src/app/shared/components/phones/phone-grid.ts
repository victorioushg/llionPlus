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
import { withToolbarTitle } from '@shared/utils/grid-toolbar';
import {
  Observable,
  Subject,
  catchError,
  combineLatest,
  EMPTY,
  map,
  of,
  takeUntil,
} from 'rxjs';
import { IPhone, IPhoneType } from './phone';
import { PhoneService } from './phone.service';
import { ApplicationService } from '@shared/services/applicattionService';
import { ToastService } from '@shared/services/toastService';
import { sharedSetting, toastType } from '@shared/enums/enums';
import Countries from '@assets/json/countries.json';

@Component({
  selector: 'llion-grid-phone',
  templateUrl: './phone-grid.html',
  styleUrls: ['./phone-grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class PhoneGridComponent implements OnInit, OnDestroy {
  @ViewChild('phonegrid') phonegrid?: GridComponent;
  @ViewChild('phoneForm') phoneForm?: NgForm;

  phones$!: Observable<IPhone[]>;
  phoneTypes$!: Observable<IPhoneType[]>;
  enabled$!: Observable<boolean>;

  gridHeight = sharedSetting.formGridHeight;
  gridEnabled = false;
  organizationId = 0;
  entityId = 0;

  phoneMask = '(999) 999-9999';
  phoneCodes: { [key: string]: Object }[] = Countries.map((country) => ({
    name: ' ' + country.name + ` (${country.dial_code})`,
    code: country.code,
    dial_code: country.dial_code,
    flagclass: 'fi fi-' + country.code.toLocaleLowerCase() + ' fis',
  }));
  phoneCountryFields: Object = {
    text: 'name',
    value: 'code',
    iconCss: 'flagclass',
  };
  phoneTypeFields: Object = {
    text: 'name',
    value: 'type',
  };
  filterType = 'Contains';

  phoneData: IPhone = this.createEmptyPhone();

  toolbar = withToolbarTitle([], 'Teléfonos') as ToolbarItems[];
  editSettings: EditSettingsModel = {
    allowAdding: false,
    allowEditing: false,
    allowDeleting: false,
    mode: 'Dialog',
  };

  private readonly destroy$ = new Subject<void>();

  constructor(
    private phoneService: PhoneService,
    private applicationService: ApplicationService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.enabled$ = this.applicationService.enablePhoneChildGridAction$;
    this.phoneTypes$ = of([
      { type: 'Principal', name: 'Principal' },
      { type: 'Móvil', name: 'Móvil' },
      { type: 'Fax', name: 'Fax' },
      { type: 'Otro', name: 'Otro' },
    ]);

    this.phones$ = combineLatest([
      this.phoneService.phoneWithCRUD$,
      this.applicationService.enablePhoneChildGridAction$,
    ]).pipe(
      map(([phones]) => phones.filter(Boolean)),
      catchError((err) => {
        this.toastService.showMyToast(err, toastType.error);
        return EMPTY;
      })
    );

    combineLatest([
      this.applicationService.enablePhoneChildGridAction$,
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
        'Debe editar la organización para gestionar teléfonos',
        toastType.warning
      );
      return;
    }

    if (args.requestType === 'beginEdit' || args.requestType === 'add') {
      const row = (args.rowData ?? {}) as Partial<IPhone>;
      this.phoneData = {
        ...this.createEmptyPhone(),
        ...row,
        organizationId: this.organizationId,
        entityId: this.entityId || row.entityId || 0,
      };
      this.cdr.markForCheck();
    }

    if (args.requestType === 'save') {
      if (this.phoneForm?.valid) {
        const payload: IPhone = {
          ...this.phoneData,
          organizationId: this.organizationId,
          entityId: this.entityId,
        };
        args.data = payload;

        if (payload.phoneId && payload.phoneId > 0) {
          this.phoneService.updatePhone(payload);
        } else {
          this.phoneService.addPhone(payload);
        }
      } else {
        args.cancel = true;
      }
    }

    if (args.requestType === 'delete') {
      const row = (args.data ?? {}) as IPhone;
      if (row.phoneId > 0) {
        this.phoneService.deletePhone(row);
      }
    }
  }

  actionComplete(args: DialogEditEventArgs): void {
    if (args.requestType === 'beginEdit' || args.requestType === 'add') {
      const dialog = args.dialog as { header?: string } | undefined;
      if (dialog) {
        dialog.header =
          args.requestType === 'add' ? 'Agregar teléfono' : 'Editar teléfono';
      }
    }
  }

  private applyEditState(): void {
    const enabled = this.gridEnabled;
    this.toolbar = withToolbarTitle(
      enabled ? ['Add', 'Edit', 'Delete'] : [],
      'Teléfonos'
    ) as ToolbarItems[];
    this.editSettings = {
      allowAdding: enabled,
      allowEditing: enabled,
      allowDeleting: enabled,
      mode: 'Dialog',
    };

    if (this.phonegrid) {
      this.phonegrid.toolbar = this.toolbar;
      this.phonegrid.editSettings = { ...this.editSettings };
    }
  }

  private createEmptyPhone(): IPhone {
    return {
      phoneId: 0,
      countryCode: '',
      phoneNumber: '',
      phoneType: '',
      entityId: this.entityId,
      organizationId: this.organizationId,
    };
  }
}
