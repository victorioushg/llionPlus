import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { GridAllModule } from '@syncfusion/ej2-angular-grids';
import { TabModule, ToolbarModule } from '@syncfusion/ej2-angular-navigations';
import {
  NumericTextBoxModule,
  TextBoxModule,
} from '@syncfusion/ej2-angular-inputs';
import { DropDownListModule } from '@syncfusion/ej2-angular-dropdowns';
import { ButtonModule, SwitchModule } from '@syncfusion/ej2-angular-buttons';
import { enableRipple } from '@syncfusion/ej2-base';
import { ROUTES } from './_routes';
import { ClassesComponent } from './classes-grid';
import { ClassDetailComponent } from './class-detail/class-detail';
import { ClassMovementsComponent } from './class-movements/class-movements';

enableRipple(true);

@NgModule({
  declarations: [
    ClassesComponent,
    ClassDetailComponent,
    ClassMovementsComponent,
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(ROUTES),
    FontAwesomeModule,
    ToolbarModule,
    TabModule,
    GridAllModule,
    TextBoxModule,
    NumericTextBoxModule,
    DropDownListModule,
    SwitchModule,
    ButtonModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ClassesModule {}
