import { CommonModule } from '@angular/common';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterModule } from '@angular/router';

// App Components
import { ViewsComponent } from '@views/views.component';
import { ROUTES } from  '@views/_routes';

// Syncfusion
import {
  SidebarModule,
  TreeViewModule,
  MenuModule,
} from '@syncfusion/ej2-angular-navigations';

// Fonts
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@NgModule({
  declarations: [ViewsComponent],
  imports: [
    CommonModule,
    SidebarModule,
    TreeViewModule,
    RouterModule.forChild(ROUTES),
    // RouterModule.forRoot(ROUTES),
    FontAwesomeModule,
    MenuModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ViewsModule {}
