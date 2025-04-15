import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OrganizationService } from '../organization.service';

import { DropDownListComponent } from '@syncfusion/ej2-angular-dropdowns';
import {
  IAssosiationType,
  ICurrency,
  IOrganization,
  IOrganizationType,
} from '../organization';
import { catchError, EMPTY, Observable, Subject, tap } from 'rxjs';
import { ApplicationService } from '@shared/services/applicattionService';

@Component({
  selector: 'llion-organization-detail',
  templateUrl: './organization-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class OrganizationDetailComponent implements OnInit {
  private errorMessageSubject = new Subject<string>();
  organizationForm!: FormGroup;

  errorMessage$ = this.errorMessageSubject.asObservable();

  @ViewChild('otypes')
  listOTypes!: DropDownListComponent;

  @ViewChild('atypes')
  listATypes!: DropDownListComponent;

  @ViewChild('ctypes')
  cCurrencies!: DropDownListComponent;

  organizationTypes$!: Observable<IOrganizationType[]>;
  assosiationTypes$!: Observable<IAssosiationType[]>;
  currencies$!: Observable<ICurrency[]>;

  ofields: Object = { text: 'typeDescription', value: 'organizationType' };
  ovalue!: number;

  afields: Object = { text: 'typeDescription', value: 'assosiationType' };
  avalue!: number;

  cfields: Object = { text: 'currency', value: 'alphabeticCode' };
  cvalue!: string;

  org!: IOrganization;
  organization$!: Observable<IOrganization>;

  enabled$!: Observable<boolean>;

  constructor(
    private applicationService: ApplicationService,
    private formBuilder: FormBuilder,
    private organizationService: OrganizationService
  ) {}

  ngOnInit() {
    this.organizationForm = this.formBuilder.group({
      name: ['', Validators.required],
      taxRegistrationID: ['', Validators.required],
      activity: [],
      organizationType: [],
      associationType: [],
      deactivated: [true],
      currency: ['', Validators.required], 
      addedOn: [new Date()],
    });

    this.organizationTypes$ = this.organizationService.organizationTypes$;
    this.assosiationTypes$ = this.organizationService.assosiationTypes$;

    this.organization$ = this.organizationService.organizationSelected$
    .pipe(
      tap((data: IOrganization) => (this.org = data)),
      catchError((err) => {
        this.errorMessageSubject.next(err);
        return EMPTY;
      })
    );

    this.enabled$ = this.organizationService.enableOrganizationFormAction$.pipe(
      tap((enabled) => {
        if (enabled) {
          this.organizationForm.enable();
        } else {
          this.organizationForm.disable();
        }

        let formbuttons = document.getElementById('form-buttons');
        if (formbuttons) formbuttons.style.display = enabled ? 'block' : 'none';
      })
    );
  }

  clearForm() {
    this.organizationForm.reset();
  }

  onCancelClick() {
    this.disableForm();
    if (this.org.organizationId === 0) {
      this.clearForm();
    }
  }

  onSaveClick() {
    const newOrg: IOrganization = {
      organizationId: this.org ? this.org.organizationId : 0,
      name: this.organizationForm.value.name,
      activity: this.organizationForm.value.activity,
      taxRegistrationID: this.organizationForm.value.taxRegistrationID,
      taxRegistrationDescription: 'Regisdtro de Informacón Fiscal (RIF)',
      organizationType: this.organizationForm.value.organizationType,
      assosiationType: this.organizationForm.value.associationType,
      deactivated: this.organizationForm.value.deactivated ? 0 : 1,
      addedBy: 0,
      addedOn: new Date(this.organizationForm.value.addedOn),
      lastUpdatedBy: 0,
      lastUpdatedOn: new Date(),
      default: false, 
      addresses: [],
      phones: [],
      emails: [],
      currency: this.organizationForm.value.currency, 
      parentId: 0,
      logoData: '',
      logoName: '',
    };

    if (this.org) {
      this.organizationService.updateOrganization(newOrg);
    } else {
      this.organizationService.addOrganization(newOrg);
    }
    this.disableForm();
  }

  disableForm() {
    this.organizationService.enableOrganizationForm(false);
    this.organizationService.enableOrganizationGrid(false);
    this.applicationService.enableAddressChildGrid(false);
    this.applicationService.enableEmailChildGrid(false);
    this.applicationService.enablePhoneChildGrid(false);
  }
}
