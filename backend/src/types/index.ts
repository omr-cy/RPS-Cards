import { WebSocket } from 'ws';

export type CardType = 'rock' | 'paper' | 'scissors';

export interface Deck {
  rock: number;
  paper: number;
  scissors: number;
}

export interface Player {
  id: string;
  name: string;
  themeId: string;
  deck: Deck;
  score: number;
  choice: CardType | null;
  readyForNext: boolean;
  ws: WebSocket;
}

export interface Room {
  id: string;
  players: Record<string, Player>;
  gameState: 'waiting' | 'playing' | 'revealing' | 'roundResult' | 'gameOver';
  round: number;
  roundWinner: string | 'draw' | null;
  timeLeft?: number;
  isPublic?: boolean;
}

export interface MatchmakingPlayer {
  id: string;
  name: string;
  themeId: string;
  level: number;
  ws: WebSocket;
  timeJoined: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}
