import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  EMPTY,
  Observable,
  Subject,
  catchError,
  combineLatest,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { ChangeEventArgs } from '@syncfusion/ej2-angular-dropdowns';
import { AccountsService } from '../accounts.service';
import {
  AccountType,
  CashFlowClassification,
  IAccount,
  SpecialAccountType,
} from '../account';
import { ApplicationService } from '@shared/services/applicattionService';
import { OrganizationService } from '@views/application/organization/organization.service';
import { ICurrency } from '@views/application/organization/organization';
import { TreasuryService } from '@views/treasury/treasury.service';
import {
  ITreasury,
  TREASURY_TYPE_CASHBOX,
} from '@views/treasury/treasury';

interface ICurrencyOption extends ICurrency {
  label: string;
}

interface ITreasuryOption extends ITreasury {
  label: string;
  group: string;
}

@Component({
  selector: 'llion-account-detail',
  templateUrl: './account-detail.html',
  styleUrls: ['./account-detail.scss'],
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
  /** Parent account candidates (exclude current). */
  parentAccounts$!: Observable<IAccount[]>;
  currencies$!: Observable<ICurrencyOption[]>;
  /** Organization banks + cashboxes. */
  treasuries$!: Observable<ITreasuryOption[]>;

  readonly dropdownFields: Object = { text: 'text', value: 'value' };
  readonly parentAccountFields: Object = {
    text: 'name',
    value: 'accountId',
  };
  readonly currencyFields: Object = {
    text: 'label',
    value: 'numericCode',
  };
  readonly treasuryFields: Object = {
    text: 'label',
    value: 'treasuryId',
    groupBy: 'group',
  };

  readonly accountTypeOptions: { text: string; value: AccountType }[] = [
    { text: 'OtherExpense', value: 'OtherExpense' },
    { text: 'CreditCard', value: 'CreditCard' },
    { text: 'FixedAsset', value: 'FixedAsset' },
    { text: 'OtherCurrentLiability', value: 'OtherCurrentLiability' },
    { text: 'OtherIncome', value: 'OtherIncome' },
    { text: 'LongTermLiability', value: 'LongTermLiability' },
    { text: 'OtherAsset', value: 'OtherAsset' },
    { text: 'OtherCurrentAsset', value: 'OtherCurrentAsset' },
    { text: 'Equity', value: 'Equity' },
    { text: 'Bank', value: 'Bank' },
    { text: 'AccountsPayable', value: 'AccountsPayable' },
    { text: 'Income', value: 'Income' },
    { text: 'AccountsReceivable', value: 'AccountsReceivable' },
    { text: 'Expense', value: 'Expense' },
    { text: 'NonPosting', value: 'NonPosting' },
    { text: 'CostOfGoodsSold', value: 'CostOfGoodsSold' },
  ];

  readonly specialAccountTypeOptions: {
    text: string;
    value: SpecialAccountType;
  }[] = [
    { text: 'InventoryAssets', value: 'InventoryAssets' },
    {
      text: 'ReconciliationDifferences',
      value: 'ReconciliationDifferences',
    },
    { text: 'UndepositedFunds', value: 'UndepositedFunds' },
    { text: 'PayrollExpenses', value: 'PayrollExpenses' },
    { text: 'AccountsPayable', value: 'AccountsPayable' },
    { text: 'AccountsReceivable', value: 'AccountsReceivable' },
    {
      text: 'CondenseItemAdjustmentExpenses',
      value: 'CondenseItemAdjustmentExpenses',
    },
    { text: 'CostOfGoodsSold', value: 'CostOfGoodsSold' },
    { text: 'DirectDepositLiabilities', value: 'DirectDepositLiabilities' },
    { text: 'Estimates', value: 'Estimates' },
    { text: 'ExchangeGainLoss', value: 'ExchangeGainLoss' },
    { text: 'ItemReceiptAccount', value: 'ItemReceiptAccount' },
    { text: 'OpeningBalanceEquity', value: 'OpeningBalanceEquity' },
    { text: 'PayrollLiabilities', value: 'PayrollLiabilities' },
    { text: 'PettyCash', value: 'PettyCash' },
    { text: 'PurchaseOrders', value: 'PurchaseOrders' },
    { text: 'RetainedEarnings', value: 'RetainedEarnings' },
    { text: 'SalesOrders', value: 'SalesOrders' },
    { text: 'SalesTaxPayable', value: 'SalesTaxPayable' },
    { text: 'UncategorizedExpenses', value: 'UncategorizedExpenses' },
    { text: 'UncategorizedIncome', value: 'UncategorizedIncome' },
  ];

  readonly cashFlowClassificationOptions: {
    text: string;
    value: CashFlowClassification;
  }[] = [
    { text: 'NotApplicable', value: 'NotApplicable' },
    { text: 'None', value: 'None' },
    { text: 'Investing', value: 'Investing' },
    { text: 'Operating', value: 'Operating' },
    { text: 'Financing', value: 'Financing' },
  ];

  constructor(
    private formBuilder: FormBuilder,
    private accountsService: AccountsService,
    private applicationService: ApplicationService,
    private organizationService: OrganizationService,
    private treasuryService: TreasuryService
  ) {}

  ngOnInit(): void {
    this.accountForm = this.formBuilder.group({
      code: ['', Validators.required],
      name: ['', Validators.required],
      fullName: [''],
      desc: [''],
      parentId: [null],
      parentId_FullName: [''],
      accountType: [null],
      specialAccountType: [null],
      cashFlowClassification: [null],
      subLevel: [0],
      openBalance: [null],
      openBalanceDate: [null],
      balance: [{ value: null, disabled: true }],
      totalBalance: [{ value: null, disabled: true }],
      isActive: [true],
      isTaxAccount: [false],
      treasureId: [null],
      salesTaxCodeId: [null],
      salesTaxCodeFullName: [''],
      taxLineId: [null],
      taxLineName: [''],
      currencyId: [null],
      currencyFullName: [''],
    });

    this.currencies$ = this.organizationService.currencies$.pipe(
      map((rows) =>
        (rows ?? [])
          .filter((c) => c.numericCode != null && c.numericCode > 0)
          .map((c) => ({
            ...c,
            label: c.alphabeticCode
              ? `${c.currency} (${c.alphabeticCode})`
              : c.currency,
          }))
      )
    );

    this.treasuries$ = this.applicationService.workingOrganization$.pipe(
      switchMap((org) => {
        const organizationId = org?.organizationId ?? 0;
        if (organizationId <= 0) {
          return of([] as ITreasury[]);
        }
        return this.treasuryService.getOrganizationTreasuries(organizationId);
      }),
      map((rows) =>
        (rows ?? []).map((t) => ({
          ...t,
          label: t.treasuryName ?? '',
          group: this.getTreasuryGroup(t),
        }))
      )
    );

    this.account$ = this.accountsService.accountSelected$.pipe(
      tap((data: IAccount) => {
        this.account = data;
        this.patchForm(data);
      }),
      catchError((err) => {
        this.errorMessageSubject.next(err);
        return EMPTY;
      })
    );

    this.parentAccounts$ = combineLatest([
      this.accountsService.accounts$,
      this.accountsService.accountContextIdAction$,
    ]).pipe(
      map(([accounts, currentId]) =>
        accounts.filter((a) => a.accountId > 0 && a.accountId !== currentId)
      )
    );

    this.enabled$ = this.accountsService.enableAccountFormAction$.pipe(
      tap((enabled) => {
        if (enabled) {
          this.accountForm.enable();
          this.accountForm.get('balance')?.disable({ emitEvent: false });
          this.accountForm.get('totalBalance')?.disable({ emitEvent: false });
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

  onParentChange(args: ChangeEventArgs): void {
    const parent = args?.itemData as IAccount | undefined;
    const fullName =
      parent?.fullName ||
      parent?.name ||
      parent?.description ||
      parent?.parentId_FullName ||
      '';
    this.accountForm.patchValue({
      parentId_FullName: fullName,
    });
  }

  onCurrencyChange(args: ChangeEventArgs): void {
    const currency = args?.itemData as ICurrencyOption | undefined;
    this.accountForm.patchValue({
      currencyFullName: currency?.currency ?? '',
    });
  }

  onCancelClick(): void {
    this.disableForm();
    if (!this.account?.accountId) {
      this.patchForm({
        ...this.account,
        accountId: 0,
        code: '',
        name: '',
        fullName: '',
        desc: '',
        parentId: null,
        parentId_FullName: '',
        accountType: null,
        specialAccountType: null,
        cashFlowClassification: null,
        subLevel: 0,
        openBalance: null,
        openBalanceDate: null,
        balance: null,
        totalBalance: null,
        isActive: true,
        isTaxAccount: false,
        treasureId: null,
        salesTaxCodeId: null,
        salesTaxCodeFullName: '',
        taxLineId: null,
        taxLineName: '',
        currencyId: null,
        currencyFullName: '',
        organizationId: this.account?.organizationId ?? 0,
      });
    } else {
      this.patchForm(this.account);
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

    const formValue = this.accountForm.getRawValue();
    const name = formValue.name ?? '';
    const code = formValue.code ?? '';
    const desc = formValue.desc ?? '';
    const parentFullName = formValue.parentId_FullName ?? '';

    const payload: IAccount = {
      ...this.account,
      accountId: this.account?.accountId ?? 0,
      code,
      name,
      fullName: formValue.fullName || name,
      desc,
      description: desc || name,
      parentId: formValue.parentId ?? null,
      parentId_FullName: parentFullName,
      parentFullName,
      subLevel: formValue.subLevel ?? 0,
      mark: this.account?.mark ?? false,
      accountType: formValue.accountType ?? null,
      specialAccountType: formValue.specialAccountType ?? null,
      cashFlowClassification: formValue.cashFlowClassification ?? null,
      openBalance: formValue.openBalance ?? null,
      openBalanceDate: formValue.openBalanceDate ?? null,
      balance: formValue.balance ?? this.account?.balance ?? null,
      totalBalance: formValue.totalBalance ?? this.account?.totalBalance ?? null,
      isActive: formValue.isActive ?? true,
      isTaxAccount: !!formValue.isTaxAccount,
      treasureId: formValue.treasureId ?? null,
      salesTaxCodeId: formValue.salesTaxCodeId ?? null,
      salesTaxCodeFullName: formValue.salesTaxCodeFullName ?? '',
      taxLineId: formValue.taxLineId ?? null,
      taxLineName: formValue.taxLineName ?? '',
      currencyId: formValue.currencyId ?? null,
      currencyFullName: formValue.currencyFullName ?? '',
      organizationId,
    };

    if (payload.accountId > 0) {
      this.accountsService.updateAccount(payload);
    } else {
      this.accountsService.addAccount(payload);
    }
    this.disableForm();
  }

  private patchForm(data: IAccount): void {
    this.accountForm.patchValue({
      code: data.code ?? '',
      name: data.name ?? '',
      fullName: data.fullName ?? data.name ?? '',
      desc: data.desc ?? data.description ?? '',
      parentId: data.parentId ?? null,
      parentId_FullName:
        data.parentId_FullName ?? data.parentFullName ?? '',
      accountType: data.accountType ?? null,
      specialAccountType: data.specialAccountType ?? null,
      cashFlowClassification: data.cashFlowClassification ?? null,
      subLevel: data.subLevel ?? 0,
      openBalance: data.openBalance ?? null,
      openBalanceDate: data.openBalanceDate
        ? new Date(data.openBalanceDate)
        : null,
      balance: data.balance ?? null,
      totalBalance: data.totalBalance ?? null,
      isActive: data.isActive ?? true,
      isTaxAccount: !!data.isTaxAccount,
      treasureId: data.treasureId ?? null,
      salesTaxCodeId: data.salesTaxCodeId ?? null,
      salesTaxCodeFullName: data.salesTaxCodeFullName ?? '',
      taxLineId: data.taxLineId ?? null,
      taxLineName: data.taxLineName ?? '',
      currencyId: data.currencyId ?? null,
      currencyFullName: data.currencyFullName ?? '',
    });
  }

  private getTreasuryGroup(treasury: ITreasury): string {
    const type = (treasury.treasuryType ?? '').toUpperCase();
    return type === TREASURY_TYPE_CASHBOX ? 'Cajas' : 'Bancos';
  }

  private disableForm(): void {
    this.accountsService.enableAccountForm(false);
    this.accountsService.enableAccountGrid(false);
  }
}
