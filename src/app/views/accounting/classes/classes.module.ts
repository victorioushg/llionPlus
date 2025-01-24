import { CommonModule } from '@angular/common';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ROUTES } from './_routes';
// import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ClassesComponent } from '@views/accounting/classes/classes-grid';

// Syncfusion
import { GridAllModule } from '@syncfusion/ej2-angular-grids';
import { ToolbarModule } from '@syncfusion/ej2-angular-navigations';
import { TextBoxModule } from '@syncfusion/ej2-angular-inputs';
import { DropDownListModule } from '@syncfusion/ej2-angular-dropdowns';
import { ButtonModule, SwitchModule } from '@syncfusion/ej2-angular-buttons';

import { DatePickerModule } from '@syncfusion/ej2-angular-calendars';

import { enableRipple } from '@syncfusion/ej2-base';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';

enableRipple(true);

@NgModule({
  declarations: [
    ClassesComponent,
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(ROUTES),
    // FontAwesomeModule,
    ToolbarModule,
    GridAllModule,
    TextBoxModule,
    DropDownListModule,
    SwitchModule,
    DatePickerModule,
    ButtonModule,
    FormsModule,
    ReactiveFormsModule,
  ],

  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [],
})
export class ClassesModule {}
