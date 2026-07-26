import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EMPTY, Observable, Subject, catchError, tap } from 'rxjs';
import { EmployeeService } from '../employee.service';
import { IEmployee } from '../employee';
import { ApplicationService } from '@shared/services/applicattionService';

@Component({
  selector: 'llion-employee-detail',
  templateUrl: './employee-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class EmployeeDetailComponent implements OnInit {
  private readonly errorMessageSubject = new Subject<string>();
  errorMessage$ = this.errorMessageSubject.asObservable();

  employeeForm!: FormGroup;
  employee!: IEmployee;
  employee$!: Observable<IEmployee>;
  enabled$!: Observable<boolean>;

  genderOptions = [
    { text: 'Masculino', value: '0' },
    { text: 'Femenino', value: '1' },
  ];
  maritalStatusOptions = [
    { text: 'Soltero(a)', value: 0 },
    { text: 'Casado(a)', value: 1 },
    { text: 'Divorciado(a)', value: 2 },
    { text: 'Viudo(a)', value: 3 },
    { text: 'Unión libre', value: 4 },
  ];
  paymentTypeOptions = [
    { text: 'Efectivo', value: 0 },
    { text: 'Cheque', value: 1 },
    { text: 'Cuenta bancaria', value: 2 },
    { text: 'Transferencia', value: 3 },
  ];
  payrollTypeOptions = [
    { text: 'Diaria', value: 0 },
    { text: 'Semanal', value: 1 },
    { text: 'Quincenal', value: 2 },
    { text: 'Mensual', value: 3 },
    { text: 'Anual', value: 4 },
    { text: 'Única', value: -1 },
  ];
  statusOptions = [
    { text: 'Activo', value: 1 },
    { text: 'Inactivo', value: 0 },
    { text: 'Permiso', value: 2 },
    { text: 'Vacaciones', value: 3 },
  ];

  dropdownFields: Object = { text: 'text', value: 'value' };

  constructor(
    private formBuilder: FormBuilder,
    private employeeService: EmployeeService,
    private applicationService: ApplicationService
  ) {}

  ngOnInit(): void {
    this.employeeForm = this.formBuilder.group({
      lastName: ['', Validators.required],
      firstName: ['', Validators.required],
      alternCode: [''],
      identificationNumber: [''],
      socialSecurityNumber: [''],
      gender: [null],
      maritalStatus: [null],
      dateOfBirth: [null],
      profession: [''],
      status: [1],
      paymentType: [null],
      paymentAmount: [null],
      payrollType: [null],
      bank: [''],
      banckAccount: [''],
      createdOn: [new Date()],
      deactivated: [true],
    });

    this.employee$ = this.employeeService.employeeSelected$.pipe(
      tap((data: IEmployee) => {
        this.employee = data;
        this.employeeForm.patchValue({
          lastName: data.lastName,
          firstName: data.firstName,
          alternCode: data.alternCode,
          identificationNumber: data.identificationNumber,
          socialSecurityNumber: data.socialSecurityNumber,
          gender: data.gender != null ? String(data.gender) : null,
          maritalStatus: data.maritalStatus,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          profession: data.profession,
          status: data.status ?? 1,
          paymentType: data.paymentType,
          paymentAmount: data.paymentAmount,
          payrollType: data.payrollType,
          bank: data.bank,
          banckAccount: data.banckAccount,
          createdOn: data.createdOn ? new Date(data.createdOn) : new Date(),
          deactivated: !data.deactivated,
        });
      }),
      catchError((err) => {
        this.errorMessageSubject.next(err);
        return EMPTY;
      })
    );

    this.enabled$ = this.employeeService.enableEmployeeFormAction$.pipe(
      tap((enabled) => {
        if (enabled) {
          this.employeeForm.enable();
        } else {
          this.employeeForm.disable();
        }
        const formButtons = document.getElementById('employee-form-buttons');
        if (formButtons) {
          formButtons.style.display = enabled ? 'block' : 'none';
        }
      })
    );
  }

  onCancelClick(): void {
    this.disableForm();
    if (!this.employee?.employeeId) {
      this.employeeForm.reset({
        status: 1,
        deactivated: true,
        createdOn: new Date(),
      });
    }
  }

  onSaveClick(): void {
    if (this.employeeForm.invalid) {
      this.employeeForm.markAllAsTouched();
      return;
    }

    const organizationId =
      this.employee?.organizationId ||
      this.applicationService.workingOrganization?.organizationId ||
      0;

    if (organizationId <= 0) {
      return;
    }

    const payload: IEmployee = {
      employeeId: this.employee?.employeeId ?? 0,
      lastName: this.employeeForm.value.lastName,
      firstName: this.employeeForm.value.firstName,
      alternCode: this.employeeForm.value.alternCode,
      identificationNumber: this.employeeForm.value.identificationNumber,
      socialSecurityNumber: this.employeeForm.value.socialSecurityNumber,
      gender: this.employeeForm.value.gender,
      maritalStatus: this.employeeForm.value.maritalStatus,
      dateOfBirth: this.employeeForm.value.dateOfBirth,
      profession: this.employeeForm.value.profession,
      status: this.employeeForm.value.status ?? 1,
      paymentType: this.employeeForm.value.paymentType,
      paymentAmount: this.employeeForm.value.paymentAmount,
      payrollType: this.employeeForm.value.payrollType,
      bank: this.employeeForm.value.bank,
      banckAccount: this.employeeForm.value.banckAccount,
      createdOn: this.employeeForm.value.createdOn,
      deactivated: !this.employeeForm.value.deactivated,
      jobId: this.employee?.jobId ?? null,
      classId: this.employee?.classId ?? null,
      accountId: this.employee?.accountId ?? null,
      organizationId,
    };

    if (payload.employeeId > 0) {
      this.employeeService.updateEmployee(payload);
    } else {
      this.employeeService.addEmployee(payload);
    }
    this.disableForm();
  }

  private disableForm(): void {
    this.employeeService.enableEmployeeForm(false);
    this.employeeService.enableEmployeeGrid(false);
  }
}
