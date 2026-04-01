import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Language } from '@prisma/client';

/**
 * DTO for updating user language preference
 */
export class UpdateLanguageDto {
  @ApiProperty({
    description: 'User preferred language',
    enum: Language,
    example: Language.EN,
  })
  @IsEnum(Language, { message: 'Language must be FR or EN' })
  language: Language;
}
