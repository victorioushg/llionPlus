import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { DropDownListComponent } from '@syncfusion/ej2-angular-dropdowns';

import { catchError, EMPTY, Observable, of, Subject, tap } from 'rxjs';
import { ApplicationService } from '@shared/services/applicattionService';
import { UserService } from '@views/application/users/user.service';
import { IRole, IUser } from '../user';
import { IOrganization } from '@views/application/organization/organization';

@Component({
  selector: 'llion-user-detail',
  templateUrl: './users-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class UsersDetailComponent implements OnInit {
  private errorMessageSubject = new Subject<string>();
  errorMessage$ = this.errorMessageSubject.asObservable();

  userForm!: FormGroup;

  user$!: Observable<IUser>;

  organizations$!: Observable<IOrganization[]>;
  ofields: Object = { text: 'name', value: 'id' };
  ovalue: number | undefined;

  roles$!: Observable<IRole[]>;
  rfields: Object = { text: 'roleName', value: 'roleName' };
  rvalue: string | undefined;

  user: any;

  enabled$: Observable<boolean> | undefined;

  constructor(
    private applicationService: ApplicationService,
    private formBuilder: FormBuilder,
    private userService: UserService
  ) {}
  ngOnInit(): void {
    this.userForm = this.formBuilder.group({
      firstname: ['', Validators.required],
      lastname: ['', Validators.required],
    });

    this.organizations$ = this.userService.organizations$;
    this.roles$ = this.userService.roles$;

    this.user$ = (this.userService.userSelected$ || of({} as IUser)).pipe(
      tap((data: any) => (this.user = data ?? {})),
      catchError((err) => {
        this.errorMessageSubject.next(err);
        return EMPTY;
      })
    );
    this.enabled$ = this.applicationService.enableUserFormAction$.pipe(
      tap((enabled) => {
        let formbuttons = document.getElementById('form-buttons');
        if (formbuttons) formbuttons.style.display = enabled ? 'block' : 'none';
      })
    );
  }
}
