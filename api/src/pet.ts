import { DECAY_PER_HOUR, clamp, xpForLevel } from "@keepet/shared";
import type { Pet } from "@keepet/shared";
import { now } from "./ids";

interface PetRow {
  id: string;
  child_id: string;
  species: string;
  name: string;
  level: number;
  xp: number;
  hunger: number;
  happiness: number;
  current_skin: string;
  last_updated: number;
}

/**
 * 讀取時懶算衰減：依 last_updated 與當下時間差套用衰減，回寫資料庫後回傳現值。
 * 不在客戶端跑計時器 — 省電、且改系統時間也無法作弊（以伺服器時間為準）。
 */
export async function getPetWithDecay(db: D1Database, childId: string): Promise<Pet | null> {
  const pet = await db
    .prepare("SELECT * FROM pets WHERE child_id = ?")
    .bind(childId)
    .first<PetRow>();
  if (!pet) return null;

  const current = now();
  const hours = Math.max(0, (current - pet.last_updated) / 3_600_000);
  if (hours > 0) {
    pet.hunger = clamp(pet.hunger - DECAY_PER_HOUR.hunger * hours);
    pet.happiness = clamp(pet.happiness - DECAY_PER_HOUR.happiness * hours);
    pet.last_updated = current;
    await db
      .prepare("UPDATE pets SET hunger = ?, happiness = ?, last_updated = ? WHERE id = ?")
      .bind(pet.hunger, pet.happiness, pet.last_updated, pet.id)
      .run();
  }
  return rowToPet(pet);
}

export interface FeedEffect {
  hunger?: number;
  happiness?: number;
  xp?: number;
}

/** 純函式：算出餵食後的寵物狀態（含連升等級），不碰資料庫。 */
export function computeFeed(pet: Pet, effect: FeedEffect): Pet {
  const hunger = clamp(pet.hunger + (effect.hunger ?? 0));
  const happiness = clamp(pet.happiness + (effect.happiness ?? 0));
  let xp = pet.xp + (effect.xp ?? 0);
  let level = pet.level;
  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level += 1;
  }
  return { ...pet, hunger, happiness, xp, level, last_updated: now() };
}

/** 把寵物現值寫回的 prepared statement（供 batch 與其他寫入同交易）。 */
export function petUpdateStmt(db: D1Database, pet: Pet): D1PreparedStatement {
  return db
    .prepare(
      "UPDATE pets SET hunger = ?, happiness = ?, xp = ?, level = ?, current_skin = ?, last_updated = ? WHERE id = ?",
    )
    .bind(pet.hunger, pet.happiness, pet.xp, pet.level, pet.current_skin, pet.last_updated, pet.id);
}

/** 套用一次餵食並立即寫回資料庫，回傳新狀態。 */
export async function applyFeed(db: D1Database, pet: Pet, effect: FeedEffect): Promise<Pet> {
  const updated = computeFeed(pet, effect);
  await petUpdateStmt(db, updated).run();
  return updated;
}

export function rowToPet(row: PetRow): Pet {
  return {
    id: row.id,
    child_id: row.child_id,
    species: row.species,
    name: row.name,
    level: row.level,
    xp: row.xp,
    hunger: row.hunger,
    happiness: row.happiness,
    current_skin: row.current_skin,
    last_updated: row.last_updated,
  };
}
