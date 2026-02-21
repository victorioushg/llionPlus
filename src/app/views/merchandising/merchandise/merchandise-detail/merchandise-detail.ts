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
  IMerchandiseDivision,
  IMerchandiseType
} from '../merchandise';
import { catchError, EMPTY, Observable, shareReplay, Subject, tap } from 'rxjs';
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

  @ViewChild('brands')
  listBrands: DropDownListComponent | undefined;

  @ViewChild('categories')
  listCategories: DropDownListComponent | undefined;

  @ViewChild('divisions')
  listDivisions: DropDownListComponent | undefined;

  @ViewChild('types')
  listTypes: DropDownListComponent | undefined;

  merchandiseBrands$!: Observable<IMerchandiseBrand[]>;
  merchandiseCategories$!: Observable<IMerchandiseCategory[]>;
  merchandiseDivisions$!: Observable<IMerchandiseDivision[]>;
  merchandiseTypes$!: Observable<IMerchandiseType[]>;

  brandfields: Object = { text: 'brandDescription', value: 'brandId' };
  categoryfields: Object = { text: 'categoryDescription', value: 'categoryId' };
  divisionfields: Object = { text: 'divisionDescription', value: 'divisionId' };
  typefields: Object = { text: 'typeDescription', value: 'typeId' };

  merchandise!: IMerchandise;
  merchandise$!: Observable<IMerchandise>;
  enabled$!: Observable<boolean>;

  constructor(
    private applicationService: ApplicationService,
    private formBuilder: FormBuilder,
    private merchandiseService: MerchandiseService,
  ) {}

  ngOnInit() {
    this.merchandiseForm = this.formBuilder.group({
      merchandiseName: ['', Validators.required],
      merchandiseBrands: [],
      merchandiseCategories: [],
      merchandiseDivisions: [],
      merchandiseTypes: [],
      merchandiseAlternCode: [],
      merchandisePresentation: [],
    });

    this.merchandiseBrands$ = this.merchandiseService.merchandiseBrands$;
    this.merchandiseCategories$ = this.merchandiseService.merchandiseCategories$;
    this.merchandiseDivisions$ = this.merchandiseService.merchandiseDivisions$;
    this.merchandiseTypes$ = this.merchandiseService.merchandiseTypes$;

    this.merchandise$ = this.merchandiseService.merchandiseSelected$.pipe(
      tap((data: IMerchandise) => {
        const merchandise = Array.isArray(data) ? data[0] : data;
        console.log('Merchandise received:', merchandise);
        if (merchandise) {
          this.merchandiseForm.patchValue({
            merchandiseName: merchandise.name,
            merchandiseAlternCode: merchandise.alternCode,
            merchandiseBrands: merchandise.brandId,
            merchandiseCategories: merchandise.groupId,
            merchandisePresentation: merchandise.description,
            merchandiseDivisions: merchandise.divisionId,
            merchandiseTypes: merchandise.typeId,
          });
        }
        // this.merchandise = data;
      }),
      catchError((err) => {
        this.errorMessageSubject.next(err);
        return EMPTY;
      }),
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
      }),
    );
  }

  clearForm() {
    this.merchandiseForm.reset();
  }

  onCancelClick() {
    this.disableForm();
    if (this.merchandise.merchandiseId === 0) {
      this.clearForm();
    }
  }

  onSaveClick() {
    const newOrg: IMerchandise = {
      merchandiseId: this.merchandise ? this.merchandise.merchandiseId : 0,
      alternCode: this.merchandiseForm.value.alternCode,
      name: this.merchandiseForm.value.merchandiseName,
      description: this.merchandiseForm.value.description,
      groupId: this.merchandiseForm.value.merchandiseCategories,
      brandId: this.merchandiseForm.value.merchandiseBrands,
      typeId: this.merchandiseForm.value.merchandiseTypes,
      divisionId: this.merchandiseForm.value.merchandise.divisions,
      deactivated: false,
      acceptsReturns: false,
      acceptsReturnsRate: 0.0,
      currentStock: 0.0,
      availableStock: 0.0,
      marketShare: 0,
      regulated: false,
      AcceptsRebate: false,
      height: 0.0,
      width: 0.0,
      depth: 0.0,
      createdOn: new Date(),
      createddBy: '',
      LastModifiedOn: new Date(),
      accountId: 0,
      classId: 0,
      parentId: 0,
      organizationId: 0,
    };

    if (this.merchandise) {
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
