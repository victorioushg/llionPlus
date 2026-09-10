import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'llion-customer-document-page',
  templateUrl: './customer-document-page.html',
  styleUrls: ['./customer-document-page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class CustomerDocumentPageComponent implements OnInit {
  title = '';

  constructor(
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.title = data['title'] ?? 'Documentos';
      this.cdr.markForCheck();
    });
  }
}
