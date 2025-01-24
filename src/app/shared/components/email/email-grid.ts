import { Component, Input, OnInit, ViewChild } from '@angular/core';

import {
  GridComponent,
  RecordDoubleClickEventArgs,
  CommandModel,
  ToolbarItems,
  RowSelectEventArgs,
  CommandClickEventArgs,
} from '@syncfusion/ej2-angular-grids';

import EntityToolbar from '@assets/json/entitiestoolbar.json';
import { IEmail } from './email';
import { childgrid, sharedSetting, toastType } from '@shared/enums/enums';
import { EmailService } from './email.service';
import { ClickEventArgs } from '@syncfusion/ej2-angular-navigations';
import { ApplicationService } from '@shared/services/applicattionService';
import { EMPTY, Observable, catchError, combineLatest, map, tap } from 'rxjs';
import { ToastService } from '@shared/services/toastService';

@Component({
  selector: 'llion-grid-email',
  templateUrl: './email-grid.html',
  styleUrls: ['./email-grid.scss'],
  standalone: false,
})
export class EmailGridComponent implements OnInit {
  @ViewChild('emailgrid') public emailgrid!: GridComponent;

  public commands!: CommandModel[];
  parentRef_EntityId: number = 0;
  entityId: number = 0;
  errorMessage = '';
  gridtitle: string = 'correos electrónicos';
  gridHeight = sharedSetting.formGridHeight;

  selectedEmail: IEmail | undefined;

  emails$!: Observable<IEmail[]>;

  enabled$!: Observable<boolean>;

  toolbar: ToolbarItems[] | object = EntityToolbar.map((elem) => ({
    ...elem,
    template: elem.template
      ? `<label class='grid-label' id='title-grid'>${this.gridtitle}</label>`
      : undefined,
    align: elem.align ? elem.align : undefined,
  }));

  constructor(
    private emailService: EmailService,
    private applicationService: ApplicationService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.applicationService.WhenReady(
      () => this.emailgrid,
      () =>
        this.applicationService.WhenReady(
          () => this.emailgrid.toolbarModule,
          () => {
            this.emailgrid.toolbarModule.enableItems(['add'], true);
            this.gridtitle = 'correos electrónicos';
            this.emailgrid.element.classList.add('disablegrid');
            document.getElementById('emailgrid')?.classList.add('wrapper');
            this.commands = [
              {
                type: 'Delete',
                buttonOption: { cssClass: 'e-btn', iconCss: 'e-trash e-icons' },
              },
            ];
          }
        )
    );

    this.emails$ = combineLatest([
      this.emailService.emailWithCRUD$,
      this.applicationService.enableEmailChildGridAction$,
    ]).pipe(
      map(([emails, enabled]) => emails.filter(Boolean)),
      catchError((err) => {
        this.toastService.showMyToast(err, toastType.error);
        return EMPTY;
      })
    );

    this.enabled$ = this.applicationService.enableEmailChildGridAction$.pipe(
      tap((enabled) => {
        if (this.emailgrid) {
          if (!enabled) {
            this.emailgrid.element.classList.add('disablegrid');
            document.getElementById('email-grid')?.classList.add('wrapper');
          } else {
            this.emailgrid.element.classList.remove('disablegrid');
            document.getElementById('email-grid')?.classList.remove('wrapper');
          }
        }
      })
    );

    this.parentRef_EntityId = this.emailService.parentRefEntityId;

    this.applicationService.entityId$.subscribe((entity) => {
      this.entityId = entity;
    });
  }

  onRowSelected(args: RowSelectEventArgs): void {
    this.selectedEmail = (args.data ? args.data : []) as IEmail;
    this.emailService.emailSelected(this.selectedEmail);
    this.applicationService.entitySelected(this.selectedEmail.emailId);
  }

  onRecordDoubleClick(args: RecordDoubleClickEventArgs): void {
    this.selectedEmail = args.rowData as IEmail;
    this.emailService.emailSelected(this.selectedEmail);
    this.applicationService.enableDetailForm(childgrid.Email, true);
  }

  onToolbarClick(args: ClickEventArgs): void {
    const address: IEmail = {
      emailId: 0,
      emailAddress: '',
      entityId: this.parentRef_EntityId,
      organizationId: this.entityId,
    };
    const target: HTMLElement = args.originalEvent.target as HTMLElement;
    if (target.parentElement?.id === 'add') {
      this.emailService.emailSelected(address);
      this.applicationService.enableDetailForm(childgrid.Email, true);
      args.cancel = true;
    }
  }

  commandClick(args: CommandClickEventArgs): void {
    if (args.target?.title == 'Delete' && this.selectedEmail) {
      this.emailService.deleteEmail(this.selectedEmail);
    }
  }
}
