import { CommonModule } from '@angular/common';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterModule } from '@angular/router';
import { routes } from './_routes';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { MerchandiseComponent } from '@views/merchandising/merchandise/merchandise-grid';
import { MerchandiseDetailComponent } from './merchandise-detail/merchandise-detail';
import { MerchandiseDetailInputComponent } from './merchandise-detail-input/merchandise-detail-input';
import { MerchandiseMovementComponent } from './merchandise-movements/merchandise-movement-grid';
// Syncfusion
import { GridAllModule } from '@syncfusion/ej2-angular-grids';
import {
  ToolbarModule,
  TabModule, 
  TabComponent,
  TabItemsDirective,
  TabItemDirective,
} from '@syncfusion/ej2-angular-navigations';
import { TextBoxModule,  MaskedTextBoxModule, NumericTextBoxModule } from '@syncfusion/ej2-angular-inputs';
import { DropDownListModule } from '@syncfusion/ej2-angular-dropdowns';
import { ButtonModule, SwitchModule, CheckBoxModule  } from '@syncfusion/ej2-angular-buttons';
import { DatePickerModule } from '@syncfusion/ej2-angular-calendars';
import { enableRipple } from '@syncfusion/ej2-base';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

enableRipple(true);

@NgModule({
  declarations: [
    MerchandiseComponent,
    MerchandiseDetailComponent,
    MerchandiseDetailInputComponent,
    MerchandiseMovementComponent, 
  
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    FontAwesomeModule,
    ToolbarModule,
    TabModule, 
    GridAllModule,
    TextBoxModule,
    MaskedTextBoxModule, 
    NumericTextBoxModule, 
    DropDownListModule,
    SwitchModule,
    DatePickerModule,
    ButtonModule,
    CheckBoxModule, 
    FormsModule,
    ReactiveFormsModule,
  ],

  schemas: [CUSTOM_ELEMENTS_SCHEMA], 
  providers: [],
})
export class MerchandiseModule {}
