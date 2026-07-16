import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";

@Injectable()
export class NotificationJobsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationJobsService.name);

  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly notificationsService: NotificationsService) {}

  onModuleInit(): void {
    const intervalMs = 15 * 60 * 1000;
    void this.runSafely();
    this.interval = setInterval(() => void this.runSafely(), intervalMs);
  }

  private async runSafely(): Promise<void> {
    try {
      await this.notificationsService.runCrmNotificationJobs();
    } catch (e) {
      this.logger.error("CRM notification job failed", e instanceof Error ? e.stack : String(e));
    }
  }
}
