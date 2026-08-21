import { createParamDecorator, ExecutionContext, SetMetadata } from "@nestjs/common";
import type { NoraPrincipal } from "./identity-context.js";
import type { NoraPermission } from "./permissions.js";

export const PUBLIC_ROUTE = "nora:public-route";
export const REQUIRED_PERMISSION = "nora:required-permission";

export const Public = () => SetMetadata(PUBLIC_ROUTE, true);
export const RequirePermission = (permission: NoraPermission) => (
  SetMetadata(REQUIRED_PERMISSION, permission)
);

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): NoraPrincipal | undefined => (
    context.switchToHttp().getRequest<{ principal?: NoraPrincipal }>().principal
  ),
);
