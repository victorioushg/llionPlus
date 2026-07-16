import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { SpinnerService } from '@shared/services/spinner.service';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  constructor(private spinnerService: SpinnerService) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    if (request.headers.has('X-Skip-Spinner')) {
      return next.handle(
        request.clone({
          headers: request.headers.delete('X-Skip-Spinner'),
        })
      );
    }

    this.spinnerService.show();
    return next.handle(request).pipe(finalize(() => this.spinnerService.hide()));
  }
}
