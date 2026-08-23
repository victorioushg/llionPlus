import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  DialogEditEventArgs,
  EditSettingsModel,
  GridComponent,
  SaveEventArgs,
} from '@syncfusion/ej2-angular-grids';
import { NgForm } from '@angular/forms';
import { ChangeEventArgs } from '@syncfusion/ej2-angular-dropdowns';
import {
  combineLatest,
  map,
  Observable,
  Subject,
  take,
  takeUntil,
} from 'rxjs';
import { IMerchandiseTax } from '../merchandise';
import { MerchandiseService } from '../merchandise.service';
import { IOrganizationTax } from '@views/application/organization/organization';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { withToolbarTitle } from '@shared/utils/grid-toolbar';

interface IRateTypeOption {
  rateType: string;
  label: string;
  rate: number;
}

@Component({
  selector: 'llion-merchandise-taxes',
  templateUrl: './merchandise-taxes.html',
  styleUrls: ['./merchandise-taxes.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class MerchandiseTaxesComponent implements OnInit, OnDestroy {
  @ViewChild('taxesgrid') taxesGrid?: GridComponent;
  @ViewChild('taxForm') taxForm?: NgForm;

  taxesData$!: Observable<IMerchandiseTax[]>;
  taxesGridHeight = 80;
  readonly taxesGridRowHeight = 36;

  taxTypeOptions: string[] = [];
  rateTypeOptions: IRateTypeOption[] = [];
  rateTypeFields: Object = { text: 'label', value: 'rateType' };
  private orgTaxes: IOrganizationTax[] = [];

  taxData: IMerchandiseTax = this.createEmptyTax();
  taxesToolbar = withToolbarTitle(
    ['Add', 'Edit', 'Delete'],
    'Impuestos de mercancía'
  );
  taxesEditSettings: EditSettingsModel = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    mode: 'Dialog',
  };

  private selectedMerchandiseId = 0;
  private organizationId = 1;
  private editingOriginalTaxType = '';
  private editingOriginalRateType = '';
  private readonly destroy$ = new Subject<void>();

  constructor(
    private merchandiseService: MerchandiseService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  formatRate(value: unknown): string {
    const rate = this.toRateNumber(value);
    return rate === null ? '' : `${(rate * 100).toFixed(2)} %`;
  }

  ngOnInit(): void {
    this.taxesToolbar = withToolbarTitle(
      ['Add', 'Edit', 'Delete'],
      this.merchandiseService.isServiceCatalog
        ? 'Impuestos de servicio'
        : 'Impuestos de mercancía'
    );

    this.organizationId = this.merchandiseService.currentOrganizationId;

    // Always resolve Rate from organization app_taxes (live), so org changes apply here.
    this.taxesData$ = combineLatest([
      this.merchandiseService.merchandiseTaxes$,
      this.merchandiseService.organizationTaxes$,
    ]).pipe(
      map(([merchTaxes, orgTaxes]) =>
        (merchTaxes ?? []).map((mt) => ({
          ...mt,
          rate: this.resolveRate(
            mt.taxType,
            mt.rateType,
            orgTaxes,
            mt.rate
          ),
        }))
      )
    );

    // Ensure lookup is loaded even before a merchandise is selected
    this.merchandiseService.refreshOrganizationTaxes();

    this.merchandiseService.organizationTaxes$
      .pipe(takeUntil(this.destroy$))
      .subscribe((taxes) => {
        this.orgTaxes = taxes ?? [];
        this.taxTypeOptions = [
          ...new Set(
            this.orgTaxes.map((t) => t.taxType).filter((v): v is string => !!v)
          ),
        ];
        this.refreshRateTypeOptions(this.taxData.taxType);
        this.cdr.markForCheck();
      });

    this.merchandiseService.merchandiseSelectedAction$
      .pipe(takeUntil(this.destroy$))
      .subscribe((merchandiseId) => {
        this.selectedMerchandiseId = merchandiseId ?? 0;
        // Reload org taxes so rate values match latest organization definitions
        this.merchandiseService.refreshOrganizationTaxes();
        this.merchandiseService.refreshTaxes();
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onTaxTypeChange(args: ChangeEventArgs): void {
    const taxType = String(args.value ?? '');
    this.taxData.taxType = taxType;
    this.refreshRateTypeOptions(taxType);
    if (
      !this.rateTypeOptions.some((o) => o.rateType === this.taxData.rateType)
    ) {
      this.taxData.rateType = this.rateTypeOptions[0]?.rateType ?? '';
    }
    this.syncSelectedRate();
    this.cdr.markForCheck();
  }

  onRateTypeChange(args: ChangeEventArgs): void {
    this.taxData.rateType = String(args.value ?? '');
    this.syncSelectedRate();
    this.cdr.markForCheck();
  }

  actionBegin(args: SaveEventArgs): void {
    const needsMerchandise =
      args.requestType === 'add' ||
      args.requestType === 'beginEdit' ||
      args.requestType === 'save' ||
      args.requestType === 'delete';

    if (needsMerchandise && this.selectedMerchandiseId <= 0) {
      args.cancel = true;
      this.toastService.showMyToast(
        this.merchandiseService.isServiceCatalog
          ? 'Debe seleccionar un servicio para gestionar impuestos'
          : 'Debe seleccionar una mercancía para gestionar impuestos',
        toastType.warning
      );
      return;
    }

    if (args.requestType === 'beginEdit') {
      const row = (args.rowData ?? {}) as Partial<IMerchandiseTax>;
      this.editingOriginalTaxType = row.taxType ?? '';
      this.editingOriginalRateType = row.rateType ?? '';
      this.taxData = {
        merchandiseId: row.merchandiseId ?? this.selectedMerchandiseId,
        taxType: row.taxType ?? '',
        rateType: row.rateType ?? '',
        organizationId: row.organizationId ?? this.organizationId,
        rate: row.rate ?? null,
      };
      this.refreshRateTypeOptions(this.taxData.taxType);
      this.syncSelectedRate();
    }

    if (args.requestType === 'add') {
      this.editingOriginalTaxType = '';
      this.editingOriginalRateType = '';
      this.taxData = this.createEmptyTax();
      this.refreshRateTypeOptions(this.taxData.taxType);
    }

    if (args.requestType === 'save') {
      if (this.taxForm && !this.taxForm.valid) {
        args.cancel = true;
        return;
      }

      this.syncSelectedRate();

      // Persist only TaxType + RateType (+ keys). Rate is never saved;
      // it is always resolved from app_taxes on read.
      const payload: IMerchandiseTax = {
        merchandiseId: this.selectedMerchandiseId,
        taxType: this.taxData.taxType,
        rateType: this.taxData.rateType,
        organizationId: this.organizationId,
        originalTaxType: this.editingOriginalTaxType || this.taxData.taxType,
        originalRateType: this.editingOriginalRateType || this.taxData.rateType,
      };

      if (!payload.taxType || !payload.rateType) {
        args.cancel = true;
        this.toastService.showMyToast(
          'Debe indicar Tipo y Código de tasa',
          toastType.warning
        );
        return;
      }

      const isUpdate = !!this.editingOriginalTaxType;
      const request$ = isUpdate
        ? this.merchandiseService.updateMerchandiseTax(payload)
        : this.merchandiseService.addMerchandiseTax(payload);

      request$.pipe(take(1)).subscribe({
        next: () => {
          // Ensure grid shows Rate from latest app_taxes after save
          this.merchandiseService.refreshOrganizationTaxes();
          this.merchandiseService.refreshTaxes();
        },
        error: () => {
          args.cancel = true;
        },
      });
    }

    if (args.requestType === 'delete') {
      const row = ((args as SaveEventArgs).data ??
        {}) as IMerchandiseTax | IMerchandiseTax[];
      const item = Array.isArray(row) ? row[0] : row;
      if (item?.taxType && item?.rateType) {
        this.merchandiseService
          .deleteMerchandiseTax({
            ...item,
            merchandiseId: item.merchandiseId ?? this.selectedMerchandiseId,
            organizationId: item.organizationId ?? this.organizationId,
          })
          .pipe(take(1))
          .subscribe({
            error: () => {
              args.cancel = true;
            },
          });
      }
    }
  }

  actionComplete(args: DialogEditEventArgs): void {
    if (
      (args.requestType === 'beginEdit' || args.requestType === 'add') &&
      args.form
    ) {
      setTimeout(() => {
        const taxType = args.form?.elements.namedItem(
          'taxType'
        ) as HTMLInputElement | null;
        taxType?.focus();
      });
    }
  }

  private refreshRateTypeOptions(taxType: string): void {
    const source = !taxType
      ? this.orgTaxes
      : this.orgTaxes.filter((t) => t.taxType === taxType);

    const seen = new Set<string>();
    this.rateTypeOptions = source
      .filter((t) => {
        const key = (t.rateType ?? '').trim();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((t) => {
        const rate = Number(t.rate ?? 0);
        return {
          rateType: t.rateType,
          rate,
          label: `${t.rateType} — ${(rate * 100).toFixed(2)}%`,
        };
      });
  }

  private syncSelectedRate(): void {
    this.taxData.rate = this.resolveRate(
      this.taxData.taxType,
      this.taxData.rateType,
      this.orgTaxes,
      null
    );
  }

  private resolveRate(
    taxType: string | undefined,
    rateType: string | undefined,
    orgTaxes: IOrganizationTax[],
    fallback: number | null | undefined
  ): number | null {
    if (!taxType || !rateType) {
      return this.toRateNumber(fallback);
    }

    const taxKey = taxType.trim().toLowerCase();
    const rateKey = rateType.trim().toLowerCase();
    const matches = (orgTaxes ?? []).filter(
      (t) =>
        (t.taxType ?? '').trim().toLowerCase() === taxKey &&
        (t.rateType ?? '').trim().toLowerCase() === rateKey
    );

    if (matches.length) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // app_taxes has TaxDateFrom only — pick latest vigente
      const sorted = [...matches].sort((a, b) => {
        const da = a.taxDateFrom ? new Date(a.taxDateFrom).getTime() : 0;
        const db = b.taxDateFrom ? new Date(b.taxDateFrom).getTime() : 0;
        return db - da;
      });

      const current =
        sorted.find((t) => {
          if (!t.taxDateFrom) {
            return true;
          }
          const from = new Date(t.taxDateFrom);
          from.setHours(0, 0, 0, 0);
          return from <= today;
        }) ?? sorted[0];

      const fromOrg = this.toRateNumber(current?.rate);
      if (fromOrg !== null) {
        return fromOrg;
      }
    }

    return this.toRateNumber(fallback);
  }

  private toRateNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private createEmptyTax(): IMerchandiseTax {
    return {
      merchandiseId: this.selectedMerchandiseId,
      taxType: '',
      rateType: '',
      organizationId: this.organizationId,
      rate: null,
    };
  }
}
