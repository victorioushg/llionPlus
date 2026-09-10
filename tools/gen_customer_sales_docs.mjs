import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');
const API = path.resolve('D:\\DESARROLLO\\WebON_DotNet\\llion\\llionAPI');
const QUOTE_DIR = path.join(ROOT, 'src', 'app', 'views', 'customer', 'quotes');
const CUST_DIR = path.join(ROOT, 'src', 'app', 'views', 'customer');

const created = [];
const errors = [];

const DOCS = [
  {
    folder: 'sales-orders',
    file: 'sales-order',
    pascal: 'SalesOrder',
    camel: 'salesOrder',
    api: 'salesorders',
    title: 'Pedidos',
    singular: 'pedido',
    banner: 'PEDIDO',
    number_ph: 'Pedido No.',
    number_col: 'Nº pedido',
    total_label: 'TOTAL PEDIDO',
    saved: 'Pedido guardado',
    deleted: 'Pedido eliminado',
    next_fail: 'No se pudo obtener el número de pedido',
    select_warn: 'Debe seleccionar un pedido',
    closed: 'El pedido está cerrado y no se puede modificar',
    closed_del: 'El pedido está cerrado y no se puede eliminar',
    placeholder: 'Seleccione un pedido',
    table: 'cus_salesorder',
    detail: 'cus_salesorder_detail',
    discounts: 'cus_salesorder_discounts',
    taxes: 'cus_salesorder_taxes',
    id_col: 'SalesOrderId',
    number_col_db: 'SalesOrderNumber',
    series_col: 'SalesOrderSeriesCode',
    total_col: 'TotalSalesOrder',
    type_col: 'SalesOrderType',
    row_col: 'SalesOrderRowNumber',
    row_type: 'SalesOrderRowType',
    disc_row: 'SalesOrderDiscountRowNumber',
    subtotal: 'SubtotalSalesOrder',
    counter: 'Sales Orders',
    status_sql: `CASE
      WHEN q.LockedDate IS NOT NULL THEN 'Cerrada'
      WHEN q.SalesOrderType = 1 THEN 'BackOrder'
      ELSE 'Pendiente'
    END`,
    extra_select: ['q.DeliveryDate'],
    extra_insert: ['DeliveryDate'],
    extra_params: [['_DeliveryDate', 'DATE']],
    extra_update: ['DeliveryDate = _DeliveryDate'],
    extra_insert_vals: ['_DeliveryDate'],
    has_discounts: true,
    extra_ui: 'delivery',
  },
  {
    folder: 'delivery-notes',
    file: 'delivery-note',
    pascal: 'DeliveryNote',
    camel: 'deliveryNote',
    api: 'deliverynotes',
    title: 'Notas de entrega',
    singular: 'nota de entrega',
    banner: 'NOTA DE ENTREGA',
    number_ph: 'Nota entrega No.',
    number_col: 'Nº nota',
    total_label: 'TOTAL Nota de Entrega',
    saved: 'Nota de entrega guardada',
    deleted: 'Nota de entrega eliminada',
    next_fail: 'No se pudo obtener el número de nota de entrega',
    select_warn: 'Debe seleccionar una nota de entrega',
    closed: 'La nota de entrega está cerrada y no se puede modificar',
    closed_del: 'La nota de entrega está cerrada y no se puede eliminar',
    placeholder: 'Seleccione una nota de entrega',
    table: 'cus_deliverynote',
    detail: 'cus_deliverynote_detail',
    discounts: 'cus_deliverynote_discounts',
    taxes: 'cus_deliverynote_taxes',
    id_col: 'DeliveryNoteId',
    number_col_db: 'DeliveryNoteNumber',
    series_col: 'DeliveryNoteSeriesCode',
    total_col: 'TotalDeliveryNote',
    type_col: 'DeliveryNoteType',
    row_col: 'DeliveryNoteRowNumber',
    row_type: 'DeliveryNoteRowType',
    disc_row: 'DeliveryNoteDiscountRowNumber',
    subtotal: 'SubtotalDeliveryNote',
    counter: 'Delivery Notes',
    status_sql: `CASE
      WHEN q.LockedDate IS NOT NULL THEN 'Cerrada'
      WHEN q.DeliveryNoteType = 1 THEN 'Procesada'
      ELSE 'Por procesar'
    END`,
    extra_select: ['q.DeliveryDate', 'q.WareHouseId AS WarehouseId', 'q.Reference'],
    extra_insert: ['DeliveryDate', 'WareHouseId', 'Reference'],
    extra_params: [['_DeliveryDate', 'DATE'], ['_WarehouseId', 'INT'], ['_Reference', 'VARCHAR(255)']],
    extra_update: [
      'DeliveryDate = _DeliveryDate',
      'WareHouseId = NULLIF(_WarehouseId, 0)',
      'Reference = _Reference',
    ],
    extra_insert_vals: ['_DeliveryDate', 'NULLIF(_WarehouseId, 0)', '_Reference'],
    has_discounts: true,
    extra_ui: 'warehouse',
  },
  {
    folder: 'invoices',
    file: 'invoice',
    pascal: 'Invoice',
    camel: 'invoice',
    api: 'salesinvoices',
    title: 'Facturas',
    singular: 'factura',
    banner: 'FACTURA',
    number_ph: 'Factura No.',
    number_col: 'Nº factura',
    total_label: 'TOTAL Factura',
    saved: 'Factura guardada',
    deleted: 'Factura eliminada',
    next_fail: 'No se pudo obtener el número de factura',
    select_warn: 'Debe seleccionar una factura',
    closed: 'La factura está cerrada y no se puede modificar',
    closed_del: 'La factura está cerrada y no se puede eliminar',
    placeholder: 'Seleccione una factura',
    table: 'cus_invoice',
    detail: 'cus_invoice_detail',
    discounts: 'cus_invoice_discounts',
    taxes: 'cus_invoice_taxes',
    id_col: 'InvoiceId',
    number_col_db: 'InvoiceNumber',
    series_col: 'InvoiceSeriesCode',
    total_col: 'TotalInvoice',
    type_col: 'InvoiceType',
    row_col: 'InvoiceRowNumber',
    row_type: 'InvoiceRowType',
    disc_row: 'InvoiceDiscountRowNumber',
    subtotal: 'SubtotalInvoice',
    counter: 'Invoices',
    status_sql: `CASE
      WHEN q.LockedDate IS NOT NULL THEN 'Cerrada'
      WHEN q.InvoiceType = 2 THEN 'Anulada'
      WHEN q.InvoiceType = 1 THEN 'Conforme'
      ELSE 'Pendiente'
    END`,
    extra_select: ['q.WareHouseId AS WarehouseId', 'q.Reference'],
    extra_insert: ['WareHouseId', 'Reference'],
    extra_params: [['_WarehouseId', 'INT'], ['_Reference', 'VARCHAR(255)']],
    extra_update: ['WareHouseId = NULLIF(_WarehouseId, 0)', 'Reference = _Reference'],
    extra_insert_vals: ['NULLIF(_WarehouseId, 0)', '_Reference'],
    has_discounts: true,
    extra_ui: 'warehouse',
  },
  {
    folder: 'credit-notes',
    file: 'credit-note',
    pascal: 'CreditNote',
    camel: 'creditNote',
    api: 'salescreditnotes',
    title: 'Notas crédito',
    singular: 'nota de crédito',
    banner: 'NOTA CRÉDITO',
    number_ph: 'Nota crédito No.',
    number_col: 'Nº nota crédito',
    total_label: 'TOTAL Nota Crédito',
    saved: 'Nota de crédito guardada',
    deleted: 'Nota de crédito eliminada',
    next_fail: 'No se pudo obtener el número de nota de crédito',
    select_warn: 'Debe seleccionar una nota de crédito',
    closed: 'La nota de crédito está cerrada y no se puede modificar',
    closed_del: 'La nota de crédito está cerrada y no se puede eliminar',
    placeholder: 'Seleccione una nota de crédito',
    table: 'cus_creditnote',
    detail: 'cus_creditnote_detail',
    discounts: null,
    taxes: 'cus_creditnote_taxes',
    id_col: 'CreditNoteId',
    number_col_db: 'CreditNoteNumber',
    series_col: 'CreditNoteSeriesCode',
    total_col: 'TotalCreditNote',
    type_col: 'CreditNoteType',
    row_col: 'CreditNoteRowNumber',
    row_type: 'CreditNoteRowType',
    disc_row: 'CreditNoteDiscountRowNumber',
    subtotal: 'SubtotalCreditNote',
    counter: 'Credit Note Sales',
    status_sql: `CASE
      WHEN q.LockedDate IS NOT NULL THEN 'Cerrada'
      WHEN q.CreditNoteType = 2 THEN 'Anulada'
      WHEN q.CreditNoteType = 1 THEN 'Procesada'
      ELSE 'Pendiente'
    END`,
    extra_select: ['q.InvoiceId', 'q.WareHouseId AS WarehouseId', 'q.Reference'],
    extra_insert: ['InvoiceId', 'WareHouseId', 'Reference'],
    extra_params: [
      ['_InvoiceId', 'INT'],
      ['_WarehouseId', 'INT'],
      ['_Reference', 'VARCHAR(255)'],
    ],
    extra_update: [
      'InvoiceId = NULLIF(_InvoiceId, 0)',
      'WareHouseId = NULLIF(_WarehouseId, 0)',
      'Reference = _Reference',
    ],
    extra_insert_vals: ['NULLIF(_InvoiceId, 0)', 'NULLIF(_WarehouseId, 0)', '_Reference'],
    has_discounts: false,
    extra_ui: 'warehouse_invoice',
  },
  {
    folder: 'debit-notes',
    file: 'debit-note',
    pascal: 'DebitNote',
    camel: 'debitNote',
    api: 'salesdebitnotes',
    title: 'Notas débito',
    singular: 'nota de débito',
    banner: 'NOTA DÉBITO',
    number_ph: 'Nota débito No.',
    number_col: 'Nº nota débito',
    total_label: 'TOTAL Nota Débito',
    saved: 'Nota de débito guardada',
    deleted: 'Nota de débito eliminada',
    next_fail: 'No se pudo obtener el número de nota de débito',
    select_warn: 'Debe seleccionar una nota de débito',
    closed: 'La nota de débito está cerrada y no se puede modificar',
    closed_del: 'La nota de débito está cerrada y no se puede eliminar',
    placeholder: 'Seleccione una nota de débito',
    table: 'cus_debitnote',
    detail: 'cus_debitnote_detail',
    discounts: 'cus_debitnote_discounts',
    taxes: 'cus_debitnote_taxes',
    id_col: 'DebitNoteId',
    number_col_db: 'DebitNoteNumber',
    series_col: 'DebitNoteSeriesCode',
    total_col: 'TotalDebitNote',
    type_col: 'DebitNoteType',
    row_col: 'DebitNoteRowNumber',
    row_type: 'DebitNoteRowType',
    disc_row: 'DebitNoteDiscountRowNumber',
    subtotal: 'SubtotalDebitNote',
    counter: 'Debit Note Sales',
    status_sql: `CASE
      WHEN q.LockedDate IS NOT NULL THEN 'Cerrada'
      WHEN q.DebitNoteType = 2 THEN 'Anulada'
      WHEN q.DebitNoteType = 1 THEN 'Procesada'
      ELSE 'Pendiente'
    END`,
    extra_select: ['q.InvoiceId', 'q.WareHouseId AS WarehouseId', 'q.Reference'],
    extra_insert: ['InvoiceId', 'WareHouseId', 'Reference'],
    extra_params: [
      ['_InvoiceId', 'INT'],
      ['_WarehouseId', 'INT'],
      ['_Reference', 'VARCHAR(255)'],
    ],
    extra_update: [
      'InvoiceId = NULLIF(_InvoiceId, 0)',
      'WareHouseId = NULLIF(_WarehouseId, 0)',
      'Reference = _Reference',
    ],
    extra_insert_vals: ['NULLIF(_InvoiceId, 0)', 'NULLIF(_WarehouseId, 0)', '_Reference'],
    has_discounts: true,
    extra_ui: 'warehouse_invoice',
  },
];

