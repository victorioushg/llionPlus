import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EMPTY, Observable, Subject, catchError, tap } from 'rxjs';
import { CustomerService } from '../customer.service';
import { ICustomer } from '../customer';
import { ApplicationService } from '@shared/services/applicattionService';

@Component({
  selector: 'llion-customer-detail',
  templateUrl: './customer-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class CustomerDetailComponent implements OnInit {
  private readonly errorMessageSubject = new Subject<string>();
  errorMessage$ = this.errorMessageSubject.asObservable();

  customerForm!: FormGroup;
  customer!: ICustomer;
  customer$!: Observable<ICustomer>;
  enabled$!: Observable<boolean>;

  constructor(
    private formBuilder: FormBuilder,
    private customerService: CustomerService,
    private applicationService: ApplicationService
  ) {}

  ngOnInit(): void {
    this.customerForm = this.formBuilder.group({
      description: ['', Validators.required],
      alternCode: [''],
      taxRegistrationID: ['', Validators.required],
      taxRegistrationID2: [''],
      creditLimit: [null],
      creditAvailable: [null],
      deactivated: [true],
      comment: [''],
      createdON: [new Date()],
    });

    this.customer$ = this.customerService.customerSelected$.pipe(
      tap((data: ICustomer) => {
        this.customer = data;
        this.customerForm.patchValue({
          description: data.description,
          alternCode: data.alternCode,
          taxRegistrationID: data.taxRegistrationID,
          taxRegistrationID2: data.taxRegistrationID2,
          creditLimit: data.creditLimit,
          creditAvailable: data.creditAvailable,
          deactivated: !data.deactivated,
          comment: data.comment,
          createdON: data.createdON ? new Date(data.createdON) : new Date(),
        });
      }),
      catchError((err) => {
        this.errorMessageSubject.next(err);
        return EMPTY;
      })
    );

    this.enabled$ = this.customerService.enableCustomerFormAction$.pipe(
      tap((enabled) => {
        if (enabled) {
          this.customerForm.enable();
        } else {
          this.customerForm.disable();
        }
        const formButtons = document.getElementById('customer-form-buttons');
        if (formButtons) {
          formButtons.style.display = enabled ? 'block' : 'none';
        }
      })
    );
  }

  onCancelClick(): void {
    this.disableForm();
    if (!this.customer?.customerId) {
      this.customerForm.reset({
        deactivated: true,
        createdON: new Date(),
      });
    }
  }

  onSaveClick(): void {
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      return;
    }

    const organizationId =
      this.customer?.organizationId ||
      this.applicationService.workingOrganization?.organizationId ||
      0;

    if (organizationId <= 0) {
      return;
    }

    const payload: ICustomer = {
      customerId: this.customer?.customerId ?? 0,
      description: this.customerForm.value.description,
      alternCode: this.customerForm.value.alternCode,
      taxRegistrationID: this.customerForm.value.taxRegistrationID,
      taxRegistrationID2: this.customerForm.value.taxRegistrationID2,
      creditLimit: this.customerForm.value.creditLimit,
      creditAvailable: this.customerForm.value.creditAvailable,
      deactivated: !this.customerForm.value.deactivated,
      comment: this.customerForm.value.comment,
      createdON: this.customerForm.value.createdON,
      organizationId,
    };

    if (payload.customerId > 0) {
      this.customerService.updateCustomer(payload);
    } else {
      this.customerService.addCustomer(payload);
    }
    this.disableForm();
  }

  private disableForm(): void {
    this.customerService.enableCustomerForm(false);
    this.customerService.enableCustomerGrid(false);
  }
}
