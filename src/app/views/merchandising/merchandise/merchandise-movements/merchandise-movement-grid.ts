import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  GridComponent,
  ToolbarItems,
  GridModule, 
  EditService, 
  ToolbarService, 
  CommandModel,
  SearchSettingsModel,
} from '@syncfusion/ej2-angular-grids';
import MiniToolbar from '@assets/json/minitoolbar.json';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { MerchandiseService } from '@views/merchandising/merchandise/merchandise.service';
import { IMerchandiseMovement } from '@views/merchandising/merchandise/merchandise-movements/merchandisemovement';

import {
  BehaviorSubject,
  Observable,
  Subject,
} from 'rxjs';
import { ApplicationService } from '@shared/services/applicattionService';

@Component({
  selector: 'llion-merchandise-movements',
  templateUrl: './merchandise-movement-grid.html',
  styleUrls: ['./merchandise-movement-grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [EditService, ToolbarService],  
  standalone: false,

})
export class MerchandiseMovementComponent implements OnInit {
  public commands!: CommandModel[];
  public screenMovementsHeight!: number;

  private errorMessageSubject = new Subject<string>();
  errorMessage$ = this.errorMessageSubject.asObservable();
  private searchStringSubject = new BehaviorSubject<string>('');
  searchStringAction$ = this.searchStringSubject.asObservable();

  @ViewChild('grid') public grid!: GridComponent;
  @ViewChild('toast') toast!: ElementRef;

  movements$!: Observable<IMerchandiseMovement[]>;
  toolbar: ToolbarItems[] | object = MiniToolbar;
  searchSettings?: SearchSettingsModel;

  constructor(
    private applicationService: ApplicationService,
    private merchandiseService: MerchandiseService,
    private toastService: ToastService,
  ) {}

  ngOnInit() {
    this.screenMovementsHeight = window.innerHeight - 300;
    this.commands = [
      {
        type: 'Delete',
        buttonOption: { cssClass: 'e-btn', iconCss: 'e-trash e-icons' },
      },
    ];
    this.searchSettings = { operator: 'contains' };

    // this.movements$ = combineLatest([
    //   this.merchandiseService.movementsCRUD$,
    //   this.searchStringAction$.pipe(startWith('')),
    // ]).pipe(
    //   map(([movements, searchStr]) =>
    //     movements.filter((m) =>
    //       m.name.toLocaleLowerCase().includes(searchStr.toLocaleLowerCase())
    //     )
    //   ),
    //   catchError((err) => {
    //     this.toastService.showMyToast(err, toastType.error);
    //     return EMPTY;
    //   })
    // );
    this.movements$ = this.merchandiseService.merchandiseMovements$.pipe();
  }
  onSaveClick() {}
  
  dateValueAccessor(field: string, data: any, column: any) {
    if (!data[field]) {
      return '';
    }
    return data[field];
  }
}
