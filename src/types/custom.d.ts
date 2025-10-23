import { IJWTPayload } from './Index';

declare global {
  namespace Express {
    interface Request {
      user?: IJWTPayload;
    }
  }
}