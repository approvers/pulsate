import { Result } from '@mikuroxina/mini-fn';
import { afterEach, describe, expect, it } from 'vitest';
import { InMemoryAccountRepository } from '~/accounts/adaptor/repository/dummy.js';
import { Account, type AccountID } from '~/accounts/model/account.js';
import type { ID } from '~/id/type.js';

import { FetchAccountService } from './fetchAccount.js';

const repository = new InMemoryAccountRepository();
await repository.create(
  Account.new({
    id: '1' as ID<AccountID>,
    name: '@john@example.com',
    mail: 'johndoe@example.com',
    nickname: 'John Doe',
    passphraseHash: 'hash',
    bio: '',
    role: 'normal',
    frozen: 'normal',
    silenced: 'normal',
    status: 'notActivated',
    createdAt: new Date(),
  }),
);
const fetchAccountService = new FetchAccountService(repository);

describe('FetchAccountService', () => {
  afterEach(() => repository.reset());

  it('fetch account info', async () => {
    const account = await fetchAccountService.fetchAccount('@john@example.com');
    if (Result.isErr(account)) return;

    expect(account[1].getID()).toBe('1');
    expect(account[1].getName()).toBe('@john@example.com');
    expect(account[1].getMail()).toBe('johndoe@example.com');
    expect(account[1].getNickname()).toBe('John Doe');
    expect(account[1].getPassphraseHash()).toBe('hash');
    expect(account[1].getBio()).toBe('');
    expect(account[1].getRole()).toBe('normal');
    expect(account[1].getFrozen()).toBe('normal');
    expect(account[1].getSilenced()).toBe('normal');
    expect(account[1].getStatus()).toBe('notActivated');
    expect(account[1].getCreatedAt()).toBeInstanceOf(Date);
  });

  it("fetch account info doesn't exist", async () => {
    // `@notJohn` is not registered.
    const account = await fetchAccountService.fetchAccount(
      '@notJohn@example.com',
    );

    expect(Result.isErr(account)).toBe(true);
  });

  it('fetch account by ID', async () => {
    const account = await fetchAccountService.fetchAccountByID(
      '1' as ID<AccountID>,
    );
    if (Result.isErr(account)) {
      return;
    }

    expect(account[1]).toStrictEqual(
      Account.new({
        id: '1' as ID<AccountID>,
        name: '@john@example.com',
        mail: 'johndoe@example.com',
        nickname: 'John Doe',
        passphraseHash: 'hash',
        bio: '',
        role: 'normal',
        frozen: 'normal',
        silenced: 'normal',
        status: 'notActivated',
        createdAt: new Date(),
      }),
    );
  });

  it("fetch account by ID doesn't exist", async () => {
    // `2` is not registered.
    const account = await fetchAccountService.fetchAccountByID(
      '2' as ID<AccountID>,
    );

    expect(Result.isErr(account)).toBe(true);
  });
});