function readUtf8(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
}

function writeUtf8(filePath, content) {
  fs.writeFileSync(filePath, content.replace(/\n/g, '\r\n'), 'utf8');
}

function walkFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full));
    } else if (entry.isFile()) {
      results.push(full);
    }
  }
  return results;
}

function replaceQuoteText(text, d) {
  const P = d.pascal;
  const c = d.camel;
  const k = d.file;
  const api = d.api;
  const plural_camel = c + 's';
  const reps = [
    ['QuoteDetailComponent', `${P}DetailComponent`],
    ['QuoteGridComponent', `${P}GridComponent`],
    ['QuoteService', `${P}Service`],
    ['IQuoteDiscount', `I${P}Discount`],
    ['IQuoteLine', `I${P}Line`],
    ['IQuoteTax', `I${P}Tax`],
    ['IQuote', `I${P}`],
    ['createEmptyQuote', `createEmpty${P}`],
    ['getQuoteDocument', `get${P}Document`],
    ['getNextQuoteNumber', `getNext${P}Number`],
    ['beginNewQuote', `beginNew${P}`],
    ['saveQuote', `save${P}`],
    ['deleteQuote', `delete${P}`],
    ['setSelectedQuoteId', `setSelected${P}Id`],
    ['selectedQuoteIdSource', `selected${P}IdSource`],
    ['selectedQuoteId$', `selected${P}Id$`],
    ['draftQuoteSource', `draft${P}Source`],
    ['quoteSelected$', `${c}Selected$`],
    ['currentQuoteId', `current${P}Id`],
    ['selectQuoteRow', `select${P}Row`],
    ['selectedQuoteSubject', `selected${P}Subject`],
    ['emptyQuote', `empty${P}`],
    ['quotes$', `${plural_camel}$`],
    ['quoteUrl', `${c}Url`],
    ['quoteService', `${c}Service`],
    ['quoteDiscountRowNumber', `${c}DiscountRowNumber`],
    ['quoteRowTypeName', `${c}RowTypeName`],
    ['quoteRowNumber', `${c}RowNumber`],
    ['quoteRowType', `${c}RowType`],
    ['quoteSeriesCode', `${c}SeriesCode`],
    ['quoteNumber', `${c}Number`],
    ['subtotalQuote', `subtotal${P}`],
    ['totalQuote', `total${P}`],
    ['quoteId', `${c}Id`],
    ['llion-quote-detail', `llion-${k}-detail`],
    ['quote-detail-form', `${k}-detail-form`],
    ['quote-detail-col', `${k}-detail-col`],
    ['quote-discounts-grid', `${k}-discounts-grid`],
    ['quote-taxes-grid', `${k}-taxes-grid`],
    ['quote-lines-grid', `${k}-lines-grid`],
    ['quote-placeholder', `${k}-placeholder`],
    ['quote-grid', `${k}-grid`],
    ['quote-form', `${k}-form`],
    ['quote-detail/', `${k}-detail/`],
    ["'./quote-grid.html'", `'./${k}-grid.html'`],
    ["'./quote-grid.scss'", `'./${k}-grid.scss'`],
    ["'./quote-detail.html'", `'./${k}-detail.html'`],
    ["'./quote-detail.scss'", `'./${k}-detail.scss'`],
    ["'./quote.service'", `'./${k}.service'`],
    ["'../quote.service'", `'../${k}.service'`],
    ["'./quote'", `'./${k}'`],
    ["'../quote'", `'../${k}'`],
    ["API_URL + 'quotes'", `API_URL + '${api}'`],
    ['Presupuestos', d.title],
    ['Presupuesto No.', d.number_ph],
    ['Nº presupuesto', d.number_col],
    ['TOTAL PRESUPUESTO', d.total_label],
    ['Presupuesto guardado', d.saved],
    ['Presupuesto eliminado', d.deleted],
    ['No se pudo guardar el presupuesto', `No se pudo guardar ${d.singular}`],
    ['No se pudo eliminar el presupuesto', `No se pudo eliminar ${d.singular}`],
    ['No se pudo obtener el número de presupuesto', d.next_fail],
    ['Debe seleccionar un presupuesto', d.select_warn],
    ['El presupuesto está cerrado y no se puede modificar', d.closed],
    ['El presupuesto está cerrado y no se puede eliminar', d.closed_del],
    ['Seleccione un presupuesto', d.placeholder],
    ['PRESUPUESTO', d.banner],
    ['presupuesto', d.singular],
    ["'quotes/salesmen/", "'quotes/salesmen/"],
  ];
  for (const [old, neu] of reps) {
    text = text.replaceAll(old, neu);
  }
  return text;
}

