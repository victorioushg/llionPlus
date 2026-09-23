import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import {
  EditSettingsModel,
  ToolbarItems,
  TreeGridComponent,
} from '@syncfusion/ej2-angular-treegrid';
import { fromEvent, Subject, take, takeUntil } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { withToolbarTitle } from '@shared/utils/grid-toolbar';
import { applyGridHeightAboveFooter } from '@shared/utils/layout';
import { ClassesService } from './classes.service';
import { IAccountClass, IClassTreeRow } from './class';

@Component({
  selector: 'llion-content',
  templateUrl: './classes-grid.html',
  styleUrls: ['./classes-grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ClassesComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('classesgrid') classesGrid?: TreeGridComponent;
  @ViewChild('classForm') classForm?: NgForm;

  classRows: IClassTreeRow[] = [];
  classData: IAccountClass = this.createEmptyClass();
  classesGridHeight = 320;
  readonly classesGridRowHeight = 36;

  activeOptions = [
    { text: 'Sí', value: true },
    { text: 'No', value: false },
  ];
  activeFields = { text: 'text', value: 'value' };

  classesToolbar = withToolbarTitle(
    ['Add', 'Edit', 'Delete', 'Search'],
    'Centro de costos'
  ) as ToolbarItems[];

  classesEditSettings: EditSettingsModel = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    mode: 'Dialog',
    allowEditOnDblClick: true,
    showDeleteConfirmDialog: true,
    newRowPosition: 'Below',
  };

  private flatRows: IAccountClass[] = [];
  private collapseOnBind = false;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private classesService: ClassesService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.classesService.classes$
      .pipe(takeUntil(this.destroy$))
      .subscribe((rows) => {
        this.flatRows = rows ?? [];
        this.collapseOnBind = true;
        this.classRows = this.buildTreeRows(this.flatRows);
        this.applyTreeData();
        this.cdr.markForCheck();
      });
  }

  ngAfterViewInit(): void {
    this.applyTreeData();
    this.updateGridHeight();
    fromEvent(window, 'resize')
      .pipe(debounceTime(100), takeUntil(this.destroy$))
      .subscribe(() => this.updateGridHeight());
    setTimeout(() => this.updateGridHeight(), 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get parentLabel(): string {
    const parent = String(this.classData.parentFullName ?? '').trim();
    return parent || '(raíz)';
  }

  rowDataBound(args: { data?: IAccountClass; row?: Element }): void {
    if (!args.row || !args.data) {
      return;
    }
    const row = args.row as HTMLElement;
    const level = Number(args.data.subLevel ?? 0);
    row.classList.toggle('class-folder-row', this.hasChildNodes(args.data));
    row.classList.toggle('class-root-row', level === 0);
  }

  onDataBound(): void {
    const grid = this.classesGrid;
    if (this.collapseOnBind && grid && (grid.getCurrentViewRecords()?.length ?? 0) > 0) {
      this.collapseOnBind = false;
      grid.expandAll();
    }
    this.updateGridHeight();
  }

  actionBegin(args: {
    requestType?: string;
    cancel?: boolean;
    data?: unknown;
    rowData?: unknown;
  }): void {
    const row = this.getSourceClass(args.rowData ?? args.data);

    if (args.requestType === 'add') {
      const selected = this.getSelectedClass();
      this.classData = this.createEmptyClass();
      if (selected?.classId) {
        this.classData.parentId = selected.classId;
        this.classData.parentFullName = selected.fullName ?? selected.name ?? '';
        this.classData.subLevel = (Number(selected.subLevel) || 0) + 1;
      }
      this.cdr.markForCheck();
      return;
    }

    if (args.requestType === 'beginEdit') {
      if (!row?.classId) {
        args.cancel = true;
        return;
      }
      this.classData = { ...this.createEmptyClass(), ...row };
      this.cdr.markForCheck();
      return;
    }

    if (args.requestType === 'save') {
      const name = String(this.classData.name ?? '').trim();
      if (!name) {
        args.cancel = true;
        this.toastService.showMyToast(
          'Indique el nombre de la clase',
          toastType.warning
        );
        return;
      }
      this.classData.name = name;
      args.cancel = true;
      this.classesGrid?.closeEdit();
      this.classesService
        .saveClass(this.classData)
        .pipe(take(1))
        .subscribe();
      return;
    }

    if (args.requestType === 'delete') {
      const target = row ?? this.getSelectedClass();
      if (!target?.classId) {
        args.cancel = true;
        return;
      }
      if (this.hasChildNodes(target)) {
        args.cancel = true;
        this.toastService.showMyToast(
          'No se puede eliminar: la clase tiene subclases',
          toastType.warning
        );
        return;
      }
      args.cancel = true;
      this.classesService
        .deleteClass(target)
        .pipe(take(1))
        .subscribe();
    }
  }

  actionComplete(args: {
    requestType?: string;
    dialog?: { header?: string };
  }): void {
    if (args.requestType === 'add' && args.dialog) {
      args.dialog.header = this.classData.parentId
        ? `Nueva subclase de ${this.classData.parentFullName}`
        : 'Nueva clase';
    }
    if (args.requestType === 'beginEdit' && args.dialog) {
      args.dialog.header = 'Editar clase';
    }
  }

  private applyTreeData(): void {
    const grid = this.classesGrid;
    if (!grid) {
      return;
    }
    grid.dataSource = this.classRows;
  }

  private updateGridHeight(): void {
    this.classesGridHeight = applyGridHeightAboveFooter(this.classesGrid, 280);
    this.cdr.markForCheck();
  }

  private buildTreeRows(rows: IAccountClass[]): IClassTreeRow[] {
    const items: IClassTreeRow[] = rows.map((row) => ({
      ...row,
      subtasks: [],
    }));
    const byId = new Map<number, IClassTreeRow>();
    items.forEach((item) => byId.set(item.classId, item));

    const roots: IClassTreeRow[] = [];
    for (const item of items) {
      const parentId = Number(item.parentId) || 0;
      const parent = parentId > 0 ? byId.get(parentId) : undefined;
      if (parent) {
        parent.subtasks = parent.subtasks ?? [];
        parent.subtasks.push(item);
      } else {
        roots.push(item);
      }
    }

    const sortTree = (nodes: IClassTreeRow[]): void => {
      nodes.sort((a, b) =>
        String(a.name ?? '').localeCompare(String(b.name ?? ''), 'es', {
          sensitivity: 'base',
        })
      );
      nodes.forEach((node) => {
        if (node.subtasks && node.subtasks.length > 0) {
          sortTree(node.subtasks);
        }
      });
    };
    sortTree(roots);
    return roots;
  }

  private getSelectedClass(): IAccountClass | undefined {
    const records = this.classesGrid?.getSelectedRecords() as
      | IAccountClass[]
      | undefined;
    return this.getSourceClass(records?.[0]);
  }

  private hasChildNodes(data?: IAccountClass | null): boolean {
    const record = data as
      | (IAccountClass & {
          hasChildRecords?: boolean;
          childRecords?: unknown[];
        })
      | null
      | undefined;
    if (!record) {
      return false;
    }
    if (record.hasChildRecords === true) {
      return true;
    }
    if (Array.isArray(record.childRecords) && record.childRecords.length > 0) {
      return true;
    }
    const source = this.getSourceClass(record) as IClassTreeRow | undefined;
    if (Array.isArray(source?.subtasks) && source.subtasks.length > 0) {
      return true;
    }
    const classId = Number(source?.classId ?? record.classId) || 0;
    return this.flatRows.some((row) => Number(row.parentId) === classId);
  }

  private getSourceClass(data: unknown): IAccountClass | undefined {
    if (!data) {
      return undefined;
    }
    const row = (Array.isArray(data) ? data[0] : data) as IAccountClass & {
      taskData?: IAccountClass;
    };
    return (row.taskData ?? row) as IAccountClass | undefined;
  }

  private createEmptyClass(): IAccountClass {
    return {
      classId: 0,
      name: '',
      fullName: '',
      isActive: true,
      parentId: null,
      parentFullName: '',
      subLevel: 0,
    };
  }
}
