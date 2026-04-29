import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'llion-merchandise-detail-input',
  templateUrl: './merchandise-detail-input.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true, 
})
export class MerchandiseDetailInputComponent {
  visible: boolean = true;

  constructor() {}

  ngOnInit() {}

  clearForm() {}

  onCancelClick() {}

  onSaveClick() {}
}
