import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "contact-messages.json");

export interface FeedbackRecord {
  id: string;
  nom: string;
  email: string;
  categorie: string;
  sujet: string;
  message: string;
  date: string;
}

let writeQueue: Promise<void> = Promise.resolve();

async function readRecords(): Promise<FeedbackRecord[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? (data as FeedbackRecord[]) : [];
  } catch {
    return [];
  }
}

export async function appendFeedback(record: FeedbackRecord): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    const rows = await readRecords();
    rows.push(record);
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(rows, null, 2), "utf8");
  });
  return writeQueue;
}

export async function feedbackFileExists(): Promise<boolean> {
  try {
    await fs.access(FILE);
    return true;
  } catch {
    return false;
  }
}

export function getFeedbackFilePath(): string {
  return FILE;
}
