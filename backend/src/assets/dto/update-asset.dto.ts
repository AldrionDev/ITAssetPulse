import { PartialType } from '@nestjs/mapped-types';
import { CreateAssetDto } from './create-asset.dto';

/**
 * Explicit class so the update payload keeps its validation metadata at
 * runtime. `Partial<CreateAssetDto>` erases to `Object`, which makes the
 * global ValidationPipe skip the body entirely.
 */
export class UpdateAssetDto extends PartialType(CreateAssetDto) {}
