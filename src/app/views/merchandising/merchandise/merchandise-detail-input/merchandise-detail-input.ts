import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  EditSettingsModel,
  GridComponent,
  ToolbarItems,
} from '@syncfusion/ej2-angular-grids';
import { Observable } from 'rxjs';
import { IMerchandiseUom } from '../merchandise';
import { MerchandiseService } from '../merchandise.service';

@Component({
  selector: 'llion-merchandise-detail-input',
  templateUrl: './merchandise-detail-input.html',
  styleUrls: ['./merchandise-detail-input.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class MerchandiseDetailInputComponent implements OnInit {
  @ViewChild('uomgrid') uomGrid?: GridComponent;

  uomData$!: Observable<IMerchandiseUom[]>;
  uomGridHeight = 230;

  uomToolbar: ToolbarItems[] = ['Add', 'Edit', 'Delete', 'Update', 'Cancel'];

  uomEditSettings: EditSettingsModel = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    mode: 'Normal',
    newRowPosition: 'Top',
  };

  constructor(private merchandiseService: MerchandiseService) {}

  ngOnInit(): void {
    this.uomData$ = this.merchandiseService.merchandiseUom$;
  }
}