const EXTRA_FORM = {
  delivery: `      deliveryDate: [null as Date | null],
`,
  warehouse: `      warehouseId: [null as number | null],
      reference: [''],
`,
  warehouse_invoice: `      warehouseId: [null as number | null],
      reference: [''],
      invoiceId: [null as number | null],
`,
};

const EXTRA_HTML = {
  delivery: `
      <div class="col-md-3">
        <ejs-datepicker
          format="dd/MM/yyyy"
          placeholder="Entrega"
          floatLabelType="Always"
          formControlName="deliveryDate"
          [enabled]="enabled$ | async"
        ></ejs-datepicker>
      </div>
`,
  warehouse: `
    <div class="row">
      <div class="col-md-6">
        <ejs-dropdownlist
          placeholder="Almacén"
          floatLabelType="Always"
          formControlName="warehouseId"
          [dataSource]="(warehouses$ | async) || []"
          [fields]="warehouseFields"
          [allowFiltering]="true"
          [filterType]="filterType"
          popupHeight="240px"
          [enabled]="enabled$ | async"
        ></ejs-dropdownlist>
      </div>
      <div class="col-md-6">
        <ejs-textbox
          placeholder="Referencia"
          floatLabelType="Always"
          formControlName="reference"
          [enabled]="enabled$ | async"
        ></ejs-textbox>
      </div>
    </div>
`,
  warehouse_invoice: `
    <div class="row">
      <div class="col-md-4">
        <ejs-numerictextbox
          placeholder="Factura afectada"
          floatLabelType="Always"
          formControlName="invoiceId"
          format="n0"
          [decimals]="0"
          [showSpinButton]="false"
          [enabled]="enabled$ | async"
        ></ejs-numerictextbox>
      </div>
      <div class="col-md-4">
        <ejs-dropdownlist
          placeholder="Almacén"
          floatLabelType="Always"
          formControlName="warehouseId"
          [dataSource]="(warehouses$ | async) || []"
          [fields]="warehouseFields"
          [allowFiltering]="true"
          [filterType]="filterType"
          popupHeight="240px"
          [enabled]="enabled$ | async"
        ></ejs-dropdownlist>
      </div>
      <div class="col-md-4">
        <ejs-textbox
          placeholder="Referencia"
          floatLabelType="Always"
          formControlName="reference"
          [enabled]="enabled$ | async"
        ></ejs-textbox>
      </div>
    </div>
`,
};

function patchExtraUi(d, dest) {
  const detailTs = path.join(dest, `${d.file}-detail`, `${d.file}-detail.ts`);
  const detailHtml = path.join(dest, `${d.file}-detail`, `${d.file}-detail.html`);
  let ts = readUtf8(detailTs);
  let html = readUtf8(detailHtml);
  const extra = d.extra_ui;
  if (extra === 'delivery') {
    ts = ts.replace(
      'dueDate: [null as Date | null],\n',
      'dueDate: [null as Date | null],\n      deliveryDate: [null as Date | null],\n',
    );
    html = html.replace(
      `      <div class="col-md-3">
        <ejs-datepicker
          format="dd/MM/yyyy"
          placeholder="Vence"
          floatLabelType="Always"
          formControlName="dueDate"
          [enabled]="enabled$ | async"
        ></ejs-datepicker>
      </div>`,
      EXTRA_HTML.delivery +
        `      <div class="col-md-3">
        <ejs-datepicker
          format="dd/MM/yyyy"
          placeholder="Vencimiento"
          floatLabelType="Always"
          formControlName="dueDate"
          [enabled]="enabled$ | async"
        ></ejs-datepicker>
      </div>`,
    );
    ts = ts.replace(
      "this.orderForm.get('dueDate')?.enable({ emitEvent: false });",
      "this.orderForm.get('dueDate')?.enable({ emitEvent: false });\n    this.orderForm.get('deliveryDate')?.enable({ emitEvent: false });",
    );
    ts = ts.replace(
      'dueDate: this.asDate(order.dueDate) ?? issueDate,',
      'dueDate: this.asDate(order.dueDate) ?? issueDate,\n        deliveryDate: this.asDate(order.deliveryDate) ?? issueDate,',
    );
    ts = ts.replace(
      'dueDate: form.dueDate ?? form.issueDate,',
      'dueDate: form.dueDate ?? form.issueDate,\n      deliveryDate: form.deliveryDate ?? form.issueDate,',
    );
    ts = ts.replace(
      'dueDate: today,',
      'dueDate: today,\n      deliveryDate: today,',
    );
  } else if (extra === 'warehouse' || extra === 'warehouse_invoice') {
    ts = ts.replace(
      "comment: [''],\n",
      "comment: [''],\n" + EXTRA_FORM[extra],
    );
    ts = ts.replace(
      '  salesmen$!: Observable<ISalesman[]>;\n',
      "  salesmen$!: Observable<ISalesman[]>;\n  warehouses$!: Observable<IGroup[]>;\n  warehouseFields = { text: 'fullName', value: 'groupId' };\n",
    );
    if (!ts.includes('IGroup')) {
      ts = ts.replace(
        "import { toastType } from '@shared/enums/enums';",
        "import { toastType } from '@shared/enums/enums';\nimport { IGroup } from '@shared/models/group';",
      );
    }
    ts = ts.replace(
      'this.salesmen$ = this.' + d.camel + 'Service.salesmen$;',
      'this.salesmen$ = this.' + d.camel + 'Service.salesmen$;\n    this.warehouses$ = this.purchaseService.warehouses$;',
    );
    html = html.replace(
      `    <div class="row">
      <div class="col-md-12">
        <ejs-textbox
          placeholder="Comentario"
`,
      EXTRA_HTML[extra] +
        `    <div class="row">
      <div class="col-md-12">
        <ejs-textbox
          placeholder="Comentario"
`,
    );
    let enables =
      "    this.orderForm.get('warehouseId')?.enable({ emitEvent: false });\n    this.orderForm.get('reference')?.enable({ emitEvent: false });";
    if (extra === 'warehouse_invoice') {
      enables += "\n    this.orderForm.get('invoiceId')?.enable({ emitEvent: false });";
    }
    ts = ts.replace(
      "this.orderForm.get('comment')?.enable({ emitEvent: false });",
      "this.orderForm.get('comment')?.enable({ emitEvent: false });\n" + enables,
    );
    let patch_vals = `        warehouseId: Number(order.warehouseId) > 0 ? Number(order.warehouseId) : null,
        reference: order.reference ?? '',`;
    if (extra === 'warehouse_invoice') {
      patch_vals += '\n        invoiceId: Number(order.invoiceId) > 0 ? Number(order.invoiceId) : null,';
    }
    ts = ts.replace('        comment: order.comment ?? \'\',', patch_vals + '\n        comment: order.comment ?? \'\',');
    let save_vals = "      warehouseId: Number(form.warehouseId) || null,\n      reference: form.reference ?? '',";
    if (extra === 'warehouse_invoice') {
      save_vals += '\n      invoiceId: Number(form.invoiceId) || null,';
    }
    ts = ts.replace("      comment: form.comment ?? '',", save_vals + "\n      comment: form.comment ?? '',");
  }

  if (!d.has_discounts) {
    html = html.replace(
      '<div class="col-6">\n        <div class="footer-grid">\n          <div id="' + d.file + '-discounts-grid">',
      '<div class="col-6" *ngIf="false">\n        <div class="footer-grid">\n          <div id="' + d.file + '-discounts-grid">',
    );
  }

  writeUtf8(detailTs, ts);
  writeUtf8(detailHtml, html);

  const svc = path.join(dest, `${d.file}.service.ts`);
  let st = readUtf8(svc);
  let extras_empty = '';
  let extras_norm = '';
  if (extra === 'delivery') {
    extras_empty = '    deliveryDate: null,\n';
    extras_norm = '      deliveryDate: row.deliveryDate ?? null,\n';
  } else {
    extras_empty = '    warehouseId: null,\n    reference: \'\',\n';
    extras_norm = '      warehouseId: Number(row.warehouseId) || null,\n      reference: row.reference ?? \'\',\n';
    if (extra === 'warehouse_invoice') {
      extras_empty += '    invoiceId: null,\n';
      extras_norm += '      invoiceId: Number(row.invoiceId) || null,\n';
    }
  }
  st = st.replace("    comment: '',\n", extras_empty + "    comment: '',\n");
  st = st.replace(
    `      ${d.camel}Id: Number(row.${d.camel}Id) || 0,\n`,
    `      ${d.camel}Id: Number(row.${d.camel}Id) || 0,\n` + extras_norm,
  );
  if (extra === 'delivery') {
    st = st.replace('      dueDate: today,\n', '      dueDate: today,\n      deliveryDate: today,\n');
  }
  writeUtf8(svc, st);

  const model = path.join(dest, `${d.file}.ts`);
  let mt = readUtf8(model);
  let extra_iface = '';
  if (extra === 'delivery') {
    extra_iface = '  deliveryDate?: Date | string | null;\n';
  } else {
    extra_iface = '  warehouseId?: number | null;\n  reference?: string | null;\n';
    if (extra === 'warehouse_invoice') {
      extra_iface += '  invoiceId?: number | null;\n';
    }
  }
  mt = mt.replace('  dueDate?: Date | string | null;\n', '  dueDate?: Date | string | null;\n' + extra_iface);
  writeUtf8(model, mt);
}

