import { Module } from "@nestjs/common";
import { LandedCostController } from "./landed-cost.controller";
import { LandedCostService } from "./landed-cost.service";

@Module({ controllers: [LandedCostController], providers: [LandedCostService] })
export class LandedCostModule {}
