import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { RequirePermission } from "../common/require-permission.decorator";
import { ProductsService } from "./products.service";

@Controller("companies/:companyId/products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @RequirePermission("inventory", "view")
  list(@Param("companyId") companyId: string) {
    return this.productsService.list(companyId);
  }

  @Get("low-stock")
  @RequirePermission("inventory", "view")
  lowStock(@Param("companyId") companyId: string) {
    return this.productsService.lowStock(companyId);
  }

  @Post()
  @RequirePermission("inventory", "create")
  create(@Param("companyId") companyId: string, @Body() body: any) {
    return this.productsService.create(companyId, body);
  }
}
