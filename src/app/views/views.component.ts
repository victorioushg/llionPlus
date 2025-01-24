import {
  MenuItemModel,
  TreeViewComponent,
  NodeSelectEventArgs,
  SidebarComponent,
  MenuEventArgs,
  NodeExpandEventArgs,
  NodeData,
} from '@syncfusion/ej2-angular-navigations';
import { Component, ViewEncapsulation, Inject, ViewChild } from '@angular/core';
import { enableRipple } from '@syncfusion/ej2-base';
import { Router } from '@angular/router';
import { 
  faMinusSquare,
  faPlusSquare,
  faBell,
} from '@fortawesome/free-regular-svg-icons';
import MenuJson from '@assets/json/menu.json';
import { AppComponent } from "../app.component";

@Component({
  selector: 'llion-views', 
  templateUrl: './views.component.html',
  styleUrls: ['./views.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false, 
})
export class ViewsComponent {
  // Side Bar & Treeview
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
  //

  user: any = JSON.parse(localStorage.getItem('currentLlionUser') as string);
  constructor(private router: Router) {
    enableRipple(true);
    setInterval(() => {
      this.systemDate = new Date();
    }, 1000);
  }

  public menuItems: MenuItemModel[] = [
    {
      id: 'menuHeadItem',
      text: this.user.username,
      iconCss: 'll-test-account',
      items: [
        { text: 'account Settings', iconCss: 'll-edit-account' },

      ],
    },
    { text: 'log out', iconCss: 'll-exit' },
  ];

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

  // Triggers on node selection
  public onSelect(args: NodeSelectEventArgs | NodeExpandEventArgs): void {
    // let children = this.data.child;
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
      case '09-01':
        this.router.navigate(['/control/parameters']);
        break;
      case '10-01':
        this.router.navigate(['/application/organization']);
        break;
      case '10-02':
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
    if (args.item.text === 'Log out') {
      localStorage.removeItem('jwt');
      localStorage.removeItem('currentLlionUser');
      this.router.navigate(['/login']);
    }
  }
}
