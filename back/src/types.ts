import { Request, Response } from 'express';
import { Socket } from 'net';

export interface ClientConnection {
  id: string;
  response: Response;
  ip: string;
  connectedAt: Date;
  userAgent?: string;
}

export interface Pool {
  id: string;
  configHash: string;
  createdAt: Date;
  clients: Set<ClientConnection>;
}