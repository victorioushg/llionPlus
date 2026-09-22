import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LoginModel } from '@shared/models/Login';
import { enableRipple } from '@syncfusion/ej2-base';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import { AuthenticatedResponse } from '@shared/models/authenticated-response.model';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { ApplicationService } from '@shared/services/applicattionService';
import { SessionService } from '@shared/services/session.service';
import { User } from '@shared/models/User';
import { IFiscalPrinter } from '@shared/models/fiscal-printer';
import { sessionPrinterLabel } from '@shared/models/user-session';
import { environment } from '@environments/environment';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'llion-login',
  templateUrl: 'login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: false,
})
export class LoginComponent implements OnInit {
  invalidLogin: boolean = true;
  loginError: string = '';
  loginForm!: FormGroup;
  credentials: LoginModel = { username: '', password: '' };
  workstationOpen = false;
  printers: IFiscalPrinter[] = [];
  printerFields = { text: 'displayName', value: 'fiscalPrinterId' };
  currentUser: User | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private http: HttpClient,
    private toast: ToastService,
    private applicationService: ApplicationService,
    private sessionService: SessionService
  ) {
    enableRipple(true);
  }

  ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
      machineName: [this.sessionService.getStoredMachineName(), Validators.required],
      fiscalPrinterId: [null as number | null, Validators.required],
    });

    this.sessionService.getClientMachineName().subscribe((machineName) => {
      if (machineName) {
        this.loginForm.patchValue({ machineName });
      }
    });

    const lastOrgId = this.sessionService.getStoredOrganizationId();
    if (lastOrgId > 0) {
      this.loadPrinters(lastOrgId, this.sessionService.getStoredPrinterId(lastOrgId));
    }
  }

  toggleWorkstation(event?: Event): void {
    event?.preventDefault();
    this.workstationOpen = !this.workstationOpen;
  }

  onLogin() {
    if (this.loginForm.get('username')?.invalid || this.loginForm.get('password')?.invalid) {
      this.invalidLogin = true;
      this.toast.showMyToast(
        'Usuario y/o Contraseña invalidos!',
        toastType.error
      );
      return;
    }

    this.credentials.username = this.loginForm.get('username')?.value;
    this.credentials.password = this.loginForm.get('password')?.value;

    if (this.currentUser?.token) {
      this.prepareWorkstationAndEnter();
      return;
    }

    this.http
      .post<AuthenticatedResponse>(
        environment.API_URL + 'auth/login',
        this.credentials,
        {
          headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
        }
      )
      .subscribe({
        next: (response: AuthenticatedResponse) => {
          const token = response.token;
          localStorage.setItem('jwt', token);

          this.currentUser = {
            username: this.credentials.username,
            password: '',
            token,
            userId: response.userId,
            organizations: response.organizations ?? [],
            defaultOrganizationId: response.defaultOrganizationId ?? 0,
            defaultOrganizationName: response.defaultOrganizationName ?? '',
            workingOrganizationId: response.defaultOrganizationId ?? 0,
            workingOrganizationName: response.defaultOrganizationName ?? '',
          };

          localStorage.setItem(
            'currentLlionUser',
            JSON.stringify(this.currentUser)
          );

          this.invalidLogin = false;
          this.prepareWorkstationAndEnter();
        },
        error: (err: HttpErrorResponse) => {
          this.invalidLogin = true;
          this.toast.showMyToast(
            'Verifique conexión ' +
              (err.status != undefined ? err.status : '') +
              ' : ' +
              (err.statusText != undefined ? err.statusText : ''),
            toastType.error
          );
        },
      });
  }

  private loadPrinters(organizationId: number, selectedId?: number): void {
    this.sessionService.getFiscalPrinters(organizationId).subscribe({
      next: (printers) => {
        this.printers = printers;
        const printerId =
          selectedId ||
          this.sessionService.getStoredPrinterId(organizationId) ||
          printers[0]?.fiscalPrinterId ||
          null;
        if (printerId) {
          this.loginForm.patchValue({ fiscalPrinterId: printerId });
        }
      },
      error: () => {
        this.printers = [];
      },
    });
  }

  private prepareWorkstationAndEnter(): void {
    const organizationId = this.currentUser?.workingOrganizationId ?? 0;
    const userId = this.currentUser?.userId ?? 0;
    if (!organizationId || !userId) {
      this.toast.showMyToast(
        'El usuario no tiene organización asignada.',
        toastType.error
      );
      return;
    }

    forkJoin({
      printers: this.sessionService.getFiscalPrinters(organizationId),
      lastSession: this.sessionService
        .getLastSession(userId, organizationId)
        .pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ printers, lastSession }) => {
        this.printers = printers;
        const machineName =
          String(this.loginForm.get('machineName')?.value ?? '').trim() ||
          lastSession?.machineName ||
          this.sessionService.getStoredMachineName();
        if (machineName) {
          this.loginForm.patchValue({ machineName });
        }

        const selectedId = Number(
          this.loginForm.get('fiscalPrinterId')?.value ?? 0
        );
        const printerStillValid = printers.some(
          (printer) => printer.fiscalPrinterId === selectedId
        );
        const printerId = printerStillValid
          ? selectedId
          : lastSession?.fiscalPrinterId ||
            this.sessionService.getStoredPrinterId(organizationId) ||
            printers[0]?.fiscalPrinterId ||
            0;

        if (printerId) {
          this.loginForm.patchValue({ fiscalPrinterId: printerId });
        }

        if (!machineName || !printers.length || !printerId) {
          this.workstationOpen = true;
          this.toast.showMyToast(
            !machineName
              ? 'Indique el nombre de esta máquina en la red.'
              : 'Seleccione la impresora fiscal de esta estación.',
            toastType.error
          );
          return;
        }

        this.confirmSession();
      },
      error: () => {
        this.workstationOpen = true;
        this.toast.showMyToast(
          'No se pudieron cargar las impresoras fiscales.',
          toastType.error
        );
      },
    });
  }

  private confirmSession(): void {
    const machineName = String(
      this.loginForm.get('machineName')?.value ?? ''
    ).trim();
    const fiscalPrinterId = Number(
      this.loginForm.get('fiscalPrinterId')?.value ?? 0
    );
    const organizationId = this.currentUser?.workingOrganizationId ?? 0;
    const userId = this.currentUser?.userId ?? 0;

    if (!machineName || !fiscalPrinterId || !organizationId || !userId) {
      this.workstationOpen = true;
      this.toast.showMyToast(
        'Debe indicar la máquina y la impresora fiscal.',
        toastType.error
      );
      return;
    }

    this.sessionService
      .openSession({
        userId,
        organizationId,
        machineName,
        fiscalPrinterId,
      })
      .subscribe({
        next: (session) => {
          if (!this.currentUser) {
            return;
          }

          const printerLabel = sessionPrinterLabel(session);
          this.currentUser.sessionId = session.sessionId;
          this.currentUser.machineName = session.machineName;
          this.currentUser.fiscalPrinterId = session.fiscalPrinterId;
          this.currentUser.fiscalPrinterCode = session.fiscalPrinterCode;
          this.currentUser.fiscalPrinterLabel = printerLabel;

          this.sessionService.storeMachineName(session.machineName);
          this.sessionService.storePrinterId(organizationId, fiscalPrinterId);
          this.sessionService.storeOrganizationId(organizationId);
          localStorage.setItem(
            'currentLlionUser',
            JSON.stringify(this.currentUser)
          );

          this.applicationService.setWorkingOrganization(
            this.currentUser.workingOrganizationId ?? 0,
            this.currentUser.workingOrganizationName ?? ''
          );
          this.applicationService.setWorkingSession(
            session.sessionId,
            session.machineName,
            session.fiscalPrinterId,
            printerLabel
          );

          this.router.navigate(['/']);
        },
        error: (err: HttpErrorResponse) => {
          this.workstationOpen = true;
          const message =
            typeof err.error === 'string'
              ? err.error
              : err.error?.title ||
                err.error?.message ||
                'No se pudo guardar la sesión de trabajo.';
          this.toast.showMyToast(message, toastType.error);
        },
      });
  }
}