function copyAngular(d) {
  const dest = path.join(CUST_DIR, d.folder);
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
  fs.cpSync(QUOTE_DIR, dest, { recursive: true });
  created.push(dest);

  const mapping = {
    'quote.ts': `${d.file}.ts`,
    'quote.service.ts': `${d.file}.service.ts`,
    'quote-grid.ts': `${d.file}-grid.ts`,
    'quote-grid.html': `${d.file}-grid.html`,
    'quote-grid.scss': `${d.file}-grid.scss`,
    'quote-detail.ts': `${d.file}-detail.ts`,
    'quote-detail.html': `${d.file}-detail.html`,
    'quote-detail.scss': `${d.file}-detail.scss`,
  };
  const detailDir = path.join(dest, 'quote-detail');
  if (fs.existsSync(detailDir)) {
    fs.renameSync(detailDir, path.join(dest, `${d.file}-detail`));
  }
  for (const filePath of walkFiles(dest)) {
    const name = path.basename(filePath);
    if (name in mapping) {
      fs.renameSync(filePath, path.join(path.dirname(filePath), mapping[name]));
    }
  }
  for (const filePath of walkFiles(dest)) {
    const ext = path.extname(filePath);
    if (['.ts', '.html', '.scss'].includes(ext)) {
      const text = readUtf8(filePath);
      writeUtf8(filePath, replaceQuoteText(text, d));
    }
  }
  try {
    patchExtraUi(d, dest);
  } catch (err) {
    errors.push(`patch_extra_ui ${d.pascal}: ${err.message}`);
    console.error(`patch_extra_ui failed for ${d.pascal}:`, err.message);
  }
}

function sqlIdent(d) {
  const extra_sel = d.extra_select.length ? ',\n    ' + d.extra_select.join(',\n    ') : '';
  let disc_select = '';
  if (d.has_discounts) {
    disc_select = `
  SELECT
    ${d.id_col},
    ${d.disc_row},
    TRIM(Description) AS Description,
    DiscountRate,
    TotalDiscount,
    ${d.subtotal}
  FROM ${d.discounts}
  WHERE ${d.id_col} = _DocumentId
  ORDER BY ${d.disc_row};
`;
  } else {
    disc_select = `
  SELECT
    0 AS DummyId,
    0 AS DummyRow,
    CAST(NULL AS CHAR) AS Description,
    0 AS DiscountRate,
    0 AS TotalDiscount,
    0 AS DummySubtotal
  FROM DUAL
  WHERE 1 = 0;
`;
  }
  const discDelete = d.has_discounts
    ? `  DELETE FROM ${d.discounts} WHERE ${d.id_col} = _DocumentId;`
    : '';
  return `USE llion_staging;

DROP PROCEDURE IF EXISTS ${d.table}_get;
DROP PROCEDURE IF EXISTS ${d.table}_document_get;
DROP PROCEDURE IF EXISTS ${d.table}_delete;
DROP PROCEDURE IF EXISTS ${d.table}_next_number;

DELIMITER $$

CREATE PROCEDURE ${d.table}_get(
  IN _OrganizationId INT,
  IN _DocumentId     INT
)
BEGIN
  IF _DocumentId IS NULL OR _DocumentId = 0 THEN
    SELECT
      q.${d.id_col},
      q.${d.number_col_db},
      q.${d.series_col},
      q.IssueDate,
      q.DueDate,
      q.CustomerId,
      c.AlternCode AS CustomerCode,
      TRIM(IFNULL(c.Description, '')) AS CustomerName,
      TRIM(q.Commen) AS Comment,
      q.SalesmanId,
      TRIM(IFNULL(s.Description, '')) AS SalesmanName,
      q.AccountId,
      q.ClassId,
      q.TotalItems,
      q.TotalWeight,
      q.TotalPrice,
      q.TotalDiscounts,
      q.TotalTaxes,
      q.${d.total_col},
      q.${d.type_col} AS Status,
      ${d.status_sql} AS StatusName,
      q.LockedDate,
      q.OrganizationId${extra_sel}
    FROM ${d.table} q
    LEFT JOIN cus_customer c ON c.CustomerId = q.CustomerId
    LEFT JOIN cus_salesforce_salesman s ON s.SalesmanId = q.SalesmanId
    WHERE (_OrganizationId IS NULL OR q.OrganizationId = _OrganizationId)
    ORDER BY q.IssueDate DESC, q.${d.id_col} DESC
    LIMIT 500;
  ELSE
    SELECT
      q.${d.id_col},
      q.${d.number_col_db},
      q.${d.series_col},
      q.IssueDate,
      q.DueDate,
      q.CustomerId,
      c.AlternCode AS CustomerCode,
      TRIM(IFNULL(c.Description, '')) AS CustomerName,
      TRIM(q.Commen) AS Comment,
      q.SalesmanId,
      TRIM(IFNULL(s.Description, '')) AS SalesmanName,
      q.AccountId,
      q.ClassId,
      q.TotalItems,
      q.TotalWeight,
      q.TotalPrice,
      q.TotalDiscounts,
      q.TotalTaxes,
      q.${d.total_col},
      q.${d.type_col} AS Status,
      ${d.status_sql} AS StatusName,
      q.LockedDate,
      q.OrganizationId${extra_sel}
    FROM ${d.table} q
    LEFT JOIN cus_customer c ON c.CustomerId = q.CustomerId
    LEFT JOIN cus_salesforce_salesman s ON s.SalesmanId = q.SalesmanId
    WHERE q.${d.id_col} = _DocumentId;
  END IF;
END$$

CREATE PROCEDURE ${d.table}_document_get(
  IN _DocumentId INT
)
BEGIN
  SELECT
    q.${d.id_col},
    q.${d.number_col_db},
    q.${d.series_col},
    q.IssueDate,
    q.DueDate,
    q.CustomerId,
    c.AlternCode AS CustomerCode,
    TRIM(IFNULL(c.Description, '')) AS CustomerName,
    TRIM(IFNULL(c.BillingPrice, '')) AS BillingPrice,
    TRIM(q.Commen) AS Comment,
    q.SalesmanId,
    TRIM(IFNULL(s.Description, '')) AS SalesmanName,
    q.AccountId,
    q.ClassId,
    q.TotalItems,
    q.TotalWeight,
    q.TotalPrice,
    q.TotalDiscounts,
    q.TotalTaxes,
    q.${d.total_col},
    q.${d.type_col} AS Status,
    ${d.status_sql} AS StatusName,
    q.LockedDate,
    q.OrganizationId${extra_sel}
  FROM ${d.table} q
  LEFT JOIN cus_customer c ON c.CustomerId = q.CustomerId
  LEFT JOIN cus_salesforce_salesman s ON s.SalesmanId = q.SalesmanId
  WHERE q.${d.id_col} = _DocumentId;

  SELECT
    d.${d.id_col},
    d.${d.row_col},
    d.MerchandiseId,
    TRIM(IFNULL(m.AlternCode, '')) AS ItemCode,
    TRIM(IFNULL(d.Description, m.Name)) AS Description,
    d.TaxCode,
    d.TaxRate,
    d.Quantity,
    d.Unit,
    d.Weight,
    d.PriceByUnit,
    d.MerchandiseDiscount,
    d.CustomerDiscount,
    d.PriceOfferDiscount,
    d.TotalPrice,
    d.TotalDiscount,
    d.TotalPriceAndDiscounts,
    d.${d.row_type},
    CASE WHEN d.${d.row_type} = 1 THEN 'Servicio' ELSE 'Normal' END AS ${d.row_type}Name
  FROM ${d.detail} d
  LEFT JOIN mer_merchandise m ON m.MerchandiseId = d.MerchandiseId
  WHERE d.${d.id_col} = _DocumentId
  ORDER BY d.${d.row_col};

  SELECT
    ${d.id_col},
    TRIM(TaxCode) AS TaxCode,
    TaxRate,
    TaxBase,
    TotalTax
  FROM ${d.taxes}
  WHERE ${d.id_col} = _DocumentId
  ORDER BY TaxCode;
${disc_select}
END$$

CREATE PROCEDURE ${d.table}_delete(
  IN  _DocumentId INT,
  OUT _return      INT
)
BEGIN
  DELETE FROM ${d.taxes} WHERE ${d.id_col} = _DocumentId;
${discDelete}
  DELETE FROM ${d.detail} WHERE ${d.id_col} = _DocumentId;
  DELETE FROM ${d.table}
  WHERE ${d.id_col} = _DocumentId
    AND LockedDate IS NULL;
  SET _return = IF(ROW_COUNT() > 0, _DocumentId, 0);
END$$

CREATE PROCEDURE ${d.table}_next_number(
  IN  p_OrganizationId INT,
  OUT p_Code          VARCHAR(32)
)
BEGIN
  DECLARE v_Module VARCHAR(255) DEFAULT NULL;
  DECLARE v_CntRaw VARCHAR(100) DEFAULT '0';
  DECLARE v_Pad    INT DEFAULT 8;
  DECLARE v_Next   INT DEFAULT 1;

  SELECT Module, IFNULL(Counter, '0')
    INTO v_Module, v_CntRaw
  FROM app_counters
  WHERE CounterDescription = '${d.counter}'
    AND (p_OrganizationId IS NULL OR OrganizationId = p_OrganizationId)
  LIMIT 1;

  IF v_Module IS NULL OR TRIM(v_Module) = '' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Counter not found for ${d.counter} / OrganizationId';
  END IF;

  SET v_Pad = GREATEST(CHAR_LENGTH(TRIM(v_CntRaw)), 8);
  SET v_Next = CAST(IFNULL(NULLIF(TRIM(v_CntRaw), ''), '0') AS UNSIGNED) + 1;
  SET p_Code = CONCAT(TRIM(v_Module), LPAD(v_Next, v_Pad, '0'));

  UPDATE app_counters
  SET Counter = LPAD(v_Next, v_Pad, '0')
  WHERE CounterDescription = '${d.counter}'
    AND (p_OrganizationId IS NULL OR OrganizationId = p_OrganizationId);

  IF ROW_COUNT() = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Counter not found for ${d.counter} / OrganizationId';
  END IF;
END$$

DELIMITER ;
`;
}

