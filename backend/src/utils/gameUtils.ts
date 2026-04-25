import { CardType, Player, Room } from '../types';

export function generateRoomCode(existingRooms: string[]): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return existingRooms.includes(result) ? generateRoomCode(existingRooms) : result;
}

export function getWinner(choice1: CardType, choice2: CardType): 1 | 2 | 0 {
  if (choice1 === choice2) return 0;
  if (
    (choice1 === 'rock' && choice2 === 'scissors') ||
    (choice1 === 'paper' && choice2 === 'rock') ||
    (choice1 === 'scissors' && choice2 === 'paper')
  ) {
    return 1;
  }
  return 2;
}

export const cleanPlayerForBroadcast = (player: Player) => {
  const { ws, choice, deck, ...safePlayer } = player;
  
  const maskedDeck = { ...deck };
  if (choice) {
    maskedDeck[choice] += 1;
  }
  
  return { ...safePlayer, deck: maskedDeck, hasChosen: choice !== null };
};

export const cleanRoomForBroadcast = (room: Room, askingPlayerId?: string) => {
  const cleanPlayers: Record<string, any> = {};
  
  if (askingPlayerId && room.players[askingPlayerId]) {
    const { ws, ...safePlayer } = room.players[askingPlayerId];
    cleanPlayers[askingPlayerId] = safePlayer;
  }

  Object.values(room.players).forEach(p => {
    if (p.id === askingPlayerId) return;

    if (room.gameState === 'revealing' || room.gameState === 'roundResult' || room.gameState === 'gameOver') {
      const { ws, ...safePlayer } = p;
      cleanPlayers[p.id] = safePlayer;
    } else {
      cleanPlayers[p.id] = cleanPlayerForBroadcast(p);
    }
  });
  
  return { ...room, players: cleanPlayers };
};
