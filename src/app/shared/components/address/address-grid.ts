import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
} from '@angular/core';

import {
  CommandClickEventArgs,
  CommandModel,
  GridComponent,
  RecordDoubleClickEventArgs,
  RowSelectEventArgs,
  ToolbarItems,
} from '@syncfusion/ej2-angular-grids';

import EntityToolbar from '@assets/json/entitiestoolbar.json';
import { IAddress } from './address';
import { ClickEventArgs } from '@syncfusion/ej2-angular-navigations';
import { childgrid, sharedSetting, toastType } from '@shared/enums/enums';
import { AddressService } from './address.service';
import { ToastService } from '@shared/services/toastService';
import { ApplicationService } from '@shared/services/applicattionService';
import { EMPTY, Observable, catchError, combineLatest, map, tap } from 'rxjs';

@Component({
  selector: 'llion-grid-address',
  templateUrl: './address-grid.html',
  styleUrls: ['./address-grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false, 
})
export class AddressGridComponent implements OnInit {
  @ViewChild('grid') public grid!: GridComponent;

  public commands!: CommandModel[];

  parentRef_EntityId: number = 0; 
  entityId: number = 0;
  errorMessage = '';
  gridtitle: string = 'direcciones';
  gridHeight = sharedSetting.formGridHeight;

  selectedAddress: IAddress | undefined;

  addresses$!: Observable<IAddress[]>;
  enabled$!: Observable<boolean>; 
  toolbar: ToolbarItems[] | object = EntityToolbar.map((elem) => ({
    ...elem,
    template: elem.template
      ? `<label class='grid-label' id='title-grid'>${this.gridtitle}</label>`
      : undefined,
    align: elem.align ? elem.align : undefined,
  }));

  constructor(
    private addressService: AddressService,
    private applicationService: ApplicationService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {

    this.applicationService.WhenReady(
      () => this.grid,
      () =>
        this.applicationService.WhenReady(
          () => this.grid.toolbarModule,
          () => {
            this.grid.toolbarModule.enableItems(['add'], true);
            this.gridtitle = 'direcciones';
            this.grid.element.classList.add('disablegrid');
            document.getElementById('grid')?.classList.add('wrapper');
            this.commands = [
              {
                type: 'Delete',
                buttonOption: { cssClass: 'e-btn', iconCss: 'e-trash e-icons' },
              },
            ];
          }
        )
    );

    this.addresses$ = combineLatest([
      this.addressService.addressWithCRUD$,
      this.applicationService.enableAddressChildGridAction$,
    ]).pipe(
      map(([addresses, enabled]) => addresses.filter(Boolean)),
      catchError((err) => {
        this.toastService.showMyToast(err, toastType.error);
        return EMPTY;
      })
    );

    this.enabled$ = this.applicationService.enableAddressChildGridAction$.pipe(
      tap((enabled) => {
        if (this.grid) {
          if (!enabled) {
            this.grid.element.classList.add('disablegrid');
            document.getElementById('grid')?.classList.add('wrapper');
          } else {
            this.grid.element.classList.remove('disablegrid');
            document.getElementById('grid')?.classList.remove('wrapper');
          }
        }
      })
    );

     this.parentRef_EntityId = this.addressService.parentRefEntityId;

     this.applicationService.entityId$.subscribe((entity) => {
       this.entityId = entity; 
     });


  }

  onRowSelected(args: RowSelectEventArgs): void {
    this.selectedAddress = (args.data ? args.data : []) as IAddress;
    this.addressService.addressSelected(this.selectedAddress);
    this.applicationService.entitySelected(this.selectedAddress.addressId);
  }

  onRecordDoubleClick(args: RecordDoubleClickEventArgs): void {
    this.selectedAddress = args.rowData as IAddress;
    this.addressService.addressSelected(this.selectedAddress);
   this.applicationService.enableDetailForm(childgrid.Address, true);
  }

  onToolbarClick(args: ClickEventArgs): void {
    const address: IAddress = {
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
      entityId: this.parentRef_EntityId, 
      organizationId: this.entityId,
    };
    const target: HTMLElement = args.originalEvent.target as HTMLElement;
    if (target.parentElement?.id === 'add') {
      this.addressService.addressSelected(address);
      this.applicationService.enableDetailForm(childgrid.Address, true);
      args.cancel = true;
    }
  }

  commandClick(args: CommandClickEventArgs): void {
    if (args.target?.title == 'Delete' && this.selectedAddress) {
      this.addressService.deleteAddress(this.selectedAddress);
    }
  }
}