function sqlSave(d) {
  const extra_params = d.extra_params.map(([name, typ]) => `  IN  ${name} ${typ},\n`).join('');
  let extra_update = d.extra_update.join(',\n        ');
  let extra_insert_cols = d.extra_insert.join(',\n      ');
  let extra_insert_vals = d.extra_insert_vals.join(',\n      ');
  if (extra_update) {
    extra_update = ',\n        ' + extra_update;
  }
  if (extra_insert_cols) {
    extra_insert_cols = ',\n      ' + extra_insert_cols;
    extra_insert_vals = ',\n      ' + extra_insert_vals;
  }
  const disc_delete = d.has_discounts
    ? `    DELETE FROM ${d.discounts} WHERE ${d.id_col} = v_Id;\n`
    : '';
  let disc_block = '';
  if (d.has_discounts) {
    disc_block = `
    INSERT INTO ${d.discounts} (
      ${d.id_col}, ${d.disc_row}, Description, DiscountRate, TotalDiscount, ${d.subtotal}
    )
    SELECT
      v_Id,
      COALESCE(j.DiscRow, j.DiscRowCamel, 0),
      NULLIF(TRIM(COALESCE(j.Description, j.DescriptionCamel)), ''),
      COALESCE(j.DiscountRate, j.DiscountRateCamel, 0),
      COALESCE(j.TotalDiscount, j.TotalDiscountCamel, 0),
      COALESCE(j.Subtotal, j.SubtotalCamel, 0)
    FROM JSON_TABLE(
      COALESCE(_Discounts, CAST('[]' AS JSON)),
      '$[*]' COLUMNS (
        DiscRow INT PATH '$.${d.disc_row}',
        DiscRowCamel INT PATH '$.${d.camel}DiscountRowNumber',
        Description VARCHAR(255) PATH '$.Description',
        DescriptionCamel VARCHAR(255) PATH '$.description',
        DiscountRate DECIMAL(6, 4) PATH '$.DiscountRate',
        DiscountRateCamel DECIMAL(6, 4) PATH '$.discountRate',
        TotalDiscount DECIMAL(19, 2) PATH '$.TotalDiscount',
        TotalDiscountCamel DECIMAL(19, 2) PATH '$.totalDiscount',
        Subtotal DECIMAL(19, 2) PATH '$.${d.subtotal}',
        SubtotalCamel DECIMAL(19, 2) PATH '$.subtotal${d.pascal}'
      )
    ) AS j;

    SELECT IFNULL(SUM(COALESCE(TotalPriceAndDiscounts, TotalPrice, 0)), 0)
      INTO v_LineBase
    FROM ${d.detail}
    WHERE ${d.id_col} = v_Id;

    BEGIN
      DECLARE v_DiscRow INT;
      DECLARE v_Rate DECIMAL(6, 4) DEFAULT 0;
      DECLARE v_DiscAmt DECIMAL(18, 2) DEFAULT 0;
      DECLARE v_Running DECIMAL(18, 2) DEFAULT 0;
      DECLARE v_Done INT DEFAULT 0;
      DECLARE disc_cur CURSOR FOR
        SELECT ${d.disc_row}, IFNULL(DiscountRate, 0)
        FROM ${d.discounts}
        WHERE ${d.id_col} = v_Id
        ORDER BY ${d.disc_row};
      DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_Done = 1;
      SET v_Running = v_LineBase;
      OPEN disc_cur;
      disc_loop: LOOP
        FETCH disc_cur INTO v_DiscRow, v_Rate;
        IF v_Done = 1 THEN LEAVE disc_loop; END IF;
        SET v_DiscAmt = ROUND(v_Running * v_Rate, 2);
        SET v_Running = ROUND(GREATEST(0, v_Running - v_DiscAmt), 2);
        UPDATE ${d.discounts}
        SET TotalDiscount = v_DiscAmt, ${d.subtotal} = v_Running
        WHERE ${d.id_col} = v_Id AND ${d.disc_row} = v_DiscRow;
      END LOOP;
      CLOSE disc_cur;
    END;
`;
  }
  let iva_disc = '';
  if (d.has_discounts) {
    iva_disc = `
    BEGIN
      DECLARE v_IvaDiscRate DECIMAL(6, 4) DEFAULT 0;
      DECLARE v_IvaDiscDone INT DEFAULT 0;
      DECLARE iva_disc_cur CURSOR FOR
        SELECT IFNULL(DiscountRate, 0) FROM ${d.discounts}
        WHERE ${d.id_col} = v_Id ORDER BY ${d.disc_row};
      DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_IvaDiscDone = 1;
      OPEN iva_disc_cur;
      iva_disc_loop: LOOP
        FETCH iva_disc_cur INTO v_IvaDiscRate;
        IF v_IvaDiscDone = 1 THEN LEAVE iva_disc_loop; END IF;
        UPDATE tmp_iva_bases SET TaxBase = ROUND(GREATEST(0, TaxBase - ROUND(TaxBase * v_IvaDiscRate, 2)), 2);
      END LOOP;
      CLOSE iva_disc_cur;
    END;
`;
  }
  const tot_disc = d.has_discounts
    ? `    SELECT IFNULL(SUM(TotalDiscount), 0) INTO v_TotalDiscounts FROM ${d.discounts} WHERE ${d.id_col} = v_Id;`
    : '    SET v_TotalDiscounts = 0;';
  const type_insert = `,\n      ${d.type_col}`;
  const type_val = ',\n      0';
  return `USE llion_staging;

DROP PROCEDURE IF EXISTS ${d.table}_save;

DELIMITER $$

CREATE PROCEDURE ${d.table}_save(
  IN  _${d.id_col} INT,
  IN  _${d.number_col_db} VARCHAR(255),
  IN  _${d.series_col} VARCHAR(255),
  IN  _CustomerId      INT,
  IN  _IssueDate       DATE,
  IN  _DueDate         DATE,
${extra_params}  IN  _Comment         LONGTEXT,
  IN  _SalesmanId      INT,
  IN  _AccountId       INT,
  IN  _ClassId         INT,
  IN  _OrganizationId  INT,
  IN  _Lines           JSON,
  IN  _Discounts       JSON,
  OUT _return          INT
)
BEGIN
  DECLARE v_Id INT DEFAULT IFNULL(_${d.id_col}, 0);
  DECLARE v_Ok TINYINT DEFAULT 0;
  DECLARE v_TotalItems INT DEFAULT 0;
  DECLARE v_TotalWeight DECIMAL(10, 4) DEFAULT 0;
  DECLARE v_TotalPrice DECIMAL(18, 2) DEFAULT 0;
  DECLARE v_TotalDiscounts DECIMAL(18, 2) DEFAULT 0;
  DECLARE v_TotalTaxes DECIMAL(19, 2) DEFAULT 0;
  DECLARE v_Total DECIMAL(18, 2) DEFAULT 0;
  DECLARE v_Number VARCHAR(255);
  DECLARE v_OrgId INT DEFAULT IFNULL(_OrganizationId, 0);
  DECLARE v_TaxDate DATE DEFAULT COALESCE(_IssueDate, CURDATE());
  DECLARE v_LineBase DECIMAL(18, 2) DEFAULT 0;
  DECLARE v_Due DATE DEFAULT COALESCE(_DueDate, _IssueDate);

  SET _return = 0;

  IF v_Id > 0 THEN
    IF EXISTS (SELECT 1 FROM ${d.table} WHERE ${d.id_col} = v_Id AND LockedDate IS NOT NULL) THEN
      SET v_Ok = 0;
    ELSEIF NOT EXISTS (SELECT 1 FROM ${d.table} WHERE ${d.id_col} = v_Id) THEN
      SET v_Ok = 0;
    ELSE
      UPDATE ${d.table}
      SET
        ${d.series_col} = _${d.series_col},
        CustomerId = _CustomerId,
        IssueDate = _IssueDate,
        DueDate = v_Due,
        Commen = _Comment,
        SalesmanId = NULLIF(_SalesmanId, 0),
        AccountId = NULLIF(_AccountId, 0),
        ClassId = NULLIF(_ClassId, 0),
        OrganizationId = COALESCE(_OrganizationId, OrganizationId)${extra_update}
      WHERE ${d.id_col} = v_Id AND LockedDate IS NULL;
      SET v_Ok = 1;
    END IF;
  ELSE
    SET v_Number = NULLIF(TRIM(_${d.number_col_db}), '');
    IF v_Number IS NULL THEN
      CALL ${d.table}_next_number(_OrganizationId, v_Number);
    END IF;
    INSERT INTO ${d.table} (
      ${d.number_col_db}, ${d.series_col}, CustomerId, IssueDate, DueDate, Commen,
      SalesmanId, AccountId, ClassId${type_insert}${extra_insert_cols}, OrganizationId
    ) VALUES (
      v_Number, _${d.series_col}, _CustomerId, _IssueDate, v_Due, _Comment,
      NULLIF(_SalesmanId, 0), NULLIF(_AccountId, 0), NULLIF(_ClassId, 0)${type_val}${extra_insert_vals}, _OrganizationId
    );
    SET v_Id = LAST_INSERT_ID();
    SET v_Ok = IF(v_Id > 0, 1, 0);
  END IF;

  IF v_Ok = 1 AND v_Id > 0 THEN
    IF v_OrgId <= 0 THEN
      SELECT IFNULL(OrganizationId, 0) INTO v_OrgId FROM ${d.table} WHERE ${d.id_col} = v_Id;
    END IF;
    DELETE FROM ${d.taxes} WHERE ${d.id_col} = v_Id;
${disc_delete}    DELETE FROM ${d.detail} WHERE ${d.id_col} = v_Id;

    INSERT INTO ${d.detail} (
      ${d.id_col}, ${d.row_col}, MerchandiseId, Description, TaxCode, TaxRate, Quantity, Unit, Weight,
      PriceByUnit, MerchandiseDiscount, CustomerDiscount, PriceOfferDiscount, TotalPrice, TotalDiscount,
      TotalPriceAndDiscounts, ${d.row_type}
    )
    SELECT
      v_Id,
      COALESCE(j.RowNumber, j.RowNumberCamel, 0),
      NULLIF(COALESCE(j.MerchandiseId, j.MerchandiseIdCamel), 0),
      NULLIF(TRIM(COALESCE(j.Description, j.DescriptionCamel)), ''),
      NULLIF(LEFT(UPPER(TRIM(COALESCE(j.TaxCode, j.TaxCodeCamel))), 1), ''),
      NULL,
      COALESCE(j.Quantity, j.QuantityCamel, 0),
      NULLIF(TRIM(COALESCE(j.Unit, j.UnitCamel)), ''),
      COALESCE(j.Weight, j.WeightCamel, 0),
      COALESCE(j.PriceByUnit, j.PriceByUnitCamel, 0),
      COALESCE(j.MerchandiseDiscount, j.MerchandiseDiscountCamel, 0),
      COALESCE(j.CustomerDiscount, j.CustomerDiscountCamel, 0),
      COALESCE(j.PriceOfferDiscount, j.PriceOfferDiscountCamel, 0),
      COALESCE(j.TotalPrice, j.TotalPriceCamel, 0),
      COALESCE(j.TotalDiscount, j.TotalDiscountCamel, 0),
      COALESCE(j.TotalPriceAndDiscounts, j.TotalPriceAndDiscountsCamel, j.TotalPrice, j.TotalPriceCamel, 0),
      COALESCE(j.RowType, j.RowTypeCamel, 0)
    FROM JSON_TABLE(
      COALESCE(_Lines, CAST('[]' AS JSON)),
      '$[*]' COLUMNS (
        RowNumber INT PATH '$.${d.row_col}',
        RowNumberCamel INT PATH '$.${d.camel}RowNumber',
        MerchandiseId INT PATH '$.MerchandiseId',
        MerchandiseIdCamel INT PATH '$.merchandiseId',
        Description VARCHAR(255) PATH '$.Description',
        DescriptionCamel VARCHAR(255) PATH '$.description',
        TaxCode VARCHAR(5) PATH '$.TaxCode',
        TaxCodeCamel VARCHAR(5) PATH '$.taxCode',
        Quantity DECIMAL(10, 3) PATH '$.Quantity',
        QuantityCamel DECIMAL(10, 3) PATH '$.quantity',
        Unit VARCHAR(30) PATH '$.Unit',
        UnitCamel VARCHAR(30) PATH '$.unit',
        Weight DECIMAL(10, 3) PATH '$.Weight',
        WeightCamel DECIMAL(10, 3) PATH '$.weight',
        PriceByUnit DECIMAL(19, 2) PATH '$.PriceByUnit',
        PriceByUnitCamel DECIMAL(19, 2) PATH '$.priceByUnit',
        MerchandiseDiscount DECIMAL(6, 4) PATH '$.MerchandiseDiscount',
        MerchandiseDiscountCamel DECIMAL(6, 4) PATH '$.merchandiseDiscount',
        CustomerDiscount DECIMAL(6, 4) PATH '$.CustomerDiscount',
        CustomerDiscountCamel DECIMAL(6, 4) PATH '$.customerDiscount',
        PriceOfferDiscount DECIMAL(6, 4) PATH '$.PriceOfferDiscount',
        PriceOfferDiscountCamel DECIMAL(6, 4) PATH '$.priceOfferDiscount',
        TotalPrice DECIMAL(19, 2) PATH '$.TotalPrice',
        TotalPriceCamel DECIMAL(19, 2) PATH '$.totalPrice',
        TotalDiscount DECIMAL(19, 2) PATH '$.TotalDiscount',
        TotalDiscountCamel DECIMAL(19, 2) PATH '$.totalDiscount',
        TotalPriceAndDiscounts DECIMAL(19, 2) PATH '$.TotalPriceAndDiscounts',
        TotalPriceAndDiscountsCamel DECIMAL(19, 2) PATH '$.totalPriceAndDiscounts',
        RowType INT PATH '$.${d.row_type}',
        RowTypeCamel INT PATH '$.${d.camel}RowType'
      )
    ) AS j;

    UPDATE ${d.detail} d
    INNER JOIN mer_merchandise m ON m.MerchandiseId = d.MerchandiseId
    SET d.Description = LEFT(TRIM(m.Name), 255)
    WHERE d.${d.id_col} = v_Id AND IFNULL(TRIM(m.Name), '') <> '';

    UPDATE ${d.detail}
    SET
      TotalPriceAndDiscounts = GREATEST(0, ROUND((
        ROUND(ROUND(IFNULL(Quantity,0)*IFNULL(PriceByUnit,0),2)
          - ROUND(IFNULL(Quantity,0)*IFNULL(PriceByUnit,0)*IFNULL(MerchandiseDiscount,0),2), 2)
        - ROUND((ROUND(IFNULL(Quantity,0)*IFNULL(PriceByUnit,0),2)
          - ROUND(IFNULL(Quantity,0)*IFNULL(PriceByUnit,0)*IFNULL(MerchandiseDiscount,0),2)) * IFNULL(CustomerDiscount,0), 2)
      ) - ROUND((
        ROUND(ROUND(IFNULL(Quantity,0)*IFNULL(PriceByUnit,0),2)
          - ROUND(IFNULL(Quantity,0)*IFNULL(PriceByUnit,0)*IFNULL(MerchandiseDiscount,0),2), 2)
        - ROUND((ROUND(IFNULL(Quantity,0)*IFNULL(PriceByUnit,0),2)
          - ROUND(IFNULL(Quantity,0)*IFNULL(PriceByUnit,0)*IFNULL(MerchandiseDiscount,0),2)) * IFNULL(CustomerDiscount,0), 2)
      ) * IFNULL(PriceOfferDiscount,0), 2), 2)),
      TotalDiscount = GREATEST(0, ROUND(IFNULL(Quantity,0)*IFNULL(PriceByUnit,0),2) - TotalPriceAndDiscounts),
      TotalPrice = TotalPriceAndDiscounts
    WHERE ${d.id_col} = v_Id;
${disc_block}
    UPDATE ${d.detail} d
    LEFT JOIN (
      SELECT RateType, Rate FROM (
        SELECT CASE WHEN TRIM(IFNULL(t.RateType,'')) IN ('','E') THEN 'E' ELSE TRIM(t.RateType) END AS RateType,
               t.Rate, ROW_NUMBER() OVER (PARTITION BY CASE WHEN TRIM(IFNULL(t.RateType,'')) IN ('','E') THEN 'E' ELSE TRIM(t.RateType) END ORDER BY t.TaxDateFrom DESC) AS rn
        FROM app_taxes t WHERE t.OrganizationId = v_OrgId AND t.TaxDateFrom <= v_TaxDate
      ) ranked WHERE rn = 1
    ) iva ON iva.RateType = CASE WHEN TRIM(IFNULL(d.TaxCode,'')) IN ('','E') THEN 'E' ELSE LEFT(UPPER(TRIM(d.TaxCode)),1) END
    SET d.TaxRate = IFNULL(iva.Rate, 0)
    WHERE d.${d.id_col} = v_Id;

    DROP TEMPORARY TABLE IF EXISTS tmp_iva_bases;
    CREATE TEMPORARY TABLE tmp_iva_bases (TaxCode VARCHAR(5) NOT NULL, TaxBase DECIMAL(18,2) NOT NULL DEFAULT 0);
    INSERT INTO tmp_iva_bases (TaxCode, TaxBase)
    SELECT CASE WHEN TRIM(IFNULL(d.TaxCode,'')) IN ('','E') THEN 'E' ELSE LEFT(UPPER(TRIM(d.TaxCode)),1) END,
           ROUND(SUM(COALESCE(d.TotalPriceAndDiscounts, d.TotalPrice, 0)), 2)
    FROM ${d.detail} d WHERE d.${d.id_col} = v_Id
    GROUP BY CASE WHEN TRIM(IFNULL(d.TaxCode,'')) IN ('','E') THEN 'E' ELSE LEFT(UPPER(TRIM(d.TaxCode)),1) END;
${iva_disc}
    INSERT INTO ${d.taxes} (${d.id_col}, TaxCode, TaxRate, TaxBase, TotalTax)
    SELECT v_Id, bases.TaxCode, IFNULL(iva.Rate, 0.0000), bases.TaxBase, ROUND(bases.TaxBase * IFNULL(iva.Rate, 0), 2)
    FROM tmp_iva_bases bases
    LEFT JOIN (
      SELECT RateType, Rate FROM (
        SELECT CASE WHEN TRIM(IFNULL(t.RateType,'')) IN ('','E') THEN 'E' ELSE TRIM(t.RateType) END AS RateType,
               t.Rate, ROW_NUMBER() OVER (PARTITION BY CASE WHEN TRIM(IFNULL(t.RateType,'')) IN ('','E') THEN 'E' ELSE TRIM(t.RateType) END ORDER BY t.TaxDateFrom DESC) AS rn
        FROM app_taxes t WHERE t.OrganizationId = v_OrgId AND t.TaxDateFrom <= v_TaxDate
      ) ranked WHERE rn = 1
    ) iva ON iva.RateType = bases.TaxCode;
    DROP TEMPORARY TABLE IF EXISTS tmp_iva_bases;

    SELECT COUNT(*), IFNULL(SUM(Weight),0), IFNULL(SUM(COALESCE(TotalPriceAndDiscounts, TotalPrice, 0)),0)
      INTO v_TotalItems, v_TotalWeight, v_TotalPrice
    FROM ${d.detail} WHERE ${d.id_col} = v_Id;
${tot_disc}
    SELECT IFNULL(SUM(TotalTax), 0) INTO v_TotalTaxes FROM ${d.taxes} WHERE ${d.id_col} = v_Id;
    SET v_Total = v_TotalPrice - v_TotalDiscounts + v_TotalTaxes;
    UPDATE ${d.table} SET
      TotalItems = v_TotalItems, TotalWeight = v_TotalWeight, TotalPrice = v_TotalPrice,
      TotalDiscounts = v_TotalDiscounts, TotalTaxes = v_TotalTaxes, ${d.total_col} = v_Total
    WHERE ${d.id_col} = v_Id;
    SET _return = v_Id;
  END IF;
END$$

DELIMITER ;
`;
}

