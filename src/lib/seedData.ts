import { VocabWord } from "./types";
import { v4 as uuidv4 } from "uuid";

const now = new Date().toISOString();

function makeWord(
  word: string,
  phonetic: string,
  meaning: string,
  translation: string,
  example: string,
  tags: string[]
): VocabWord {
  return {
    id: uuidv4(),
    word,
    phonetic,
    meaning,
    translation,
    example,
    tags,
    srsLevel: 0,
    easeFactor: 2.5,
    interval: 1,
    nextReview: now,
    createdAt: now,
    reviewCount: 0,
    correctCount: 0,
  };
}

export const SEED_WORDS: VocabWord[] = [
  makeWord(
    "ephemeral",
    "/ɪˈfem.ər.əl/",
    "lasting for a very short time",
    "thoáng qua, ngắn ngủi",
    "The ephemeral beauty of cherry blossoms reminds us to live in the moment.",
    ["adjective", "advanced"]
  ),
  makeWord(
    "serendipity",
    "/ˌser.ənˈdɪp.ɪ.ti/",
    "the occurrence of events by chance in a happy or beneficial way",
    "sự tình cờ may mắn",
    "It was pure serendipity that they met at the airport.",
    ["noun", "advanced"]
  ),
  makeWord(
    "ubiquitous",
    "/juːˈbɪk.wɪ.təs/",
    "present, appearing, or found everywhere",
    "có mặt khắp nơi",
    "Smartphones have become ubiquitous in modern life.",
    ["adjective", "advanced"]
  ),
  makeWord(
    "resilient",
    "/rɪˈzɪl.i.ənt/",
    "able to recover quickly from difficulties",
    "kiên cường, đàn hồi",
    "She proved resilient in the face of adversity.",
    ["adjective", "intermediate"]
  ),
  makeWord(
    "ambiguous",
    "/æmˈbɪɡ.ju.əs/",
    "open to more than one interpretation; not clear",
    "mơ hồ, không rõ ràng",
    "The contract contained some ambiguous clauses.",
    ["adjective", "intermediate"]
  ),
  makeWord(
    "meticulous",
    "/məˈtɪk.jʊ.ləs/",
    "showing great attention to detail or being very careful and precise",
    "tỉ mỉ, cẩn thận",
    "He was meticulous in his research and left nothing to chance.",
    ["adjective", "advanced"]
  ),
  makeWord(
    "eloquent",
    "/ˈel.ə.kwənt/",
    "fluent or persuasive in speaking or writing",
    "hùng hồn, lưu loát",
    "Her eloquent speech moved the entire audience.",
    ["adjective", "intermediate"]
  ),
  makeWord(
    "pragmatic",
    "/præɡˈmæt.ɪk/",
    "dealing with things sensibly and practically",
    "thực dụng, thực tế",
    "We need a pragmatic approach to solve this problem.",
    ["adjective", "intermediate"]
  ),
];
