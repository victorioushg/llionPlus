import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EMPTY, Observable, Subject, catchError, tap } from 'rxjs';
import { AccountsService } from '../accounts.service';
import { IAccount } from '../account';
import { ApplicationService } from '@shared/services/applicattionService';

@Component({
  selector: 'llion-account-detail',
  templateUrl: './account-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AccountDetailComponent implements OnInit {
  private readonly errorMessageSubject = new Subject<string>();
  errorMessage$ = this.errorMessageSubject.asObservable();

  accountForm!: FormGroup;
  account!: IAccount;
  account$!: Observable<IAccount>;
  enabled$!: Observable<boolean>;

  constructor(
    private formBuilder: FormBuilder,
    private accountsService: AccountsService,
    private applicationService: ApplicationService
  ) {}

  ngOnInit(): void {
    this.accountForm = this.formBuilder.group({
      code: ['', Validators.required],
      description: ['', Validators.required],
      level: [null],
      mark: [false],
    });

    this.account$ = this.accountsService.accountSelected$.pipe(
      tap((data: IAccount) => {
        this.account = data;
        this.accountForm.patchValue({
          code: data.code,
          description: data.description,
          level: data.level,
          mark: !!data.mark,
        });
      }),
      catchError((err) => {
        this.errorMessageSubject.next(err);
        return EMPTY;
      })
    );

    this.enabled$ = this.accountsService.enableAccountFormAction$.pipe(
      tap((enabled) => {
        if (enabled) {
          this.accountForm.enable();
        } else {
          this.accountForm.disable();
        }
        const formButtons = document.getElementById('account-form-buttons');
        if (formButtons) {
          formButtons.style.display = enabled ? 'block' : 'none';
        }
      })
    );
  }

  onCancelClick(): void {
    this.disableForm();
    if (!this.account?.accountId) {
      this.accountForm.reset({ mark: false });
    }
  }

  onSaveClick(): void {
    if (this.accountForm.invalid) {
      this.accountForm.markAllAsTouched();
      return;
    }

    const organizationId =
      this.account?.organizationId ||
      this.applicationService.workingOrganization?.organizationId ||
      0;

    if (organizationId <= 0) {
      return;
    }

    const payload: IAccount = {
      accountId: this.account?.accountId ?? 0,
      code: this.accountForm.value.code,
      description: this.accountForm.value.description,
      level: this.accountForm.value.level,
      mark: !!this.accountForm.value.mark,
      organizationId,
    };

    if (payload.accountId > 0) {
      this.accountsService.updateAccount(payload);
    } else {
      this.accountsService.addAccount(payload);
    }
    this.disableForm();
  }

  private disableForm(): void {
    this.accountsService.enableAccountForm(false);
    this.accountsService.enableAccountGrid(false);
  }
}
