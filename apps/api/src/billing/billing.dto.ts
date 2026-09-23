import { ApiProperty } from "@nestjs/swagger";

export class PrepareMembershipCheckoutDto {
  @ApiProperty({ example: true })
  acceptTerms!: boolean;
}
