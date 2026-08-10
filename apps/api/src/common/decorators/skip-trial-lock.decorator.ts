import { SetMetadata } from "@nestjs/common";

export const IS_TRIAL_LOCK_SKIPPED = "isTrialLockSkipped";
export const SkipTrialLock = () => SetMetadata(IS_TRIAL_LOCK_SKIPPED, true);
