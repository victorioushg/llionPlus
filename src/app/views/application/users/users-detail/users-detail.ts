import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
// import { OrganizationService } from '../organization.service';

import { DropDownListComponent } from '@syncfusion/ej2-angular-dropdowns';
// import { IOrganization } from '../organization';
import { catchError, EMPTY, Observable, Subject, tap } from 'rxjs';
import { ApplicationService } from '@shared/services/applicattionService';
import { UserService } from '@views/application/users/user.service';
import { IUser } from '../user';

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

  user$: Observable<any> | undefined;
  
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

    this.user$ = this.userService.userSelected$?.pipe(
      tap((data: any) => (
        this.user = data ?? {} 
      )),
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
