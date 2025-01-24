import { CommonModule } from '@angular/common';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterModule } from '@angular/router';
import { routes } from './_routes';
import { ParametersComponent } from '@app/views/control/parameters/parameters-grid';

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
    ParametersComponent,
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
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
export class ParametersModule {}
