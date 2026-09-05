import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MerchandiseService } from '../merchandise.service';

import { DropDownListComponent } from '@syncfusion/ej2-angular-dropdowns';
import {
  IMerchandise,
} from '../merchandise';
import {
  catchError,
  map,
  Observable,
  of,
  Subject,
  takeUntil,
  tap,
} from 'rxjs';
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
export class MerchandiseDetailComponent implements OnInit, OnDestroy {
  /** true when catalog is servicios */
  isServiceCatalog = false;

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
  private readonly destroy$ = new Subject<void>();
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

  /** Service type options (not a DB lookup) */
  serviceTypes = [
    { value: 'Normal', text: 'Normal' },
    { value: 'ISLR', text: 'ISLR' },
  ];
  serviceTypeFields: Object = { text: 'text', value: 'value' };

  /** Service unit options stored on mer_merchandise.UnidadServicio */
  unidadServicioOptions = [
    { value: 'Hora', text: 'Hora' },
    { value: 'Unidad', text: 'Unidad' },
    { value: 'Día', text: 'Día' },
    { value: 'Mes', text: 'Mes' },
    { value: 'Servicio', text: 'Servicio' },
  ];
  unidadServicioFields: Object = { text: 'text', value: 'value' };

  merchandise!: IMerchandise;
  merchandise$!: Observable<IMerchandise>;
  enabled$!: Observable<boolean | null>;
  disabled$!: Observable<boolean | null>;

  constructor(
    private applicationService: ApplicationService,
    private formBuilder: FormBuilder,
    private merchandiseService: MerchandiseService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.isServiceCatalog = this.merchandiseService.isServiceCatalog;

    this.merchandiseForm = this.formBuilder.group({
      merchandiseName: ['', Validators.required],
      merchandiseBrands: [],
      merchandiseCategories: [],
      merchandiseDivisions: [],
      merchandiseTypes: [],
      merchandiseAlternCode: [],
      merchandisePresentation: [],
      merchandiseActive: [{ value: true, disabled: true }],
      merchandiseRegulated: [{ value: false, disabled: true }],
      merchandiseReturns: [{ value: false, disabled: true }],
      merchandiseAcceptRebates: [{ value: false, disabled: true }],
      merchandiseReturnsRate: [0],
      merchandiseStock: [0],
      merchandiseAvailableStock: [0],
      serviceType: ['Normal'],
      unidadServicio: ['Unidad'],
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
        if (!merchandise || !this.merchandiseForm) {
          return;
        }
        this.merchandiseForm.reset({
          merchandiseName: merchandise.name ?? '',
          merchandiseAlternCode: merchandise.alternCode ?? '',
          merchandiseBrands: merchandise.brandId ?? null,
          merchandiseCategories: merchandise.groupId ?? null,
          merchandisePresentation: merchandise.description ?? '',
          merchandiseDivisions: merchandise.divisionId ?? null,
          merchandiseTypes: merchandise.typeId ?? null,
          // Activo = opposite of Deactivated
          merchandiseActive: !this.asBool(merchandise.deactivated),
          merchandiseRegulated: this.asBool(merchandise.regulated),
          merchandiseReturns: this.asBool(merchandise.acceptsReturns),
          merchandiseAcceptRebates: this.asBool(merchandise.acceptsRebate),
          merchandiseReturnsRate: merchandise.acceptsReturnsRate ?? 0,
          merchandiseStock: merchandise.currentStock ?? 0,
          merchandiseAvailableStock: merchandise.availableStock ?? 0,
          serviceType: this.normalizeServiceType(merchandise.serviceType),
          unidadServicio: merchandise.unidadServicio || 'Unidad',
        });
        this.cdr.markForCheck();
      }),
      catchError((err) => {
        this.errorMessageSubject.next(err);
        return of(this.merchandiseService.emptyMerchandise);
      }),
    );
    this.merchandise$.pipe(takeUntil(this.destroy$)).subscribe();

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
      }),
    );

    this.disabled$ = this.enabled$.pipe(map((value) => !value));

    this.merchandiseService.merchandiseFormAction$
      .pipe(takeUntil(this.destroy$))
      .subscribe((action) => {
        if (action === 'save') {
          this.saveForm();
          return;
        }
        this.cancelForm();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cancelForm(): void {
    this.disableForm();
  }

  private saveForm(): void {
    if (!this.merchandiseForm.valid) {
      this.merchandiseForm.markAllAsTouched();
      return;
    }

    const formValue = this.merchandiseForm.getRawValue();
    const merchandiseToSave: IMerchandise = {
      ...this.merchandise,
      merchandiseId: this.merchandise?.merchandiseId ?? 0,
      alternCode: formValue.merchandiseAlternCode ?? '',
      name: formValue.merchandiseName ?? '',
      description: formValue.merchandisePresentation ?? '',
      groupId: formValue.merchandiseCategories ?? 0,
      brandId: formValue.merchandiseBrands ?? 0,
      typeId: formValue.merchandiseTypes ?? 0,
      divisionId: formValue.merchandiseDivisions ?? 0,
      deactivated: !this.asBool(formValue.merchandiseActive),
      acceptsReturns: this.asBool(formValue.merchandiseReturns),
      acceptsReturnsRate: formValue.merchandiseReturnsRate ?? 0,
      currentStock: formValue.merchandiseStock ?? 0,
      availableStock: formValue.merchandiseAvailableStock ?? 0,
      marketShare: this.merchandise?.marketShare ?? 0,
      regulated: this.asBool(formValue.merchandiseRegulated),
      acceptsRebate: this.asBool(formValue.merchandiseAcceptRebates),
      height: this.merchandise?.height ?? 0,
      width: this.merchandise?.width ?? 0,
      depth: this.merchandise?.depth ?? 0,
      accountId: this.merchandise?.accountId ?? 0,
      classId: this.merchandise?.classId ?? 0,
      parentId: this.merchandise?.parentId ?? 0,
      organizationId:
        this.merchandise?.organizationId ||
        this.merchandiseService.currentOrganizationId,
      service: this.merchandiseService.isServiceCatalog,
      serviceType: this.merchandiseService.isServiceCatalog
        ? formValue.serviceType || 'Normal'
        : this.merchandise?.serviceType ?? null,
      unidadServicio: this.merchandiseService.isServiceCatalog
        ? formValue.unidadServicio || null
        : this.merchandise?.unidadServicio ?? null,
    };

    if (merchandiseToSave.merchandiseId > 0) {
      this.merchandiseService.updateMerchandise(merchandiseToSave);
    } else {
      this.merchandiseService.addMerchandise(merchandiseToSave);
    }

    this.disableForm();
  }

  clearForm() {
    this.merchandiseForm.reset();
  }

  disableForm() {
    this.merchandiseService.enableMerchandiseForm(false);
    // NOTE: In the grid component, `true` adds the `disablegrid` class.
    // So passing `false` here re-enables the grid UI.
    this.merchandiseService.enableMerchandiseGrid(false);
    this.applicationService.enableAddressChildGrid(false);
    this.applicationService.enableEmailChildGrid(false);
    this.applicationService.enablePhoneChildGrid(false);
  }

  /** Normalize API/form flags (BIT, 0/1, boolean). */
  private asBool(value: unknown): boolean {
    return value === true || value === 1 || value === '1';
  }

  /** DB may store NORMAL/ISLR; dropdown values are Normal/ISLR. */
  private normalizeServiceType(value: string | null | undefined): string {
    const normalized = String(value ?? '')
      .trim()
      .toUpperCase();
    return normalized === 'ISLR' ? 'ISLR' : 'Normal';
  }
}
