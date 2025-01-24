import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { enableRipple } from '@syncfusion/ej2-base';
import { IEmail } from './email';
import { EmailService } from './email.service';
import { ApplicationService } from '@shared/services/applicattionService';
import {
  EMPTY,
  Observable,
  Subject,
  catchError,
  combineLatest,
  map,
  tap,
} from 'rxjs';
import { childgrid } from '@shared/enums/enums';

enableRipple(true);

@Component({
  selector: 'llion-email',
  templateUrl: 'email-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class EmailComponent implements OnInit {
  entityId!: number;
  parentRefEntityId!: number;
  invalidEmail!: boolean;
  emailForm!: FormGroup;
  email: any;
  emailVisible!: boolean;

  private errorMessageSubject = new Subject<string>();
  errorMessage$ = this.errorMessageSubject.asObservable();

  enabled$!: Observable<boolean>;

  email$!: Observable<IEmail>;

  vm$!: Observable<{
    enabled: boolean;
    email: IEmail;
  }>;

  constructor(
    private formBuilder: FormBuilder,
    private emailService: EmailService,
    private applicationService: ApplicationService
  ) {}

  ngOnInit() {
    this.emailForm = this.formBuilder.group({
      emailAddress: ['', Validators.required],
    });

    this.enabled$ = this.applicationService.enableEmailChildFormAction$.pipe(
      tap((enabled) => (this.emailVisible = enabled))
    );

    this.email$ = this.emailService.email$.pipe(
      tap((data) => (this.email = data)),
      catchError((err) => {
        this.errorMessageSubject.next(err);
        return EMPTY;
      })
    );

    this.vm$ = combineLatest([this.enabled$, this.email$]).pipe(
      map(([enabled, email]) => ({ enabled, email }))
    );

    this.applicationService.parentRefEntityId$.subscribe((result) => {
        this.parentRefEntityId = result;
      });

    this.applicationService.entityId$.subscribe((entity) => {
      this.entityId = entity;
    });

  }

  clearForm() {
    this.email.reset();
  }

  onCancelClick() {
    this.disableForm();
  }

  onSaveClick() {
    const newEmail: IEmail = {
      emailId: this.email.emailId,
      emailAddress: this.emailForm.value.emailAddress,
      entityId: this.parentRefEntityId,
      organizationId: this.entityId,
    };

    if (this.email.emailId !== 0) {
      this.emailService.updateEmail(newEmail);
    } else {
      this.emailService.addEmail(newEmail);
    }

    this.disableForm();
  }

  disableForm() {
    this.emailService.emailSelected(this.email.entityId);
    this.applicationService.enableDetailForm(childgrid.Email, false);
  }
}
