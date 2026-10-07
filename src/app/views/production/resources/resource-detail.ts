import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EMPTY, Observable, catchError, tap } from 'rxjs';
import { ApplicationService } from '@shared/services/applicattionService';
import { ProductionService } from '../production.service';
import {
  IProductLine,
  IProductionResource,
  RESOURCE_TYPE_OPTIONS,
} from '../production';

@Component({
  selector: 'llion-resource-detail',
  templateUrl: './resource-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ResourceDetailComponent implements OnInit {
  resourceForm!: FormGroup;
  resource!: IProductionResource;
  resource$!: Observable<IProductionResource>;
  enabled$!: Observable<boolean>;
  productLines$!: Observable<IProductLine[]>;
  resourceTypeOptions = RESOURCE_TYPE_OPTIONS;
  dropdownFields = { text: 'text', value: 'value' };
  lineFields = { text: 'description', value: 'productLineId' };

  constructor(
    private formBuilder: FormBuilder,
    private productionService: ProductionService,
    private applicationService: ApplicationService
  ) {}

  ngOnInit(): void {
    this.resourceForm = this.formBuilder.group({
      name: ['', Validators.required],
      resourceCode: [''],
      resourceType: [1],
      productLineId: [null],
      uom: ['HR'],
      unitCost: [0],
      availableHours: [0],
      deactivated: [true],
    });

    this.productLines$ = this.productionService.productLines$;

    this.resource$ = this.productionService.resourceSelected$.pipe(
      tap((data) => {
        this.resource = data;
        this.resourceForm.patchValue({
          name: data.name,
          resourceCode: data.resourceCode,
          resourceType: data.resourceType ?? 1,
          productLineId: data.productLineId || null,
          uom: data.uom || 'HR',
          unitCost: data.unitCost ?? 0,
          availableHours: data.availableHours ?? 0,
          deactivated: !data.deactivated,
        });
      }),
      catchError(() => EMPTY)
    );

    this.enabled$ = this.productionService.enableResourceForm$.pipe(
      tap((enabled) => {
        if (enabled) {
          this.resourceForm.enable();
        } else {
          this.resourceForm.disable();
        }
        const buttons = document.getElementById('resource-form-buttons');
        if (buttons) {
          buttons.style.display = enabled ? 'block' : 'none';
        }
      })
    );
  }

  onCancelClick(): void {
    this.productionService.enableResourceForm(false);
    if (!this.resource?.resourceId) {
      this.resourceForm.reset({
        resourceType: 1,
        uom: 'HR',
        unitCost: 0,
        availableHours: 0,
        deactivated: true,
      });
    }
  }

  onSaveClick(): void {
    if (this.resourceForm.invalid) {
      this.resourceForm.markAllAsTouched();
      return;
    }
    const organizationId =
      this.resource?.organizationId ||
      this.applicationService.workingOrganization?.organizationId ||
      0;
    if (organizationId <= 0) {
      return;
    }
    const payload: IProductionResource = {
      resourceId: this.resource?.resourceId ?? 0,
      resourceCode: this.resourceForm.value.resourceCode,
      name: this.resourceForm.value.name,
      resourceType: this.resourceForm.value.resourceType ?? 1,
      productLineId: this.resourceForm.value.productLineId || null,
      uom: this.resourceForm.value.uom || 'HR',
      unitCost: Number(this.resourceForm.value.unitCost) || 0,
      availableHours: Number(this.resourceForm.value.availableHours) || 0,
      deactivated: !this.resourceForm.value.deactivated,
      organizationId,
    };
    this.productionService.saveResource(payload);
    this.productionService.enableResourceForm(false);
  }
}
