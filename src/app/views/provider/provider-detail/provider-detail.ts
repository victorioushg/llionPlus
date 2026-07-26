import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EMPTY, Observable, Subject, catchError, tap } from 'rxjs';
import { ProviderService } from '../provider.service';
import { IProvider } from '../provider';
import { ApplicationService } from '@shared/services/applicattionService';

@Component({
  selector: 'llion-provider-detail',
  templateUrl: './provider-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ProviderDetailComponent implements OnInit {
  private readonly errorMessageSubject = new Subject<string>();
  errorMessage$ = this.errorMessageSubject.asObservable();

  providerForm!: FormGroup;
  provider!: IProvider;
  provider$!: Observable<IProvider>;
  enabled$!: Observable<boolean>;

  constructor(
    private formBuilder: FormBuilder,
    private providerService: ProviderService,
    private applicationService: ApplicationService
  ) {}

  ngOnInit(): void {
    this.providerForm = this.formBuilder.group({
      description: ['', Validators.required],
      alternCode: [''],
      taxRegistrationID: ['', Validators.required],
      taxRegistrationID2: [''],
      providerAssignedCode: [''],
      debitLimit: [null],
      debitAvailable: [null],
      deactivated: [true],
      comment: [''],
      createdON: [new Date()],
    });

    this.provider$ = this.providerService.providerSelected$.pipe(
      tap((data: IProvider) => {
        this.provider = data;
        this.providerForm.patchValue({
          description: data.description,
          alternCode: data.alternCode,
          taxRegistrationID: data.taxRegistrationID,
          taxRegistrationID2: data.taxRegistrationID2,
          providerAssignedCode: data.providerAssignedCode,
          debitLimit: data.debitLimit,
          debitAvailable: data.debitAvailable,
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

    this.enabled$ = this.providerService.enableProviderFormAction$.pipe(
      tap((enabled) => {
        if (enabled) {
          this.providerForm.enable();
        } else {
          this.providerForm.disable();
        }
        const formButtons = document.getElementById('provider-form-buttons');
        if (formButtons) {
          formButtons.style.display = enabled ? 'block' : 'none';
        }
      })
    );
  }

  onCancelClick(): void {
    this.disableForm();
    if (!this.provider?.providerId) {
      this.providerForm.reset({
        deactivated: true,
        createdON: new Date(),
      });
    }
  }

  onSaveClick(): void {
    if (this.providerForm.invalid) {
      this.providerForm.markAllAsTouched();
      return;
    }

    const organizationId =
      this.provider?.organizationId ||
      this.applicationService.workingOrganization?.organizationId ||
      0;

    if (organizationId <= 0) {
      return;
    }

    const payload: IProvider = {
      providerId: this.provider?.providerId ?? 0,
      description: this.providerForm.value.description,
      alternCode: this.providerForm.value.alternCode,
      taxRegistrationID: this.providerForm.value.taxRegistrationID,
      taxRegistrationID2: this.providerForm.value.taxRegistrationID2,
      providerAssignedCode: this.providerForm.value.providerAssignedCode,
      debitLimit: this.providerForm.value.debitLimit,
      debitAvailable: this.providerForm.value.debitAvailable,
      deactivated: !this.providerForm.value.deactivated,
      comment: this.providerForm.value.comment,
      createdON: this.providerForm.value.createdON,
      organizationId,
    };

    if (payload.providerId > 0) {
      this.providerService.updateProvider(payload);
    } else {
      this.providerService.addProvider(payload);
    }
    this.disableForm();
  }

  private disableForm(): void {
    this.providerService.enableProviderForm(false);
    this.providerService.enableProviderGrid(false);
  }
}