function writeCsharp(d) {
  const P = d.pascal;
  let extra_props = '';
  let extra_save = '';
  if (d.extra_ui === 'delivery') {
    extra_props = '        public DateTime? DeliveryDate { get; set; }\n';
    extra_save = '                _DeliveryDate = doc.DeliveryDate,\n';
  } else {
    extra_props = '        public int? WarehouseId { get; set; }\n        public string Reference { get; set; }\n';
    extra_save = '                _WarehouseId = doc.WarehouseId,\n                _Reference = doc.Reference,\n';
    if (d.extra_ui === 'warehouse_invoice') {
      extra_props += '        public int? InvoiceId { get; set; }\n';
      extra_save += '                _InvoiceId = doc.InvoiceId,\n';
    }
  }
  const modelPath = path.join(API, 'Models', 'Customers', `${P}.cs`);
  fs.writeFileSync(
    modelPath,
    `using System;
using System.Collections.Generic;

namespace llionAPI.Models.Customers
{
    public class ${P}
    {
        public int ${d.id_col} { get; set; }
        public string ${d.number_col_db} { get; set; }
        public string ${d.series_col} { get; set; }
        public int? CustomerId { get; set; }
        public string CustomerCode { get; set; }
        public string CustomerName { get; set; }
        public string BillingPrice { get; set; }
        public DateTime? IssueDate { get; set; }
        public DateTime? DueDate { get; set; }
${extra_props}        public string Comment { get; set; }
        public int? SalesmanId { get; set; }
        public string SalesmanName { get; set; }
        public int? AccountId { get; set; }
        public int? ClassId { get; set; }
        public int? TotalItems { get; set; }
        public decimal? TotalWeight { get; set; }
        public decimal? TotalPrice { get; set; }
        public decimal? TotalDiscounts { get; set; }
        public decimal? TotalTaxes { get; set; }
        public decimal? ${d.total_col} { get; set; }
        public int? Status { get; set; }
        public string StatusName { get; set; }
        public DateTime? LockedDate { get; set; }
        public int OrganizationId { get; set; }
        public IEnumerable<${P}Line> Lines { get; set; }
        public IEnumerable<${P}Tax> Taxes { get; set; }
        public IEnumerable<${P}Discount> Discounts { get; set; }
    }

    public class ${P}Line
    {
        public int ${d.id_col} { get; set; }
        public int ${d.row_col} { get; set; }
        public int? MerchandiseId { get; set; }
        public string ItemCode { get; set; }
        public string Description { get; set; }
        public string TaxCode { get; set; }
        public decimal? TaxRate { get; set; }
        public decimal? Quantity { get; set; }
        public string Unit { get; set; }
        public decimal? Weight { get; set; }
        public decimal? PriceByUnit { get; set; }
        public decimal? MerchandiseDiscount { get; set; }
        public decimal? CustomerDiscount { get; set; }
        public decimal? PriceOfferDiscount { get; set; }
        public decimal? TotalPrice { get; set; }
        public decimal? TotalDiscount { get; set; }
        public decimal? TotalPriceAndDiscounts { get; set; }
        public int? ${d.row_type} { get; set; }
        public string ${d.row_type}Name { get; set; }
    }

    public class ${P}Tax
    {
        public int ${d.id_col} { get; set; }
        public string TaxCode { get; set; }
        public decimal? TaxRate { get; set; }
        public decimal? TaxBase { get; set; }
        public decimal? TotalTax { get; set; }
    }

    public class ${P}Discount
    {
        public int ${d.id_col} { get; set; }
        public int ${d.disc_row} { get; set; }
        public string Description { get; set; }
        public decimal? DiscountRate { get; set; }
        public decimal? TotalDiscount { get; set; }
        public decimal? ${d.subtotal} { get; set; }
    }
}
`,
    'utf8',
  );
  created.push(modelPath);

  const repoPath = path.join(API, 'Repositories', 'Customers', `${P}Repository.cs`);
  fs.writeFileSync(
    repoPath,
    `using BaseLib.Data;
using Dapper;
using llionAPI.Models.Customers;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text.Json;

namespace llionAPI.Repositories.Customers
{
    public class ${P}Repository
    {
        private static readonly JsonSerializerOptions JsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = null
        };

        private readonly MySQLDataAccessor _accessor;

        public ${P}Repository(MySQLDataAccessor accessor)
        {
            _accessor = accessor;
        }

        public IEnumerable<${P}> GetList(int organizationId, int? documentId)
        {
            return _accessor.Query<${P}>("${d.table}_get", new
            {
                _OrganizationId = organizationId,
                _DocumentId = documentId
            }, CommandType.StoredProcedure) ?? Enumerable.Empty<${P}>();
        }

        public ${P} GetDocument(int documentId)
        {
            if (documentId <= 0)
            {
                return null;
            }

            return _accessor.QuerySingle("${d.table}_document_get",
                (reader) =>
                {
                    var header = reader.Read<${P}>().FirstOrDefault();
                    var lines = reader.Read<${P}Line>().ToList();
                    var taxes = reader.Read<${P}Tax>().ToList();
                    var discounts = reader.Read<${P}Discount>().ToList();
                    if (header == null)
                    {
                        return null;
                    }
                    header.Lines = lines;
                    header.Taxes = taxes;
                    header.Discounts = discounts;
                    return header;
                },
                new { _DocumentId = documentId });
        }

        public string GetNextNumber(int organizationId)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_OrganizationId", organizationId);
            parameters.Add("p_Code", dbType: DbType.String, size: 32, direction: ParameterDirection.Output);
            _accessor.Execute("${d.table}_next_number", parameters);
            return parameters.Get<string>("p_Code") ?? string.Empty;
        }

        public int Save(${P} doc)
        {
            if (doc == null)
            {
                return 0;
            }

            return _accessor.Insert("${d.table}_save", new
            {
                _${d.id_col} = doc.${d.id_col},
                _${d.number_col_db} = doc.${d.number_col_db},
                _${d.series_col} = doc.${d.series_col},
                _CustomerId = doc.CustomerId,
                _IssueDate = doc.IssueDate,
                _DueDate = doc.DueDate,
${extra_save}                _Comment = doc.Comment,
                _SalesmanId = doc.SalesmanId,
                _AccountId = doc.AccountId,
                _ClassId = doc.ClassId,
                _OrganizationId = doc.OrganizationId,
                _Lines = JsonSerializer.Serialize(doc.Lines ?? Enumerable.Empty<${P}Line>(), JsonOptions),
                _Discounts = JsonSerializer.Serialize(doc.Discounts ?? Enumerable.Empty<${P}Discount>(), JsonOptions),
                _return = 0
            });
        }

        public int? Delete(int documentId)
        {
            return _accessor.Update("${d.table}_delete", new
            {
                _DocumentId = documentId,
                _return = 0
            });
        }
    }
}
`,
    'utf8',
  );
  created.push(repoPath);

  const ctrl_map = {
    salesorders: 'SalesOrders',
    deliverynotes: 'DeliveryNotes',
    salesinvoices: 'SalesInvoices',
    salescreditnotes: 'SalesCreditNotes',
    salesdebitnotes: 'SalesDebitNotes',
  };
  const C = ctrl_map[d.api];
  const ctrlPath = path.join(API, 'Controllers', `${C}Controller.cs`);
  fs.writeFileSync(
    ctrlPath,
    `using BaseLib.Api;
using llionAPI.Models.Customers;
using llionAPI.Repositories.Customers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;

namespace llionAPI.Controllers
{
    public class ${C}Controller : LlionApiController
    {
        private readonly ILogger<${C}Controller> _logger;
        private readonly ${P}Repository _repo;

        public ${C}Controller(ILogger<${C}Controller> logger, ${P}Repository repo)
        {
            _logger = logger;
            _repo = repo;
        }

        [HttpGet("document/{id:int}")]
        public IActionResult GetDocument(int id) => Results(() => _repo.GetDocument(id));

        [HttpGet("next/{organizationId:int}")]
        public IActionResult GetNext(int organizationId) =>
            Results(() => new { code = _repo.GetNextNumber(organizationId) });

        [HttpGet("{organizationId:int}/{id:int}")]
        public IActionResult GetList(int organizationId, int id) =>
            Results(() => _repo.GetList(organizationId, id == 0 ? null : id) ?? new List<${P}>());

        [HttpDelete("{id:int}")]
        public IActionResult Delete(int id) => Results(() => _repo.Delete(id));

        [HttpPost]
        [HttpPut]
        public IActionResult Save([FromBody] ${P} doc) => Results(() => _repo.Save(doc));
    }
}
`,
    'utf8',
  );
  created.push(ctrlPath);
}

function main() {
  for (const d of DOCS) {
    const getSql = path.join(API, 'Sql', `${d.table}_get.sql`);
    const saveSql = path.join(API, 'Sql', `${d.table}_save.sql`);
    fs.writeFileSync(getSql, sqlIdent(d), 'utf8');
    fs.writeFileSync(saveSql, sqlSave(d), 'utf8');
    created.push(getSql, saveSql);
    writeCsharp(d);
    try {
      copyAngular(d);
    } catch (err) {
      errors.push(`copy_angular ${d.pascal}: ${err.message}`);
      console.error(`copy_angular failed for ${d.pascal}:`, err.message);
    }
    console.log('generated', d.pascal);
  }
}

main();
