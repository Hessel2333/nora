import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, type Subscription } from "rxjs";
import { identityContext, type NoraPrincipal } from "./identity-context.js";

@Injectable()
export class IdentityContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const principal = context.switchToHttp().getRequest<{ principal?: NoraPrincipal }>().principal;
    if (!principal) return next.handle();
    return new Observable((subscriber) => {
      let subscription: Subscription | undefined;
      identityContext.run(principal, () => {
        subscription = next.handle().subscribe(subscriber);
      });
      return () => subscription?.unsubscribe();
    });
  }
}
