import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Inject,
} from "@nestjs/common";
import { OrganizationsService } from "./organizations.service";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { JwtPayload } from "@energivia/types";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";
import { InviteMemberDto } from "./dto/invite-member.dto";
import { UpdateMemberDto } from "./dto/update-member.dto";
import { CreateWhatsappInboundPhoneDto } from "./dto/create-whatsapp-inbound-phone.dto";

@Controller("organizations")
@UseGuards(UnifiedAuthGuard)
export class OrganizationsController {
  constructor(@Inject(OrganizationsService) private readonly organizations: OrganizationsService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateOrganizationDto) {
    return this.organizations.create(user.sub, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.organizations.findAllForUser(user.sub);
  }

  @Get(":id/whatsapp-inbound-phones")
  listWhatsappInboundPhones(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.organizations.listWhatsappInboundPhones(id, user.sub);
  }

  @Post(":id/whatsapp-inbound-phones")
  addWhatsappInboundPhone(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateWhatsappInboundPhoneDto
  ) {
    return this.organizations.addWhatsappInboundPhone(id, user.sub, dto);
  }

  @Delete(":id/whatsapp-inbound-phones/:phoneId")
  removeWhatsappInboundPhone(
    @Param("id") id: string,
    @Param("phoneId") phoneId: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.organizations.removeWhatsappInboundPhone(id, phoneId, user.sub);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.organizations.findOne(id, user.sub);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateOrganizationDto
  ) {
    return this.organizations.update(id, user.sub, dto);
  }

  @Get(":id/members")
  getMembers(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.organizations.getMembers(id, user.sub);
  }

  @Post(":id/invite")
  invite(@Param("id") id: string, @CurrentUser() user: JwtPayload, @Body() dto: InviteMemberDto) {
    return this.organizations.invite(id, user.sub, dto);
  }

  @Patch(":id/members/:memberId")
  updateMember(
    @Param("id") id: string,
    @Param("memberId") memberId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateMemberDto
  ) {
    return this.organizations.updateMember(id, memberId, user.sub, dto);
  }

  @Delete(":id/members/:memberId")
  removeMember(
    @Param("id") id: string,
    @Param("memberId") memberId: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.organizations.removeMember(id, memberId, user.sub);
  }
}
