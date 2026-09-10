import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EMPTY, Observable, Subject, catchError, tap } from 'rxjs';
import { ProviderService } from '../provider.service';
import { IPaymentTerm, IProvider } from '../provider';
import { ApplicationService } from '@shared/services/applicattionService';

@Component({
  selector: 'llion-provider-detail',
  templateUrl: './provider-detail.html',
  styleUrls: ['./provider-detail.scss'],
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
  terms$!: Observable<IPaymentTerm[]>;
  termFields = { text: 'termsDescription', value: 'termsId' };
  termFilterType: 'Contains' = 'Contains';
  private savingNew = false;

  constructor(
    private formBuilder: FormBuilder,
    private providerService: ProviderService,
    private applicationService: ApplicationService,
    private cdr: ChangeDetectorRef
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
      termsId: [null],
      createdON: [new Date()],
    });

    this.provider$ = this.providerService.providerSelected$.pipe(
      tap((data: IProvider) => {
        const incomingId = Number(data?.providerId) || 0;
        if (incomingId <= 0 && this.savingNew) {
          this.cdr.markForCheck();
          return;
        }

        this.savingNew = false;
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
          termsId: data.termsId || null,
          createdON: data.createdON ? new Date(data.createdON) : new Date(),
        });
        this.cdr.markForCheck();
      }),
      catchError((err) => {
        this.errorMessageSubject.next(err);
        return EMPTY;
      })
    );

    this.terms$ = this.providerService.terms$;

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
        termsId: null,
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

    const form = this.providerForm.getRawValue();
    const rawTermsId = form.termsId;
    const termsId =
      rawTermsId == null || rawTermsId === '' || Number(rawTermsId) <= 0
        ? null
        : Number(rawTermsId);

    const payload: IProvider = {
      providerId: this.provider?.providerId ?? 0,
      description: form.description,
      alternCode: form.alternCode,
      taxRegistrationID: form.taxRegistrationID,
      taxRegistrationID2: form.taxRegistrationID2,
      providerAssignedCode: form.providerAssignedCode,
      debitLimit: form.debitLimit,
      debitAvailable: form.debitAvailable,
      termsId,
      deactivated: !form.deactivated,
      comment: form.comment,
      createdON: form.createdON,
      organizationId,
    };

    this.savingNew = payload.providerId <= 0;
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
