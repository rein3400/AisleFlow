import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

import type { AppStore, SeatLock } from "@/lib/types";
import { cloneValue, generateId, hashPassword, isExpired, nowIso } from "@/lib/utils";

let writeQueue: Promise<unknown> = Promise.resolve();
let sqlClient: postgres.Sql | null = null;

function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL ??
    process.env.NETLIFY_DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    null
  );
}

function isDatabaseStoreEnabled() {
  return Boolean(getDatabaseUrl());
}

function getSqlClient() {
  if (!sqlClient) {
    const connectionString = getDatabaseUrl();

    if (!connectionString) {
      throw new Error("DATABASE_URL tidak ditemukan untuk mode database.");
    }

    sqlClient = postgres(connectionString, {
      max: 1,
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 20,
    });
  }

  return sqlClient;
}

function getStorePath() {
  return process.env.WEDDING_STORE_PATH ?? path.join(process.cwd(), "data", "store.json");
}

function pruneExpiredLocks<T extends { seatLocks: SeatLock[] }>(store: T) {
  return {
    ...store,
    seatLocks: store.seatLocks.filter((lock) => !isExpired(lock.expiresAt)),
  };
}

function createInitialStore(): AppStore {
  const createdAt = nowIso();
  const tenantId = generateId("tenant");
  const superadminId = generateId("admin");

  return {
    tenants: [
      {
        id: tenantId,
        name: "Default Wedding Organizer",
        createdAt,
      },
    ],
    users: [
      {
        id: superadminId,
        tenantId,
        name: "Platform Superadmin",
        email: "superadmin@example.com",
        role: "superadmin",
        passwordHash: hashPassword("superadmin123"),
        eventIds: [],
        active: true,
        createdAt,
        updatedAt: createdAt,
      },
    ],
    events: [],
    themes: [],
    sessions: [],
    seats: [],
    guests: [],
    qrCredentials: [],
    seatLocks: [],
    seatBookings: [],
    auditLogs: [
      {
        id: generateId("audit"),
        eventId: null,
        actorType: "system",
        actorId: null,
        action: "store.seeded",
        metadata: {
          superadminEmail: "superadmin@example.com",
        },
        createdAt,
      },
    ],
  };
}

async function ensureStoreFile() {
  const storePath = getStorePath();

  try {
    await readFile(storePath, "utf8");
  } catch {
    await mkdir(path.dirname(storePath), { recursive: true });
    await writeFile(storePath, JSON.stringify(createInitialStore(), null, 2), "utf8");
  }
}

async function readRawStore() {
  await ensureStoreFile();
  const content = await readFile(getStorePath(), "utf8");
  return JSON.parse(content) as AppStore;
}

async function persistStore(store: AppStore) {
  await mkdir(path.dirname(getStorePath()), { recursive: true });
  await writeFile(getStorePath(), JSON.stringify(store, null, 2), "utf8");
}

function coerceStoreData(data: unknown) {
  if (typeof data === "string") {
    return JSON.parse(data) as AppStore;
  }

  return data as AppStore;
}

function toDatabaseJson(store: AppStore) {
  return JSON.parse(JSON.stringify(store)) as Record<string, unknown>;
}

async function ensureDatabaseStore(sql: postgres.Sql): Promise<void>;
async function ensureDatabaseStore(sql: postgres.TransactionSql): Promise<void>;
async function ensureDatabaseStore(sql: any) {
  await sql`
    create table if not exists app_state (
      id integer primary key,
      data jsonb not null,
      updated_at timestamptz not null default now()
    )
  `;

  const existingRows = (await sql`
    select data
    from app_state
    where id = 1
  `) as { data: unknown }[];

  if (existingRows.length === 0) {
    const initialStore = createInitialStore();
    await sql`
      insert into app_state (id, data, updated_at)
      values (1, ${sql.json(toDatabaseJson(initialStore) as never)}, now())
    `;
  }
}

async function readDatabaseStore() {
  const sql = getSqlClient();
  await ensureDatabaseStore(sql);
  const rows = await sql<{ data: unknown }[]>`
    select data
    from app_state
    where id = 1
  `;
  return coerceStoreData(rows[0].data);
}

export async function readStore() {
  const rawStore = isDatabaseStoreEnabled() ? await readDatabaseStore() : await readRawStore();
  const store = pruneExpiredLocks(rawStore);
  return cloneValue(store);
}

export async function withStoreMutation<T>(mutate: (store: AppStore) => Promise<T> | T) {
  if (isDatabaseStoreEnabled()) {
    const sql = getSqlClient();

    return sql.begin(async (transaction) => {
      const tx = transaction as unknown as postgres.Sql;
      await ensureDatabaseStore(tx);
      const rows = await tx<{ data: unknown }[]>`
        select data
        from app_state
        where id = 1
        for update
      `;
      const store = pruneExpiredLocks(coerceStoreData(rows[0].data));
      const result = await mutate(store);
      await tx`
        update app_state
        set data = ${tx.json(toDatabaseJson(store) as never)}, updated_at = now()
        where id = 1
      `;
      return cloneValue(result);
    });
  }

  const operation = writeQueue.then(async () => {
    const store = pruneExpiredLocks(await readRawStore());
    const result = await mutate(store);
    await persistStore(store);
    return cloneValue(result);
  });

  writeQueue = operation.then(
    () => undefined,
    () => undefined,
  );

  return operation;
}
