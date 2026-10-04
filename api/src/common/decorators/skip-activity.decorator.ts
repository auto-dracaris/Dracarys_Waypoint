import { SetMetadata } from '@nestjs/common';

export const SKIP_ACTIVITY_KEY = 'skipActivity';

/** Keeps a high-volume route out of the activity log — see `ActivityInterceptor`. */
export const SkipActivity = () => SetMetadata(SKIP_ACTIVITY_KEY, true);
