import { Ether, Option, Result } from '@mikuroxina/mini-fn';
import type { Prisma, PrismaClient } from '@prisma/client';
import type { AccountID } from '../../../../accounts/model/account.js';
import {
  Notification,
  type NotificationActorType,
  type NotificationID,
  type NotificationType,
  type NotificationTypeMap,
} from '../../../model/notification.js';
import {
  NOTIFICATION_DEFAULT_LIMIT,
  NOTIFICATION_MAX_LIMIT,
  type NotificationFilter,
  type NotificationRepository,
  notificationRepoSymbol,
} from '../../../model/repository/notification.js';

/**
 * NOTE:
 * - 0 is reserved.
 * - followed -> 1
 * - followRequested -> 2
 * - followAccepted -> 3
 * - mentioned -> 4
 * - renoted ->  5
 * - reacted ->  6
 */
const NOTIFICATION_TYPE_MAP = {
  followed: 1,
  followRequested: 2,
  followAccepted: 3,
  mentioned: 4,
  renoted: 5,
  reacted: 6,
} as const satisfies Record<NotificationType, number>;
const NOTIFICATION_TYPE_CODE_MAP: Record<number, NotificationType> = [];

for (const [k, v] of Object.entries(NOTIFICATION_TYPE_MAP)) {
  if (v in NOTIFICATION_TYPE_CODE_MAP) throw new Error('Duplicate value');

  NOTIFICATION_TYPE_CODE_MAP[v] = k as NotificationType;
}
Object.freeze(NOTIFICATION_TYPE_CODE_MAP);

export class PrismaNotificationRepository implements NotificationRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  private serialize(
    notification: Notification,
  ): Prisma.NotificationCreateInput {
    return {
      id: notification.getID(),
      recipient: {
        connect: {
          id: notification.getRecipientID(),
        },
      },
      notificationType:
        NOTIFICATION_TYPE_MAP[notification.getNotificationType()],
      actorType: notification.getActorType(),
      actor: {
        connect: {
          id: notification.getActorID(),
        },
      },
      sourceID: notification.getSourceID() ?? '',
      activityID: notification.getActivityID() ?? '',
      createdAt: notification.getCreatedAt(),
      readAt: null,
    };
  }

  private serializeFilter(
    filter: NotificationFilter,
  ): Prisma.NotificationFindManyArgs {
    const orderBy = () => {
      if (Option.isNone(filter.cursor)) {
        // default: desc
        return 'desc';
      }
      const cursor = Option.unwrap(filter.cursor);
      if (cursor.type === 'before') {
        return 'desc';
      }

      return 'asc';
    };
    const cursor = () => {
      if (Option.isNone(filter.cursor)) {
        return undefined;
      }
      const cursor = Option.unwrap(filter.cursor);
      if (cursor.type === 'before') {
        return {
          cursor: {
            id: cursor.id,
          },
          skip: 1,
        };
      }

      return {
        cursor: {
          id: cursor.id,
        },
        skip: 1,
      };
    };

    return {
      orderBy: {
        // default: desc, if afterID specified: asc
        createdAt: orderBy(),
      },
      ...cursor(),
      take: Option.isSome(filter.limit)
        ? Option.unwrap(filter.limit)
        : NOTIFICATION_DEFAULT_LIMIT,
    };
  }

  private deserialize(
    notification: Prisma.PromiseReturnType<
      typeof this.prisma.notification.findUnique
    >,
  ): Result.Result<Error, Notification> {
    if (!notification) {
      // ToDo: Define NotificationNotFoundError
      return Result.err(new Error('Notification not found'));
    }
    const notificationType =
      NOTIFICATION_TYPE_CODE_MAP[notification.notificationType];
    if (!notificationType) {
      return Result.err(new Error('Invalid notification type'));
    }

    return Result.ok(
      Notification.reconstruct({
        id: notification.id as NotificationID,
        recipientID: notification.recipientID as AccountID,
        notificationType,
        actorType: notification.actorType as NotificationActorType,
        actorID: notification.actorID as AccountID,
        createdAt: notification.createdAt,
        readAt: notification.readAt
          ? Option.some(notification.readAt)
          : Option.none(),
        sourceID:
          notification.sourceID === ''
            ? null
            : (notification.sourceID as NotificationTypeMap[typeof notificationType]['source']),
        activityID:
          notification.activityID === ''
            ? null
            : (notification.activityID as NotificationTypeMap[typeof notificationType]['activity']),
      }),
    );
  }

  async create(
    notification: Notification,
  ): Promise<Result.Result<Error, void>> {
    try {
      await this.prisma.notification.create({
        data: this.serialize(notification),
      });
      return Result.ok(undefined);
    } catch (e) {
      return Result.err(e as unknown as Error);
    }
  }

  async findByID(
    id: NotificationID,
  ): Promise<Result.Result<Error, Notification>> {
    try {
      const res = await this.prisma.notification.findUnique({
        where: {
          id: id,
        },
      });
      return this.deserialize(res);
    } catch (e) {
      return Result.err(e as unknown as Error);
    }
  }
  async findByRecipientID(
    recipientID: string,
    filter: NotificationFilter,
  ): Promise<Result.Result<Error, Notification[]>> {
    try {
      if (Option.isSome(filter.limit)) {
        if (Option.unwrap(filter.limit) > NOTIFICATION_MAX_LIMIT) {
          // ToDo: Define NotificationCursorLimitOutOfRangeError
          return Result.err(new Error('Limit exceeds the maximum value'));
        }
      }

      const res = await this.prisma.notification.findMany({
        where: {
          recipientID: recipientID,
        },
        ...this.serializeFilter(filter),
      });

      const notificationsRes = res.map((n) => this.deserialize(n));
      const notifications = notificationsRes
        .filter(Result.isOk)
        .map(Result.unwrap);

      if (notificationsRes.length !== notifications.length) {
        return Result.err(new Error('Failed to deserialize'));
      }

      return Result.ok(notifications);
    } catch (e) {
      return Result.err(e as unknown as Error);
    }
  }

  async updateReadAt(
    notification: Notification,
  ): Promise<Result.Result<Error, void>> {
    try {
      if (Option.isNone(notification.getReadAt())) {
        // ToDo: Define NotificationReadAtNotSetError
        return Result.err(new Error('ReadAt is not set'));
      }

      await this.prisma.notification.update({
        where: {
          id: notification.getID(),
        },
        data: {
          readAt: Option.unwrap(notification.getReadAt()),
        },
      });
      return Result.ok(undefined);
    } catch (e) {
      return Result.err(e as unknown as Error);
    }
  }
}
export const prismaNotificationRepo = (client: PrismaClient) =>
  Ether.newEther(
    notificationRepoSymbol,
    () => new PrismaNotificationRepository(client),
  );
