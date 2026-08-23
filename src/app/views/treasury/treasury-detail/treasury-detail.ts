import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EMPTY, Observable, Subject, catchError, map, tap } from 'rxjs';
import { TreasuryService } from '../treasury.service';
import { ITreasury, TREASURY_TYPE_BANK } from '../treasury';
import { ApplicationService } from '@shared/services/applicattionService';
import { AccountsService } from '@views/accounting/accounts/accounts.service';
import { IAccount } from '@views/accounting/accounts/account';

@Component({
  selector: 'llion-treasury-detail',
  templateUrl: './treasury-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class TreasuryDetailComponent implements OnInit {
  private readonly errorMessageSubject = new Subject<string>();
  errorMessage$ = this.errorMessageSubject.asObservable();

  treasuryForm!: FormGroup;
  treasury!: ITreasury;
  treasury$!: Observable<ITreasury>;
  enabled$!: Observable<boolean>;
  accounts$!: Observable<IAccount[]>;
  /** Agency address/phone/email — only for BAN (bancos). */
  showAgencyContacts$!: Observable<boolean>;

  accountFields: Object = { text: 'name', value: 'accountId' };
  filterType: 'Contains' = 'Contains';

  constructor(
    private formBuilder: FormBuilder,
    private treasuryService: TreasuryService,
    private accountsService: AccountsService,
    private applicationService: ApplicationService
  ) {}

  ngOnInit(): void {
    this.treasuryForm = this.formBuilder.group({
      treasuryName: ['', Validators.required],
      alternCode: [''],
      treasuryAccountNumber: [''],
      actualBalance: [null],
      accountId: [null],
      deactivated: [true],
    });

    this.accounts$ = this.accountsService.accounts$;

    this.treasury$ = this.treasuryService.treasurySelected$.pipe(
      tap((data: ITreasury) => {
        this.treasury = data;
        this.treasuryForm.patchValue({
          treasuryName: data.treasuryName,
          alternCode: data.alternCode,
          treasuryAccountNumber: data.treasuryAccountNumber,
          actualBalance: data.actualBalance,
          accountId: data.accountId,
          deactivated: !data.deactivated,
        });
      }),
      catchError((err) => {
        this.errorMessageSubject.next(err);
        return EMPTY;
      })
    );

    this.showAgencyContacts$ = this.treasuryService.treasurySelected$.pipe(
      map(
        (t) =>
          (t.treasuryType ?? '').toUpperCase() === TREASURY_TYPE_BANK &&
          (t.treasuryId ?? 0) > 0
      )
    );

    this.enabled$ = this.treasuryService.enableTreasuryFormAction$.pipe(
      tap((enabled) => {
        if (enabled) {
          this.treasuryForm.enable();
        } else {
          this.treasuryForm.disable();
        }
        const formButtons = document.getElementById('treasury-form-buttons');
        if (formButtons) {
          formButtons.style.display = enabled ? 'block' : 'none';
        }
      })
    );
  }

  onCancelClick(): void {
    this.disableForm();
    if (!this.treasury?.treasuryId) {
      this.treasuryForm.reset({ deactivated: true });
    }
  }

  onSaveClick(): void {
    if (this.treasuryForm.invalid) {
      this.treasuryForm.markAllAsTouched();
      return;
    }

    const organizationId =
      this.treasury?.organizationId ||
      this.applicationService.workingOrganization?.organizationId ||
      0;

    if (organizationId <= 0) {
      return;
    }

    const payload: ITreasury = {
      treasuryId: this.treasury?.treasuryId ?? 0,
      treasuryName: this.treasuryForm.value.treasuryName,
      alternCode: this.treasuryForm.value.alternCode,
      treasuryAccountNumber: this.treasuryForm.value.treasuryAccountNumber,
      actualBalance: this.treasuryForm.value.actualBalance,
      accountId: this.treasuryForm.value.accountId,
      deactivated: !this.treasuryForm.value.deactivated,
      treasuryType: this.treasury?.treasuryType ?? null,
      classId: this.treasury?.classId ?? null,
      currencyId: this.treasury?.currencyId ?? null,
      organizationId,
    };

    if (payload.treasuryId > 0) {
      this.treasuryService.updateTreasury(payload);
    } else {
      this.treasuryService.addTreasury(payload);
    }
    this.disableForm();
  }

  private disableForm(): void {
    this.treasuryService.enableTreasuryForm(false);
    this.treasuryService.enableTreasuryGrid(false);
  }
}
