import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
} from '@angular/core';
import { of } from 'rxjs';
import { map } from 'rxjs/operators';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MerchandiseService } from '../merchandise.service';

import { DropDownListComponent } from '@syncfusion/ej2-angular-dropdowns';
import {
  IMerchandise,
  IMerchandiseBrand,
  IMerchandiseCategory,
  IMerchandiseDivision,
  IMerchandiseType,
} from '../merchandise';
import { catchError, EMPTY, Observable, shareReplay, Subject, tap } from 'rxjs';
import { GroupTableComponent } from '@shared/components/group-table/group-table.component';
import { ApplicationService } from '@shared/services/applicattionService';
import { IGroup } from '@app/shared/models/group';

@Component({
  selector: 'llion-merchandise-detail',
  templateUrl: './merchandise-detail.html',
  styleUrls: ['./merchandise-detail.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class MerchandiseDetailComponent implements OnInit {
  // Brands
  @ViewChild('brandTable') brandTable!: GroupTableComponent;
  public brandsData: any[] = [];
  onBrandsChanged(updatedBrands: any[]): void {
    this.brandsData = [...updatedBrands];
  }
  openBrandsDialog(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    this.brandTable.showDialog();
  }

  // Groups
  @ViewChild('categoryTable') categoryTable?: GroupTableComponent;
  public categoriesData: any[] = [];
  onCategoriesChanged(updatedCategories: any[]): void {
    this.categoriesData = [...updatedCategories];
  }
  openCategoriesDialog(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    this.categoryTable?.showDialog();
  }

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

  merchandiseBrands$!: Observable<IGroup[]>;
  merchandiseCategories$!: Observable<IGroup[]>;
  merchandiseDivisions$!: Observable<IGroup[]>;
  merchandiseTypes$!: Observable<IGroup[]>;

  brandfields: Object = { text: 'description', value: 'groupId' };
  categoryfields: Object = { text: 'description', value: 'groupId' };
  divisionfields: Object = { text: 'description', value: 'groupId' };
  typefields: Object = { text: 'description', value: 'groupId' };

  merchandise!: IMerchandise;
  merchandise$!: Observable<IMerchandise>;
  enabled$!: Observable<boolean | null>;
  disabled$!: Observable<boolean | null>;

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
      merchandiseActive: [{ value: false, disabled: true }],
      merchandiseRegulated: [{ value: false, disabled: true }],
      merchandiseReturns: [{ value: false, disabled: true }],
      merchandiseAcceptRebates: [{ value: false, disabled: true }],
      merchandiseReturnsRate: [0],
      merchandiseStock: [0],
      merchandiseAvailableStock: [0],
    });

    this.merchandiseBrands$ = this.merchandiseService.merchandiseBrands$;
    this.merchandiseCategories$ =
      this.merchandiseService.merchandiseCategories$;
    this.merchandiseDivisions$ = this.merchandiseService.merchandiseDivisions$;
    this.merchandiseTypes$ = this.merchandiseService.merchandiseTypes$;

    this.merchandise$ = this.merchandiseService.merchandiseSelected$.pipe(
      tap((data: IMerchandise) => {
        const merchandise = Array.isArray(data) ? data[0] : data;
        this.merchandise = merchandise;

        if (merchandise) {
          this.merchandiseForm.patchValue({
            merchandiseName: merchandise.name,
            merchandiseAlternCode: merchandise.alternCode,
            merchandiseBrands: merchandise.brandId,
            merchandiseCategories: merchandise.groupId,
            merchandisePresentation: merchandise.description,
            merchandiseDivisions: merchandise.divisionId,
            merchandiseTypes: merchandise.typeId,
            merchandiseStock: merchandise.currentStock,
            merchandiseAvailableStock: merchandise.availableStock,
          });
        }
      }),
      catchError((err) => {
        this.errorMessageSubject.next(err);
        return EMPTY;
      }),
    );

    this.enabled$ = this.merchandiseService.enableMerchandiseFormAction$.pipe(
      tap((enabled) => {
        // Enable / Disable entire form
        enabled
          ? this.merchandiseForm.enable()
          : this.merchandiseForm.disable();

        const activeControl = this.merchandiseForm.get('merchandiseActive');
        enabled ? activeControl?.enable() : activeControl?.disable();

        const regulatedControl = this.merchandiseForm.get(
          'merchandiseRegulated',
        );
        enabled ? regulatedControl?.enable() : regulatedControl?.disable();

        const returnsControl = this.merchandiseForm.get('merchandiseReturns');
        enabled ? returnsControl?.enable() : returnsControl?.disable();

        const rebatesControl = this.merchandiseForm.get(
          'merchandiseAcceptRebates',
        );
        enabled ? rebatesControl?.enable() : rebatesControl?.disable();

        let formbuttons = document.getElementById('form-buttons');
        if (formbuttons) formbuttons.style.display = enabled ? 'block' : 'none';
      }),
    );

    this.disabled$ = this.enabled$.pipe(map((value) => !value));
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
      alternCode: this.merchandiseForm.value.merchandiseAlternCode,
      name: this.merchandiseForm.value.merchandiseName,
      description: this.merchandiseForm.value.merchandisePresentation,
      groupId: this.merchandiseForm.value.merchandiseCategories,
      brandId: this.merchandiseForm.value.merchandiseBrands,
      typeId: this.merchandiseForm.value.merchandiseTypes,
      divisionId: this.merchandiseForm.value.merchandiseDivisions,
      deactivated: this.merchandiseForm.value.merchandiseActive,
      acceptsReturns: this.merchandiseForm.value.merchandiseReturns,
      acceptsReturnsRate: this.merchandiseForm.value.merchandiseReturnsRate,
      currentStock: this.merchandiseForm.value.merchandiseStock ?? 0,
      availableStock: this.merchandiseForm.value.merchandiseAvailableStock ?? 0,
      marketShare: 0,
      regulated: this.merchandiseForm.value.merchandiseRegulated,
      acceptsRebate: this.merchandiseForm.value.merchandiseAcceptRebates,
      height: 0,
      width: 0,
      depth: 0,
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
