import { settings } from './db';

// Get bot status from database (persists across restarts)
export async function setBotStatus(running: boolean) {
  await settings.setBoolean('botRunning', running);
}

export async function getBotStatus(): Promise<boolean> {
  return await settings.getBoolean('botRunning', false);
}

