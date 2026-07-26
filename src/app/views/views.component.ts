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

  user: User = JSON.parse(
    localStorage.getItem('currentLlionUser') as string
  ) as User;
  workingOrganizationName = '';
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
    private http: HttpClient
  ) {
    enableRipple(true);
    setInterval(() => {
      this.systemDate = new Date();
    }, 1000);
  }

  ngOnInit(): void {
    this.restoreWorkingOrganization();
    this.buildUserMenu();

    this.applicationService.workingOrganization$.subscribe((org) => {
      this.workingOrganizationName = org?.name ?? '';
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
    if (args.node.classList.contains('e-level-1')) {
      this.tree.collapseAll(
        this.data.map((e) => e.nodeId).filter((e) => e != args.nodeData['id'])
      );
      this.tree.expandAll([args.node]);
      this.tree.expandOn = 'None';
    }
    switch (args.nodeData['id']) {
      case '02-01':
        this.router.navigate(['/accounting/accounts']);
        break;
      case '02-02':
        this.router.navigate(['/accounting/classes']);
        break;
      case '03-01':
        this.router.navigate(['/treasury/banks']);
        break;
      case '03-02':
        this.router.navigate(['/treasury/cashboxes']);
        break;
      case '04-01':
        this.router.navigate(['/employee']);
        break;
      case '05-01':
        this.router.navigate(['/provider']);
        break;
      case '06-01':
        this.router.navigate(['/customer']);
        break;
      case '08-01':
        this.router.navigate(['/merchandising/merchandise']);
        break;
      case '10-01':
        this.router.navigate(['/control/parameters']);
        break;
      case '11-01':
        this.router.navigate(['/application/organization']);
        break;
      case '11-02':
        this.router.navigate(['/users']);
        break;
      default:
        break;
    }

    this.title =
      args.nodeData['id'].toString().length > 2
        ? this.title.split(' | ')[0] + ' | '
        : '';

    this.title += args.nodeData['text'].toString().toLowerCase();
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
      }
    }
  }

  private logout(): void {
    localStorage.removeItem('jwt');
    localStorage.removeItem('currentLlionUser');
    localStorage.removeItem('currentUser');
    sessionStorage.clear();
    this.router.navigateByUrl('/login');
  }
}
