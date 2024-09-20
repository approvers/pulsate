import type { Option, Result } from '@mikuroxina/mini-fn';

import type { AccountID } from '../../accounts/model/account.js';
import type { Medium, MediumID } from '../../drive/model/medium.js';
import type { Bookmark } from './bookmark.js';
import type { Note, NoteID } from './note.js';
import type { Reaction } from './reaction.js';

export interface NoteRepository {
  create(note: Note): Promise<Result.Result<Error, void>>;
  findByAuthorID(
    authorID: AccountID,
    limit: number,
  ): Promise<Option.Option<Note[]>>;
  findByID(id: NoteID): Promise<Option.Option<Note>>;
  /**
   * Find notes by id\
   * NOTE: Don't use this method to fetch timeline/list notes.
   *       use {@link TimelineRepository}.
   * @param ids
   */
  findManyByIDs(ids: NoteID[]): Promise<Result.Result<Error, Note[]>>;
  deleteByID(id: NoteID): Promise<Result.Result<Error, void>>;
}

export interface BookmarkRepository {
  create(id: {
    noteID: NoteID;
    accountID: AccountID;
  }): Promise<Result.Result<Error, void>>;
  findByID(id: {
    noteID: NoteID;
    accountID: AccountID;
  }): Promise<Option.Option<Bookmark>>;
  findByAccountID(id: AccountID): Promise<Option.Option<Bookmark[]>>;
  deleteByID(id: {
    noteID: NoteID;
    accountID: AccountID;
  }): Promise<Result.Result<Error, void>>;
}

export interface NoteAttachmentRepository {
  create(
    noteID: NoteID,
    attachmentFileID: readonly MediumID[],
  ): Promise<Result.Result<Error, void>>;
  findByNoteID(noteID: NoteID): Promise<Result.Result<Error, Medium[]>>;
}

export interface ReactionRepository {
  create(
    id: {
      noteID: NoteID;
      accountID: AccountID;
    },
    body: string,
  ): Promise<Result.Result<Error, void>>;
  findByID(id: {
    noteID: NoteID;
    accountID: AccountID;
  }): Promise<Option.Option<Reaction>>;
  reactionsByAccount(id: AccountID): Promise<Result.Result<Error, Reaction[]>>;
  findByNoteID(id: NoteID): Promise<Result.Result<Error, Reaction[]>>;
  deleteByID(id: {
    noteID: NoteID;
    accountID: AccountID;
  }): Promise<Result.Result<Error, void>>;
}
