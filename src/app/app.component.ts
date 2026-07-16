import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  Event as RouterEvent,
} from '@angular/router';
import { SpinnerService } from '@shared/services/spinner.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'llion-root',
  template: `
    <div id="llion-global-spinner" class="llion-global-spinner-host"></div>
    <router-outlet></router-outlet>
  `,
  styles: [
    `
      .llion-global-spinner-host {
        position: fixed;
        inset: 0;
        z-index: 100000;
        pointer-events: none;
      }

      .llion-global-spinner-host:has(.e-spin-show) {
        pointer-events: all;
      }
    `,
  ],
  standalone: false,
})
export class AppComponent implements AfterViewInit, OnDestroy {
  title = 'llion';
  private routerSub?: Subscription;

  constructor(
    private spinnerService: SpinnerService,
    private router: Router
  ) {
    this.spinnerService.applyGlobalTemplate();
  }

  ngAfterViewInit(): void {
    const target = document.getElementById('llion-global-spinner');
    if (target) {
      this.spinnerService.init(target);
    }

    this.routerSub = this.router.events.subscribe((event: RouterEvent) => {
      if (event instanceof NavigationStart) {
        this.spinnerService.show();
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.spinnerService.hide();
      }
    });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }
}
