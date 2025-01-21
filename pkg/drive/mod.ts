import { OpenAPIHono } from '@hono/zod-openapi';
import { Cat, Ether, Option, Promise, Result } from '@mikuroxina/mini-fn';

import type { AccountID } from '../accounts/model/account.js';
import { authenticateToken } from '../accounts/service/authenticationTokenService.js';
import {
  type AuthMiddlewareVariable,
  authenticateMiddleware,
} from '../adaptors/authenticateMiddleware.js';
import { prismaClient } from '../adaptors/prisma.js';
import { clockSymbol } from '../id/mod.js';
import { DriveController } from './adaptor/controller/drive.js';
import { driveModuleLogger } from './adaptor/logger.js';
import { inMemoryMediaRepo } from './adaptor/repository/dummy.js';
import { prismaMediaRepo } from './adaptor/repository/prisma.js';
import { MediaNotFoundError } from './model/errors.js';
import { GetMediaRoute } from './router.js';
import { fetchMediaService } from './service/fetch.js';

const isProduction = process.env.NODE_ENV === 'production';
const composer = Ether.composeT(Promise.monad);
const liftOverPromise = Ether.liftEther(Promise.monad);

class Clock {
  now() {
    return BigInt(Date.now());
  }
}
const clock = Ether.newEther(clockSymbol, () => new Clock());
const authToken = await Cat.cat(authenticateToken).feed(
  composer(liftOverPromise(clock)),
).value;

const AuthMiddleware = await Ether.runEtherT(
  Cat.cat(liftOverPromise(authenticateMiddleware)).feed(composer(authToken))
    .value,
);

const mediaRepository = isProduction
  ? prismaMediaRepo(prismaClient)
  : inMemoryMediaRepo([]);

const controller = new DriveController(
  Ether.runEther(
    Cat.cat(fetchMediaService).feed(Ether.compose(mediaRepository)).value,
  ),
);

export const drive = new OpenAPIHono<{
  Variables: AuthMiddlewareVariable;
}>();

drive.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', {
  type: 'http',
  scheme: 'bearer',
});

drive.doc31('/drive/doc.json', {
  openapi: '3.1.0',
  info: {
    title: 'Drive API',
    version: '0.1.0',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
});

drive[GetMediaRoute.method](
  GetMediaRoute.path,
  AuthMiddleware.handle({ forceAuthorized: true }),
);
drive.openapi(GetMediaRoute, async (c) => {
  const accountID = Option.unwrap(c.get('accountID'));
  const res = await controller.getMediaByAuthorId(accountID as AccountID);
  if (Result.isErr(res)) {
    const error = Result.unwrapErr(res);
    driveModuleLogger.warn(error);
    if (error instanceof MediaNotFoundError) {
      return c.json({ error: 'FILE_NOT_FOUND' as const }, 404);
    }
    driveModuleLogger.error('Uncaught error', error);
    return c.json({ error: 'INTERNAL_ERROR' as const }, 500);
  }

  return c.json(res[1], 200);
});
