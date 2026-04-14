"use client";

import { openDB, DBSchema, IDBPDatabase } from "idb";
import { VocabWord } from "./types";

interface EchoesDB extends DBSchema {
  vocab: {
    key: string;
    value: VocabWord;
    indexes: {
      "by-next-review": string;
      "by-created": string;
      "by-word": string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<EchoesDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<EchoesDB>("echoes-vocab", 1, {
      upgrade(db) {
        const store = db.createObjectStore("vocab", { keyPath: "id" });
        store.createIndex("by-next-review", "nextReview");
        store.createIndex("by-created", "createdAt");
        store.createIndex("by-word", "word");
      },
    });
  }
  return dbPromise;
}

export async function getAllWords(): Promise<VocabWord[]> {
  const db = await getDB();
  return db.getAll("vocab");
}

export async function getWordById(id: string): Promise<VocabWord | undefined> {
  const db = await getDB();
  return db.get("vocab", id);
}

export async function addWord(word: VocabWord): Promise<void> {
  const db = await getDB();
  await db.add("vocab", word);
}

export async function addWords(words: VocabWord[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("vocab", "readwrite");
  await Promise.all([...words.map((w) => tx.store.put(w)), tx.done]);
}

export async function updateWord(word: VocabWord): Promise<void> {
  const db = await getDB();
  await db.put("vocab", word);
}

export async function deleteWord(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("vocab", id);
}

export async function getDueWords(): Promise<VocabWord[]> {
  const db = await getDB();
  const now = new Date().toISOString();
  const all = await db.getAllFromIndex("vocab", "by-next-review");
  return all.filter((w) => w.nextReview <= now);
}

export async function getWordCount(): Promise<number> {
  const db = await getDB();
  return db.count("vocab");
}

export async function clearAllWords(): Promise<void> {
  const db = await getDB();
  await db.clear("vocab");
}
