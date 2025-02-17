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
  userOrganizations$!: Observable<IOrganization>;

  organizations$!: Observable<IOrganization[]>;
  ofields: Object = { text: 'name', value: 'id' };
  ovalue: number | undefined;

  dfields: Object = { text: 'name', value: 'id' };
  dvalue: number | null = null;

  roles$!: Observable<IRole[]>;
  rfields: Object = { text: 'roleName', value: 'roleName' };
  rvalue: string | undefined;

  user: any;
  orgs: string[] = [];
  rols: string[] = [];
  defaultOrg:  IOrganization[] = [];

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
      orgs: ['', Validators.required],
      default: [ '', Validators.required],
      rols: ['', Validators.required],
    });

    this.organizations$ = this.userService.organizations$;
    this.roles$ = this.userService.roles$;

    this.user$ = (this.userService.userSelected$ || of({})).pipe(
      // tap((data: any) => {
      //   (this.user = data ?? {} );
      // }),
      tap((data: any) => {
        this.orgs = (data.orgs ?? []).map((item: any) => item['id']);
        this.rols = (data.roles ?? []).map((item: any) => item['roleName']);
        this.defaultOrg = (data.orgs ?? []).filter((item: any) => item.default);
        this.dvalue = this.defaultOrg.length > 0 ? this.defaultOrg[0].id : null;
        console.log(this.dvalue);
      }),
      catchError((err) => {
        this.errorMessageSubject.next(err);
        return EMPTY;
      })
    );

    //  this.orgs = (this.user.orgs ?? []).map((item: any) => item['id']);

    this.enabled$ = this.applicationService.enableUserFormAction$.pipe(
      tap((enabled) => {
        if (enabled) {
          this.userForm.enable();
        } else {
          this.userForm.disable();
        }
        let formbuttons = document.getElementById('form-buttons');
        if (formbuttons) formbuttons.style.display = enabled ? 'block' : 'none';
      })
    );
  }

  clearForm() {
    this.userForm.reset();
  }

  onCancelClick() {
    this.disableForm();
    if (this.user && this.user.userId === 0) {
      this.clearForm();
    }
  }

  onSaveClick() {
    const newUser: IUser = {
      userId: this.user ? this.user.userId : 0,
      firstName: this.userForm.value.firstname,
      lastName: this.userForm.value.lastname,
      userName: '',
      email: '',
      phoneNumber: '',
      deactivated: 0,
      displayName: '',
      orgs: [],
      rols: [],
    };

    if (this.user) {
      this.userService.updateUser(newUser);
    } else {
      this.userService.addUser(newUser);
    }
    this.disableForm();
  }

  disableForm() {
    this.applicationService.enableUserForm(false);
    this.applicationService.enableUserGrid(false);
  }
}
