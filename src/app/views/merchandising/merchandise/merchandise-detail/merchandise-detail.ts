import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MerchandiseService } from '../merchandise.service';

import { DropDownListComponent } from '@syncfusion/ej2-angular-dropdowns';
import {
  IMerchandise,
  IMerchandiseBrand,
  IMerchandiseCategory,
} from '../merchandise';
import { catchError, EMPTY, Observable, Subject, tap } from 'rxjs';
import { ApplicationService } from '@shared/services/applicattionService';

@Component({
  selector: 'llion-merchandise-detail',
  templateUrl: './merchandise-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class MerchandiseDetailComponent implements OnInit {
  private errorMessageSubject = new Subject<string>();
  merchandiseForm!: FormGroup;

  errorMessage$ = this.errorMessageSubject.asObservable();

  @ViewChild('otypes')
  listOTypes: DropDownListComponent | undefined;

  @ViewChild('atypes')
  listATypes: DropDownListComponent | undefined;

  merchandiseBrands$!: Observable<IMerchandiseBrand[]>;
  merchandiseCategories$!: Observable<IMerchandiseCategory[]>;

  brandfields: Object = { text: 'description', value: 'groupCode' };
  brandvalue: string | undefined;

  categoryfields: Object = { text: 'description', value: 'groupCode' };
  categoryvalue: string | undefined;

  org: any;

  merchandise$!: Observable<IMerchandise>;

  enabled$!: Observable<boolean>;

  constructor(
    private applicationService: ApplicationService,
    private formBuilder: FormBuilder,
    private merchandiseService: MerchandiseService
  ) {}

  ngOnInit() {
    this.merchandiseForm = this.formBuilder.group({
      name: ['', Validators.required],
      taxRegistrationID: ['', Validators.required],
      activity: [],
      merchandiseType: [],
      associationType: [],
      deactivated: [true],
      addedOn: [new Date()],
    });

    this.merchandiseBrands$ = this.merchandiseService.merchandiseBrands$;

    this.merchandiseCategories$ = this.merchandiseService.merchandiseCategories$;

    this.merchandise$ = this.merchandiseService.merchandiseSelected$.pipe(
      tap((data: IMerchandise) => (this.org = data)),
      catchError((err) => {
        this.errorMessageSubject.next(err);
        return EMPTY;
      })
    );

    this.enabled$ = this.merchandiseService.enableMerchandiseFormAction$.pipe(
      tap((enabled) => {
        if (enabled) {
          this.merchandiseForm.enable();
        } else {
          this.merchandiseForm.disable();
        }

        let formbuttons = document.getElementById('form-buttons');
        if (formbuttons) formbuttons.style.display = enabled ? 'block' : 'none';
      })
    );
  }

  clearForm() {
    this.merchandiseForm.reset();
  }

  onCancelClick() {
    this.disableForm();
    if (this.org.id === 0) {
      this.clearForm();
    }
  }

  onSaveClick() {
    const newOrg: IMerchandise = {
      merchandiseEntityId: 0,
      description: '',
      brand: '',
      category: '',
      hierarchyId: 0,
      presentation: '',
      deactivated: false,
      merchandiseType: '',
      discuount: 0,
      salesQuota: 0,
      refund: 0,
      refundRate: 0,
      mix: 0,
      accountCode: 0,
      accountName: '',
      classCode: 0,
      className: '',
      addedOn: new Date(),
      addedBy: '',
      lastModifiedOn: new Date(),
      lastModifiedBy: '',
      organizationId: 0,
      parentId: 0
    };

    if (this.org) {
      this.merchandiseService.updateMerchandise(newOrg);
    } else {
      this.merchandiseService.addMerchandise(newOrg);
    }
    this.disableForm();
  }

  disableForm() {
    this.merchandiseService.enableMerchandiseForm(false);
    this.merchandiseService.enableMerchandiseGrid(false);
    this.applicationService.enableAddressChildGrid(false);
    this.applicationService.enableEmailChildGrid(false);
    this.applicationService.enablePhoneChildGrid(false);
  }
}
