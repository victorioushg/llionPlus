import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { childgrid, sharedSetting } from '@shared/enums/enums';

import { enableRipple } from '@syncfusion/ej2-base';
import { PhoneService } from './phone.service';
import { ApplicationService } from '@shared/services/applicattionService';
import {
  EMPTY,
  Observable,
  Subject,
  catchError,
  combineLatest,
  map,
  shareReplay,
  tap,
} from 'rxjs';
import { ToastService } from '@shared/services/toastService';
import { IPhone, IPhoneType } from './phone';
import Countries from '@assets/json/countries.json'

enableRipple(true);

@Component({
  selector: 'llion-phone',
  templateUrl: 'phone-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class PhoneComponent implements OnInit {
  entityId!: number;
  parentRefEntityId!: number;
  invalidPhone!: boolean;
  phoneForm!: FormGroup;
  phone: any;
  phoneVisible!: boolean;

  public phoneMask: string = '(999) 999-9999';

  phoneCodes: { [key: string]: Object }[] = Countries.map((country) => ({
    name: ' ' + country.name + ` (${country.dial_code})`,
    code: country.code,
    dial_code: country.dial_code,
    flagclass: 'fi fi-' + country.code.toLocaleLowerCase() + ' fis',
  }));
  phoneCountryFields: Object = {
    text: `name`,
    value: 'code',
    iconCss: 'flagclass',
  };
  public text: string = 'Select a country';
  public filterType: string = 'Contains';

  private errorMessageSubject = new Subject<string>();
  errorMessage$ = this.errorMessageSubject.asObservable();

  enabled$!: Observable<boolean>;

  phone$!: Observable<IPhone>;

  vm$!: Observable<{
    enabled: boolean;
    phone: IPhone;
  }>;

  phoneTypes$!: Observable<IPhoneType[]>;
  phoneTypeFields: Object = {
    text: 'typeDescription',
    value: 'phoneType',
  };

  constructor(
    private formBuilder: FormBuilder,
    private phoneService: PhoneService,
    private applicationService: ApplicationService
  ) {}

  ngOnInit() {
    this.phoneForm = this.formBuilder.group({
      countrycode: ['', Validators.required],
      phonenumber: ['', Validators.required],
      phonetypeddl: ['', Validators.required],
    });

    this.enabled$ = this.applicationService.enablePhoneChildFormAction$.pipe(
      tap((enabled) => (this.phoneVisible = enabled))
    );

    this.phone$ = this.phoneService.phone$.pipe(
      tap((data) => (this.phone = data)),
      catchError((err) => {
        this.errorMessageSubject.next(err);
        return EMPTY;
      })
    );

    this.phoneTypes$ = this.phoneService.phoneTypes$;

    this.vm$ = combineLatest([this.enabled$, this.phone$]).pipe(
      map(([enabled, phone]) => ({ enabled, phone }))
    );

    this.applicationService.parentRefEntityId$.subscribe((result) => {
      this.parentRefEntityId = result;
    });

    this.applicationService.entityId$.subscribe((entity) => {
      this.entityId = entity;
    });
  }

  clearForm() {
    this.phoneForm.reset();
  }

  onCancelClick() {
    this.disableForm();
  }

  onSaveClick() {
    const newPhone: IPhone = {
      phoneId: this.phone.phoneId,
      countryCode: this.phoneForm.value.countrycode,
      phoneNumber: this.phoneForm.value.phonenumber,
      phoneType: this.phoneForm.value.phonetypeddl,
      entityId: this.parentRefEntityId,
      organizationId: this.entityId,
    };

    if (this.phone.addressId !== 0) {
      this.phoneService.updatePhone(newPhone);
    } else {
      this.phoneService.addPhone(newPhone);
    }

    this.disableForm();
  }

  disableForm() {
    this.phoneService.phoneSelected(this.phone.entityId);
    this.applicationService.enableDetailForm(childgrid.Phone, false);
  }
}
