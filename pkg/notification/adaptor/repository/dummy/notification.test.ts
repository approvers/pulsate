import { Option, Result } from '@mikuroxina/mini-fn';
import { describe, expect, it } from 'vitest';
import type { AccountID } from '../../../../accounts/model/account.js';
import type { NoteID } from '../../../../notes/model/note.js';
import type { ReactionID } from '../../../../notes/model/reaction.js';
import {
  Notification,
  type NotificationID,
} from '../../../model/notification.js';
import { InMemoryNotificationRepository } from './notification.js';

describe('InMemoryNotificationRepository', () => {
  const dummyNotification1 = Notification.new({
    id: '1' as NotificationID,
    recipientID: '10' as AccountID,
    notificationType: 'followed',
    actorType: 'account',
    actorID: '11' as AccountID,
    createdAt: new Date('2023-09-10T00:00:00Z'),
    sourceID: null,
    activityID: null,
  });
  const dummyNotification2 = Notification.new({
    id: '2' as NotificationID,
    recipientID: '10' as AccountID,
    notificationType: 'reacted',
    actorType: 'account',
    actorID: '11' as AccountID,
    createdAt: new Date('2023-09-11T00:00:00Z'),
    sourceID: '12' as NoteID,
    activityID: '13' as ReactionID,
  });
  const dummyNotification3 = Notification.new({
    id: '3' as NotificationID,
    recipientID: '10' as AccountID,
    notificationType: 'mentioned',
    actorType: 'account',
    actorID: '11' as AccountID,
    createdAt: new Date('2023-09-12T00:00:00Z'),
    sourceID: null,
    activityID: '14' as NoteID,
  });
  const dummyNotification4 = Notification.new({
    id: '4' as NotificationID,
    recipientID: '10' as AccountID,
    notificationType: 'renoted',
    actorType: 'account',
    actorID: '11' as AccountID,
    createdAt: new Date('2023-09-13T00:00:00Z'),
    sourceID: '15' as NoteID,
    activityID: '16' as NoteID,
  });
  const dummyNotification5 = Notification.new({
    id: '5' as NotificationID,
    recipientID: '10' as AccountID,
    notificationType: 'followRequested',
    actorType: 'account',
    actorID: '11' as AccountID,
    createdAt: new Date('2023-09-14T00:00:00Z'),
    sourceID: null,
    activityID: null,
  });

  const repository = new InMemoryNotificationRepository([
    dummyNotification1,
    dummyNotification2,
    dummyNotification3,
    dummyNotification4,
    dummyNotification5,
  ]);

  it('filter: if beforeID is specified, return notes before the specified note', async () => {
    /**
     * NOTE:
     * ```
     * Old -> New
     * 1   2   3   4   5
     *         ^ before
     *        ←| returns 1,2 (specified notification is excluded)
     * ```
     */
    const actual = await repository.findByRecipientID('10' as AccountID, {
      limit: Option.none(),
      cursor: Option.some({
        type: 'before',
        id: '3' as NotificationID,
      }),
    });

    expect(Result.isOk(actual)).toBe(true);
    expect(Result.unwrap(actual)).toStrictEqual([
      dummyNotification2,
      dummyNotification1,
    ]);
  });

  it('filter: if afterID is specified, return notes after the specified note', async () => {
    /**
     * NOTE:
     * ```
     * Old -> New
     * 1   2   3   4   5
     *         ^ after
     *         |→ returns 4,5 (specified notification is included)
     * ```
     */
    const actual = await repository.findByRecipientID('10' as AccountID, {
      limit: Option.none(),
      cursor: Option.some({
        type: 'after',
        id: '3' as NotificationID,
      }),
    });

    expect(Result.isOk(actual)).toBe(true);
    expect(Result.unwrap(actual)).toStrictEqual([
      dummyNotification5,
      dummyNotification4,
    ]);
  });

  it('filter: if after/beforeID are not specified, return {filter.limit} notifications from the latest notification', async () => {
    // if limit not set, returns 5 notifications
    // NOTE: If the number of all notifications is less than the limit, return all notifications
    const limitNotSet = await repository.findByRecipientID('10' as AccountID, {
      limit: Option.none(),
      cursor: Option.none(),
    });
    expect(Result.isOk(limitNotSet)).toBe(true);
    expect(Result.unwrap(limitNotSet)).toStrictEqual([
      dummyNotification5,
      dummyNotification4,
      dummyNotification3,
      dummyNotification2,
      dummyNotification1,
    ]);

    // if limit set 2, returns 2 notifications
    const limit2 = await repository.findByRecipientID('10' as AccountID, {
      limit: Option.some(2),
      cursor: Option.none(),
    });
    expect(Result.isOk(limit2)).toBe(true);
    expect(Result.unwrap(limit2)).toStrictEqual([
      dummyNotification5,
      dummyNotification4,
    ]);
  });
});
