import { ChangeDetectionStrategy, Component, Input, OnInit, ViewChild } from '@angular/core';

import {
  EditSettingsModel,
  GridComponent,
  ToolbarItems,
  SearchSettingsModel,
  SearchEventArgs,
  RecordDoubleClickEventArgs,
  CommandModel,
  RowSelectEventArgs,
  CommandClickEventArgs,
} from '@syncfusion/ej2-angular-grids';

import EntityToolbar from '@assets/json/entitiestoolbar.json';
import { IPhone } from './phone';
import { childgrid, sharedSetting, toastType } from '@shared/enums/enums';
import { PhoneService } from './phone.service';
import { ClickEventArgs } from '@syncfusion/ej2-angular-navigations';
import { ApplicationService } from '@shared/services/applicattionService';
import { EMPTY, Observable, catchError, combineLatest, map, tap } from 'rxjs';
import { ToastService } from '@shared/services/toastService';

@Component({
  selector: 'llion-grid-phone',
  templateUrl: './phone-grid.html',
  styleUrls: ['./phone-grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class PhoneGridComponent implements OnInit {
  @ViewChild('phonegrid') public phonegrid!: GridComponent;

  public commands!: CommandModel[];
  parentRef_EntityId: number = 0;
  entityId: number = 0;
  errorMessage = '';
  gridtitle: string = 'teléfonos';
  gridHeight = sharedSetting.formGridHeight;

  selectedPhone: IPhone | undefined;

  phones$!: Observable<IPhone[]>;

  enabled$!: Observable<boolean>;

  toolbar: ToolbarItems[] | object = EntityToolbar.map((elem) => ({
    ...elem,
    template: elem.template
      ? `<label class='grid-label' id='title-grid'>${this.gridtitle}</label>`
      : undefined,
    align: elem.align ? elem.align : undefined,
  }));

  constructor(
    private phoneService: PhoneService,
    private applicationService: ApplicationService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.applicationService.WhenReady(
      () => this.phonegrid,
      () =>
        this.applicationService.WhenReady(
          () => this.phonegrid.toolbarModule,
          () => {
            this.phonegrid.toolbarModule.enableItems(['add'], true);
            this.gridtitle = 'teléfonos';
            this.phonegrid.element.classList.add('disablegrid');
            document.getElementById('phonegrid')?.classList.add('wrapper');
            this.commands = [
              {
                type: 'Delete',
                buttonOption: { cssClass: 'e-btn', iconCss: 'e-trash e-icons' },
              },
            ];
          }
        )
    );

    this.phones$ = combineLatest([
      this.phoneService.phoneWithCRUD$,
      this.applicationService.enablePhoneChildGridAction$,
    ]).pipe(
      map(([phones, enabled]) => phones.filter(Boolean)),
      catchError((err) => {
        this.toastService.showMyToast(err, toastType.error);
        return EMPTY;
      })
    );

    this.enabled$ = this.applicationService.enableEmailChildGridAction$.pipe(
      tap((enabled) => {
        if (this.phonegrid) {
          if (!enabled) {
            this.phonegrid.element.classList.add('disablegrid');
            document.getElementById('phone-grid')?.classList.add('wrapper');
          } else {
            this.phonegrid.element.classList.remove('disablegrid');
            document.getElementById('phone-grid')?.classList.remove('wrapper');
          }
        }
      })
    );

    this.parentRef_EntityId = this.phoneService.parentRefEntityId;

    this.applicationService.entityId$.subscribe((entity) => {
      this.entityId = entity;
    });
  }

  onRowSelected(args: RowSelectEventArgs): void {
    this.selectedPhone = (args.data ? args.data : []) as IPhone;
    this.phoneService.phoneSelected(this.selectedPhone);
    this.applicationService.entitySelected(this.selectedPhone.phoneId);
  }

  onRecordDoubleClick(args: RecordDoubleClickEventArgs): void {
    this.selectedPhone = args.rowData as IPhone;
    this.phoneService.phoneSelected(this.selectedPhone);
    this.applicationService.enableDetailForm(childgrid.Phone, true);
  }

  onToolbarClick(args: ClickEventArgs): void {
    const phone: IPhone = {
      phoneId: 0,
      countryCode: '',
      phoneNumber: '',
      phoneType: '',
      entityId: this.parentRef_EntityId,
      organizationId: this.entityId,
    };
    const target: HTMLElement = args.originalEvent.target as HTMLElement;
    if (target.parentElement?.id === 'add') {
      this.phoneService.phoneSelected(phone);
      this.applicationService.enableDetailForm(childgrid.Phone, true);
      args.cancel = true;
    }
  }

  commandClick(args: CommandClickEventArgs): void {
    if (args.target?.title == 'Delete' && this.selectedPhone) {
      this.phoneService.deletePhone(this.selectedPhone);
    }
  }
}
