import { describe, expect, it } from 'vitest';
import type { AccountID } from '../../accounts/model/account.js';
import { Notification, type NotificationID } from './notification.js';

describe('Notification', () => {
  it('should create new instance', () => {
    const res = Notification.new({
      id: '1' as NotificationID,
      notificationType: 'followed',
      recipientID: '10' as AccountID,
      createdAt: new Date('2023-09-10T00:00:00.000Z'),
      actorType: 'account',
      actorID: '20' as AccountID,
      sourceID: null,
      activityID: null,
    });
    expect(res).toMatchSnapshot();
  });
});
