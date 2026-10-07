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
import {
  ButtonModule,
  CheckBoxModule,
  SwitchModule,
} from '@syncfusion/ej2-angular-buttons';
import { DatePickerModule } from '@syncfusion/ej2-angular-calendars';
import { enableRipple } from '@syncfusion/ej2-base';
import { routes } from './_routes';
import { ProductLineComponent } from '@views/production/product-lines/product-line-grid';
import { ProductLineDetailComponent } from '@views/production/product-lines/product-line-detail';
import { ResourceComponent } from '@views/production/resources/resource-grid';
import { ResourceDetailComponent } from '@views/production/resources/resource-detail';
import { FormulationComponent } from '@views/production/formulations/formulation-grid';
import { FormulationDetailComponent } from '@views/production/formulations/formulation-detail';
import { ProductionOrderComponent } from '@views/production/orders/production-order-grid';
import { ProductionOrderDetailComponent } from '@views/production/orders/production-order-detail';
import { ProductionTrackingComponent } from '@views/production/tracking/production-tracking-grid';

enableRipple(true);

@NgModule({
  declarations: [
    ProductLineComponent,
    ProductLineDetailComponent,
    ResourceComponent,
    ResourceDetailComponent,
    FormulationComponent,
    FormulationDetailComponent,
    ProductionOrderComponent,
    ProductionOrderDetailComponent,
    ProductionTrackingComponent,
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    FontAwesomeModule,
    ToolbarModule,
    TabModule,
    GridAllModule,
    TextBoxModule,
    NumericTextBoxModule,
    DropDownListModule,
    DatePickerModule,
    SwitchModule,
    CheckBoxModule,
    ButtonModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ProductionModule {}
