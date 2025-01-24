import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { enableRipple } from '@syncfusion/ej2-base';
import { IAddress, IAddressType } from './address';
import { AddressService } from './address.service';
import { ApplicationService } from '@shared/services/applicattionService';
import { ToastService } from '@shared/services/toastService';
import {
  EMPTY,
  Observable,
  Subject,
  catchError,
  combineLatest,
  map,
  tap,
} from 'rxjs';
import { childgrid } from '@shared/enums/enums';

enableRipple(true);

@Component({
  selector: 'llion-address',
  templateUrl: './address-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AddressComponent implements OnInit {
  entityId!: number;
  parentRefEntityId!: number;
  invalidAddress!: boolean;
  addressForm!: FormGroup;
  address: any;
  addressVisible!: boolean;

  private errorMessageSubject = new Subject<string>();
  errorMessage$ = this.errorMessageSubject.asObservable();

  enabled$!: Observable<boolean>;

  address$!: Observable<IAddress>;

  vm$!: Observable<{
    enabled: boolean;
    address: IAddress;
  }>;

  addressTypes$!: Observable<IAddressType[]>;
  addressFields: Object = { text: 'addressTypeId', value: 'typeDescription' };
  addressValue!: string;

  constructor(
    private formBuilder: FormBuilder,
    private addressService: AddressService,
    private applicationService: ApplicationService
  ) {}

  ngOnInit() {
    this.addressForm = this.formBuilder.group({
      address1: ['', Validators.required],
      address2: ['', Validators.required],
      addresstypeddl: ['', Validators.required],
      postalcodeddl: ['', Validators.required],
      city: ['', Validators.required],
      county: ['', Validators.required],
      state: ['', Validators.required],
      country: ['', Validators.required],
    });

    this.enabled$ = this.applicationService.enableAddressChildFormAction$.pipe(
      tap((enabled) => (this.addressVisible = enabled))
    );

    this.address$ = this.addressService.address$.pipe(
      tap((data) => (this.address = data)),
      catchError((err) => {
        this.errorMessageSubject.next(err);
        return EMPTY;
      })
    );

    this.addressTypes$ = this.addressService.addressTypes$;

    this.vm$ = combineLatest([this.enabled$, this.address$]).pipe(
      map(([enabled, address]) => ({ enabled, address }))
    );

    this.applicationService.getParentRefEntityId('Organization').subscribe(
      (result) => {
        this.parentRefEntityId = result;
      });

    this.applicationService.entityId$.subscribe((entity) => {
      this.entityId = entity;
    });

  }

  clearForm() {
    this.addressForm.reset();
  }

  onCancelClick() {
    this.disableForm();
  }

  onSaveClick() {
    
    const newAddress: IAddress = {
      addressId: this.address.addressId,
      address1: this.addressForm.value.address1,
      address2: this.addressForm.value.address2,
      addressTypeId: this.addressForm.value.addresstypeddl,
      address3: '',
      city: this.addressForm.value.city,
      county: this.addressForm.value.county,
      state: this.addressForm.value.state,
      country: this.addressForm.value.country,
      postalCode: this.addressForm.value.postalcodeddl,
      displayAddress: this.address.displayAddress,
      entityId: this.parentRefEntityId,
      organizationId: this.entityId,
    };

    if (this.address.addressId !== 0) {
      this.addressService.updateAddress(newAddress);
    } else {
      this.addressService.addAddress(newAddress);
    }

    this.disableForm();
  }

  disableForm() {
    this.addressService.addressSelected(this.address.entityId);
    this.applicationService.enableDetailForm(childgrid.Address, false);
  }
}
