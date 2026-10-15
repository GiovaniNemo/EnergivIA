/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { FeedbacksService } from "../feedbacks.service";

describe("FeedbacksService - getUserFeedbackStatus", () => {
  let service: FeedbacksService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findFirst: vi.fn(),
      },
      platformFeedback: {
        count: vi.fn(),
        create: vi.fn(),
      },
    };
    service = new FeedbacksService(mockPrisma);
  });

  it("should return hasSubmitted: false when neither user nor tenantId is provided", async () => {
    const result = await service.getUserFeedbackStatus();
    expect(result).toEqual({ hasSubmitted: false });
    expect(mockPrisma.platformFeedback.count).not.toHaveBeenCalled();
  });

  it("should return hasSubmitted: true when feedback exists for user by sub", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: "user-123",
      email: "integrador@solar.com",
      tenantId: "tenant-456",
    });
    mockPrisma.platformFeedback.count.mockResolvedValue(1);

    const result = await service.getUserFeedbackStatus(
      { sub: "auth0|123", email: "integrador@solar.com" } as any,
      "tenant-456"
    );

    expect(result).toEqual({ hasSubmitted: true });
    expect(mockPrisma.platformFeedback.count).toHaveBeenCalledWith({
      where: {
        OR: expect.arrayContaining([
          { userId: "auth0|123" },
          { userId: "user-123" },
          { userEmail: "integrador@solar.com" },
          { tenantId: "tenant-456" },
        ]),
      },
    });
  });

  it("should return hasSubmitted: false when no feedback exists in the database", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.platformFeedback.count.mockResolvedValue(0);

    const result = await service.getUserFeedbackStatus({
      sub: "auth0|new",
      email: "novo@solar.com",
    } as any);

    expect(result).toEqual({ hasSubmitted: false });
    expect(mockPrisma.platformFeedback.count).toHaveBeenCalled();
  });
});
