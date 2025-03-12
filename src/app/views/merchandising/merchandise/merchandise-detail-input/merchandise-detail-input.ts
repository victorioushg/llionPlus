import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'llion-organization-detail-input',
  templateUrl: './organization-detail-input.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false, 
})
export class OrganizationDetailInputComponent {
  visible: boolean = true;

  constructor() {}

  ngOnInit() {}

  clearForm() {}

  onCancelClick() {}

  onSaveClick() {}
}
