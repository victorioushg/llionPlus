import {
  MenuItemModel,
  TreeViewComponent,
  NodeSelectEventArgs,
  SidebarComponent,
  MenuEventArgs,
  NodeExpandEventArgs,
} from '@syncfusion/ej2-angular-navigations';
import { Component, OnInit, ViewEncapsulation, ViewChild } from '@angular/core';
import { enableRipple } from '@syncfusion/ej2-base';
import { Router } from '@angular/router';
import {
  faMinusSquare,
  faPlusSquare,
  faBell,
} from '@fortawesome/free-regular-svg-icons';
import MenuJson from '@assets/json/menu.json';
import { User } from '@shared/models/User';
import { IUserOrganizationInfo } from '@shared/models/authenticated-response.model';
import { ApplicationService } from '@shared/services/applicattionService';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { IApiResponse } from '@shared/models/api-response';
import { take } from 'rxjs';
import { SessionService } from '@shared/services/session.service';
import { sessionPrinterLabel } from '@shared/models/user-session';

@Component({
  selector: 'llion-views',
  templateUrl: './views.component.html',
  styleUrls: ['./views.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false,
})
export class ViewsComponent implements OnInit {
  @ViewChild('sidebarInstance')
  public sidebarTreeviewInstance!: SidebarComponent;
  @ViewChild('treeviewInstance')
  public tree!: TreeViewComponent;

  pathTitle: string = 'llion';
  title: string = '';
  width: string = '290px';
  systemDate: Date = new Date();
  mediaQuery: string = '(min-width: 600px)';
  target: string = 'router';
  type: string = 'Push';
  faSquare = faMinusSquare;
  faBell = faBell;
  cssClass = 'custom';
  enableDock: boolean = true;
  dockSize: string = '55px';
  copyrightYear = new Date().getFullYear();
  appVersion = environment.version;

  user: User = JSON.parse(
    localStorage.getItem('currentLlionUser') as string
  ) as User;
  workingOrganizationName = '';
  machineName = '';
  fiscalPrinterLabel = '';
  menuItems: MenuItemModel[] = [];

  public data: any[] = MenuJson;

  public field: object = {
    dataSource: this.data,
    id: 'nodeId',
    text: 'nodeText',
    child: 'nodeChild',
    iconCss: 'iconCss',
    imageUrl: 'nodeImage',
    path: 'path',
  };

  constructor(
    private router: Router,
    private applicationService: ApplicationService,
    private sessionService: SessionService,
    private http: HttpClient
  ) {
    enableRipple(true);
    setInterval(() => {
      this.systemDate = new Date();
    }, 1000);
  }

  ngOnInit(): void {
    this.restoreWorkingOrganization();
    this.restoreWorkingSession();
    this.buildUserMenu();

    this.applicationService.workingOrganization$.subscribe((org) => {
      this.workingOrganizationName = org?.name ?? '';
    });
    this.applicationService.workingSession$.subscribe((session) => {
      this.machineName = session?.machineName ?? '';
      this.fiscalPrinterLabel = session?.fiscalPrinterLabel ?? '';
    });
  }

  private restoreWorkingOrganization(): void {
    const storedName =
      this.user?.workingOrganizationName ||
      this.user?.defaultOrganizationName ||
      '';
    const storedId =
      this.user?.workingOrganizationId ||
      this.user?.defaultOrganizationId ||
      0;

    if (storedId > 0) {
      this.applicationService.setWorkingOrganization(storedId, storedName);
      this.workingOrganizationName = storedName;
      return;
    }

    if (!this.user?.username) {
      return;
    }

    this.http
      .get<IApiResponse<IUserOrganizationInfo[]>>(
        `${environment.API_URL}user/organizationsByName/${encodeURIComponent(
          this.user.username
        )}`
      )
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const organizations = response.result ?? [];
          const defaultOrg =
            organizations.find((o) => o.defaultOrganization) ??
            organizations[0];

          this.user.organizations = organizations;
          if (defaultOrg) {
            this.user.defaultOrganizationId = defaultOrg.organizationId;
            this.user.defaultOrganizationName = defaultOrg.name;
            this.user.workingOrganizationId = defaultOrg.organizationId;
            this.user.workingOrganizationName = defaultOrg.name;
            localStorage.setItem('currentLlionUser', JSON.stringify(this.user));
            this.applicationService.setWorkingOrganization(
              defaultOrg.organizationId,
              defaultOrg.name
            );
          }
          this.buildUserMenu();
        },
      });
  }

  private restoreWorkingSession(): void {
    const sessionId = this.user?.sessionId ?? 0;
    const machineName = this.user?.machineName ?? '';
    const fiscalPrinterId = this.user?.fiscalPrinterId ?? 0;
    const fiscalPrinterLabel = this.user?.fiscalPrinterLabel ?? '';

    if (sessionId > 0 && machineName) {
      this.applicationService.setWorkingSession(
        sessionId,
        machineName,
        fiscalPrinterId,
        fiscalPrinterLabel
      );
      this.machineName = machineName;
      this.fiscalPrinterLabel = fiscalPrinterLabel;
    }
  }

  private persistUserSession(
    sessionId: number,
    machineName: string,
    fiscalPrinterId: number,
    fiscalPrinterCode: string | undefined,
    fiscalPrinterLabel: string
  ): void {
    this.user.sessionId = sessionId;
    this.user.machineName = machineName;
    this.user.fiscalPrinterId = fiscalPrinterId;
    this.user.fiscalPrinterCode = fiscalPrinterCode;
    this.user.fiscalPrinterLabel = fiscalPrinterLabel;
    localStorage.setItem('currentLlionUser', JSON.stringify(this.user));
    this.applicationService.setWorkingSession(
      sessionId,
      machineName,
      fiscalPrinterId,
      fiscalPrinterLabel
    );
    this.sessionService.storeMachineName(machineName);
    const organizationId = this.user.workingOrganizationId ?? 0;
    if (organizationId) {
      this.sessionService.storePrinterId(organizationId, fiscalPrinterId);
      this.sessionService.storeOrganizationId(organizationId);
    }
  }

  private bindSessionForOrganization(organizationId: number): void {
    const userId = this.user?.userId ?? 0;
    const machineName =
      this.user?.machineName || this.sessionService.getStoredMachineName();

    if (!userId || !organizationId || !machineName) {
      return;
    }

    this.sessionService
      .getFiscalPrinters(organizationId)
      .pipe(take(1))
      .subscribe((printers) => {
        this.sessionService
          .getLastSession(userId, organizationId)
          .pipe(take(1))
          .subscribe((lastSession) => {
            const storedPrinterId =
              this.sessionService.getStoredPrinterId(organizationId);
            const fiscalPrinterId =
              lastSession?.fiscalPrinterId ||
              storedPrinterId ||
              printers[0]?.fiscalPrinterId ||
              0;

            if (!fiscalPrinterId) {
              return;
            }

            this.sessionService
              .openSession({
                userId,
                organizationId,
                machineName,
                fiscalPrinterId,
              })
              .pipe(take(1))
              .subscribe((session) => {
                this.persistUserSession(
                  session.sessionId,
                  session.machineName,
                  session.fiscalPrinterId,
                  session.fiscalPrinterCode,
                  sessionPrinterLabel(session)
                );
              });
          });
      });
  }

  private buildUserMenu(): void {
    const organizations = this.user?.organizations ?? [];
    const orgMenuItems: MenuItemModel[] = organizations.map((org) => ({
      id: `org-${org.organizationId}`,
      text: org.name,
    }));

    this.menuItems = [
      {
        id: 'menuHeadItem',
        text: this.user?.username,
        iconCss: 'll-test-account',
        items: [
          { text: 'account Settings', iconCss: 'll-edit-account' },
          {
            id: 'menuOrganizations',
            text: 'organizaciones',
            items: orgMenuItems,
          },
        ],
      },
      { text: 'log out', iconCss: 'll-exit' },
    ];
  }

  public onSelect(args: NodeSelectEventArgs | NodeExpandEventArgs): void {
    const nodeId = String(args.nodeData['id'] ?? '');
    const hasChildren = this.menuNodeHasChildren(nodeId);

    if (args.node.classList.contains('e-level-1')) {
      this.tree.collapseAll(
        this.data.map((e) => e.nodeId).filter((e) => e != args.nodeData['id'])
      );
      this.tree.expandAll([args.node]);
    } else if (hasChildren) {
      this.tree.expandAll([args.node]);
    }

    switch (nodeId) {
      case '02-01-01':
        this.router.navigate(['/accounting/accounts']);
        break;
      case '02-01-02':
        this.router.navigate(['/accounting/classes']);
        break;
      case '02-01-03':
        this.router.navigate(['/accounting/journals']);
        break;
      case '03-01-01':
        this.router.navigate(['/treasury/banks']);
        break;
      case '03-01-02':
        this.router.navigate(['/treasury/cashboxes']);
        break;
      case '04-01-01':
        this.router.navigate(['/employee']);
        break;
      case '05-01-01':
        this.router.navigate(['/provider']);
        break;
      case '05-01-02-01':
        this.router.navigate(['/provider/purchase-orders']);
        break;
      case '05-01-02-02':
        this.router.navigate(['/provider/goods-receipts']);
        break;
      case '05-01-02-03':
        this.router.navigate(['/provider/purchases']);
        break;
      case '05-01-02-04':
        this.router.navigate(['/provider/credit-notes']);
        break;
      case '05-01-02-05':
        this.router.navigate(['/provider/debit-notes']);
        break;
      case '06-01-01':
        this.router.navigate(['/customer']);
        break;
      case '06-01-02-01':
        this.router.navigate(['/customer/quotes']);
        break;
      case '06-01-02-02':
        this.router.navigate(['/customer/sales-orders']);
        break;
      case '06-01-02-03':
        this.router.navigate(['/customer/delivery-notes']);
        break;
      case '06-01-02-04':
        this.router.navigate(['/customer/invoices']);
        break;
      case '06-01-02-05':
        this.router.navigate(['/customer/credit-notes']);
        break;
      case '06-01-02-06':
        this.router.navigate(['/customer/debit-notes']);
        break;
      case '08-01-01':
        this.router.navigate(['/merchandising/merchandise']);
        break;
      case '08-01-02':
        this.router.navigate(['/merchandising/services']);
        break;
      case '09-01-01':
        this.router.navigate(['/production/lines']);
        break;
      case '09-01-02':
        this.router.navigate(['/production/resources']);
        break;
      case '09-01-03':
        this.router.navigate(['/production/formulations']);
        break;
      case '09-01-04':
        this.router.navigate(['/production/orders']);
        break;
      case '09-01-05':
        this.router.navigate(['/production/tracking']);
        break;
      case '11-01-01':
        this.router.navigate(['/application/organization']);
        break;
      case '11-01-02':
        this.router.navigate(['/users']);
        break;
      default:
        break;
    }

    this.title = this.menuPathLabels(nodeId).join(' | ');
  }

  private menuPathLabels(nodeId: string): string[] {
    const walk = (nodes: any[], trail: string[]): string[] | null => {
      for (const node of nodes) {
        const next = [...trail, String(node.nodeText ?? '').toLowerCase()];
        if (node.nodeId === nodeId) {
          return next;
        }
        if (Array.isArray(node.nodeChild) && node.nodeChild.length) {
          const found = walk(node.nodeChild, next);
          if (found) {
            return found;
          }
        }
      }
      return null;
    };
    return walk(this.data, []) ?? [];
  }

  private menuNodeHasChildren(nodeId: string): boolean {
    const walk = (nodes: any[]): any | null => {
      for (const node of nodes) {
        if (node.nodeId === nodeId) {
          return node;
        }
        if (Array.isArray(node.nodeChild) && node.nodeChild.length) {
          const found = walk(node.nodeChild);
          if (found) {
            return found;
          }
        }
      }
      return null;
    };
    const match = walk(this.data);
    return Array.isArray(match?.nodeChild) && match.nodeChild.length > 0;
  }

  openClick() {
    this.faSquare =
      this.faSquare == faMinusSquare ? faPlusSquare : faMinusSquare;
    this.sidebarTreeviewInstance.toggle();
  }

  public onMouseDown(target: HTMLElement): void {
    target.classList.add('e-input-btn-ripple');
  }

  public onMouseUp(target: HTMLElement): void {
    const ele: HTMLElement = target;
    setTimeout(() => {
      ele.classList.remove('e-input-btn-ripple');
    }, 500);
  }

  public focusIn(target: HTMLElement): void {
    // target.parentElement.classList.add('e-input-focus');
  }

  public focusOut(target: HTMLElement): void {
    if (target.parentElement)
      target.parentElement.classList.remove('e-input-focus');
  }

  public select(args: MenuEventArgs): void {
    const text = (args.item.text ?? '').toLowerCase();
    if (text === 'log out') {
      this.logout();
      return;
    }

    const itemId = args.item.id ?? '';
    if (itemId.startsWith('org-')) {
      const organizationId = Number(itemId.replace('org-', ''));
      const organization = (this.user.organizations ?? []).find(
        (o) => o.organizationId === organizationId
      );
      if (organization) {
        this.user.workingOrganizationId = organization.organizationId;
        this.user.workingOrganizationName = organization.name;
        localStorage.setItem('currentLlionUser', JSON.stringify(this.user));
        this.applicationService.setWorkingOrganization(
          organization.organizationId,
          organization.name
        );
        this.bindSessionForOrganization(organization.organizationId);
      }
    }
  }

  private logout(): void {
    const sessionId = this.user?.sessionId ?? 0;
    this.sessionService.closeSession(sessionId).pipe(take(1)).subscribe({
      next: () => this.clearClientSession(),
      error: () => this.clearClientSession(),
    });
  }

  private clearClientSession(): void {
    this.applicationService.clearWorkingSession();
    localStorage.removeItem('jwt');
    localStorage.removeItem('currentLlionUser');
    localStorage.removeItem('currentUser');
    sessionStorage.clear();
    this.router.navigateByUrl('/login');
  }
}
