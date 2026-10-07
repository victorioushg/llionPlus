import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  EMPTY,
  Observable,
  Subject,
  catchError,
  combineLatest,
  map,
  take,
  tap,
} from 'rxjs';
import { ChangeEventArgs } from '@syncfusion/ej2-angular-dropdowns';
import { ClassesService } from '../classes.service';
import { IAccountClass } from '../class';

@Component({
  selector: 'llion-class-detail',
  templateUrl: './class-detail.html',
  styleUrls: ['./class-detail.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ClassDetailComponent implements OnInit {
  private readonly errorMessageSubject = new Subject<string>();
  errorMessage$ = this.errorMessageSubject.asObservable();

  classForm!: FormGroup;
  classItem!: IAccountClass;
  classItem$!: Observable<IAccountClass>;
  enabled$!: Observable<boolean>;
  parentClasses$!: Observable<IAccountClass[]>;

  readonly parentFields: Object = {
    text: 'fullName',
    value: 'classId',
  };

  constructor(
    private formBuilder: FormBuilder,
    private classesService: ClassesService
  ) {}

  ngOnInit(): void {
    this.classForm = this.formBuilder.group({
      name: ['', Validators.required],
      fullName: [''],
      parentId: [null],
      parentFullName: [''],
      subLevel: [{ value: 0, disabled: true }],
      isActive: [true],
    });

    this.classItem$ = this.classesService.classSelected$.pipe(
      tap((data: IAccountClass) => {
        this.classItem = data;
        this.patchForm(data);
      }),
      catchError((err) => {
        this.errorMessageSubject.next(err);
        return EMPTY;
      })
    );

    this.parentClasses$ = combineLatest([
      this.classesService.classes$,
      this.classesService.classContextIdAction$,
    ]).pipe(
      map(([classes, currentId]) =>
        classes.filter((c) => c.classId > 0 && c.classId !== currentId)
      )
    );

    this.enabled$ = this.classesService.enableClassFormAction$.pipe(
      tap((enabled) => {
        if (enabled) {
          this.classForm.enable();
          this.classForm.get('subLevel')?.disable({ emitEvent: false });
        } else {
          this.classForm.disable();
        }
        const formButtons = document.getElementById('class-form-buttons');
        if (formButtons) {
          formButtons.style.display = enabled ? 'block' : 'none';
        }
      })
    );
  }

  onParentChange(args: ChangeEventArgs): void {
    const parent = args?.itemData as IAccountClass | undefined;
    const parentFullName = String(
      parent?.fullName || parent?.name || ''
    ).trim();
    const name = String(this.classForm.get('name')?.value ?? '').trim();
    const subLevel = parent?.classId
      ? (Number(parent.subLevel) || 0) + 1
      : 0;
    this.classForm.patchValue({
      parentFullName,
      subLevel,
      fullName: parentFullName && name ? `${parentFullName}:${name}` : name,
    });
  }

  onCancelClick(): void {
    this.disableForm();
    if (!this.classItem?.classId) {
      this.patchForm({
        classId: 0,
        name: '',
        fullName: '',
        isActive: true,
        parentId: null,
        parentFullName: '',
        subLevel: 0,
      });
    } else {
      this.patchForm(this.classItem);
    }
  }

  onSaveClick(): void {
    if (this.classForm.invalid) {
      this.classForm.markAllAsTouched();
      return;
    }

    const formValue = this.classForm.getRawValue();
    const name = String(formValue.name ?? '').trim();
    const parentFullName = String(formValue.parentFullName ?? '').trim();
    const payload: IAccountClass = {
      ...this.classItem,
      classId: this.classItem?.classId ?? 0,
      name,
      fullName:
        String(formValue.fullName ?? '').trim() ||
        (parentFullName ? `${parentFullName}:${name}` : name),
      parentId: formValue.parentId ?? null,
      parentFullName,
      subLevel: formValue.subLevel ?? 0,
      isActive: formValue.isActive ?? true,
    };

    this.classesService
      .saveClass(payload)
      .pipe(take(1))
      .subscribe((id) => {
        if (id > 0) {
          this.disableForm();
        }
      });
  }

  private patchForm(data: IAccountClass): void {
    this.classForm.patchValue({
      name: data.name ?? '',
      fullName: data.fullName ?? data.name ?? '',
      parentId: data.parentId ?? null,
      parentFullName: data.parentFullName ?? '',
      subLevel: data.subLevel ?? 0,
      isActive: data.isActive ?? true,
    });
  }

  private disableForm(): void {
    this.classesService.enableClassForm(false);
    this.classesService.enableClassGrid(false);
  }
}
