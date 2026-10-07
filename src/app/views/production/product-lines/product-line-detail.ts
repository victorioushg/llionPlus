import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EMPTY, Observable, catchError, tap } from 'rxjs';
import { ApplicationService } from '@shared/services/applicattionService';
import { ProductionService } from '../production.service';
import { IProductLine, LINE_KIND_OPTIONS } from '../production';

@Component({
  selector: 'llion-product-line-detail',
  templateUrl: './product-line-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ProductLineDetailComponent implements OnInit {
  lineForm!: FormGroup;
  productLine!: IProductLine;
  productLine$!: Observable<IProductLine>;
  enabled$!: Observable<boolean>;
  lineKindOptions = LINE_KIND_OPTIONS;
  dropdownFields = { text: 'text', value: 'value' };

  constructor(
    private formBuilder: FormBuilder,
    private productionService: ProductionService,
    private applicationService: ApplicationService
  ) {}

  ngOnInit(): void {
    this.lineForm = this.formBuilder.group({
      description: ['', Validators.required],
      lineCode: [''],
      lineKind: [0],
      deactivated: [true],
    });

    this.productLine$ = this.productionService.productLineSelected$.pipe(
      tap((data) => {
        this.productLine = data;
        this.lineForm.patchValue({
          description: data.description,
          lineCode: data.lineCode,
          lineKind: data.lineKind ?? 0,
          deactivated: !data.deactivated,
        });
      }),
      catchError(() => EMPTY)
    );

    this.enabled$ = this.productionService.enableLineForm$.pipe(
      tap((enabled) => {
        if (enabled) {
          this.lineForm.enable();
        } else {
          this.lineForm.disable();
        }
        const buttons = document.getElementById('product-line-form-buttons');
        if (buttons) {
          buttons.style.display = enabled ? 'block' : 'none';
        }
      })
    );
  }

  onCancelClick(): void {
    this.productionService.enableLineForm(false);
    if (!this.productLine?.productLineId) {
      this.lineForm.reset({ lineKind: 0, deactivated: true });
    }
  }

  onSaveClick(): void {
    if (this.lineForm.invalid) {
      this.lineForm.markAllAsTouched();
      return;
    }
    const organizationId =
      this.productLine?.organizationId ||
      this.applicationService.workingOrganization?.organizationId ||
      0;
    if (organizationId <= 0) {
      return;
    }
    const payload: IProductLine = {
      productLineId: this.productLine?.productLineId ?? 0,
      lineCode: this.lineForm.value.lineCode,
      description: this.lineForm.value.description,
      lineKind: this.lineForm.value.lineKind ?? 0,
      deactivated: !this.lineForm.value.deactivated,
      organizationId,
    };
    this.productionService.saveProductLine(payload);
    this.productionService.enableLineForm(false);
  }
}
