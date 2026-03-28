import { getCloudflareContext } from "@opennextjs/cloudflare";
import postgres from "postgres";

import type { AppStore, SeatLock } from "@/lib/types";
import { cloneValue, generateId, hashPassword, isExpired, nowIso } from "@/lib/utils";

type FileStoreFs = {
  mkdir: (path: string, options?: { recursive?: boolean }) => Promise<void>;
  readFile: (path: string, encoding: BufferEncoding) => Promise<string>;
  writeFile: (path: string, data: string, encoding: BufferEncoding) => Promise<void>;
  join: (...paths: string[]) => string;
  dirname: (path: string) => string;
  cwd: () => string;
};

type D1PreparedStatementLike = {
  bind: (...values: unknown[]) => D1PreparedStatementLike;
  first: <T = unknown>(columnName?: string) => Promise<T | null>;
  run: () => Promise<{ meta?: { changes?: number } }>;
  all: <T = unknown>() => Promise<{ results: T[] }>;
};

type D1DatabaseLike = {
  exec: (query: string) => Promise<unknown>;
  prepare: (query: string) => D1PreparedStatementLike;
};

let writeQueue: Promise<unknown> = Promise.resolve();
let sqlClient: postgres.Sql | null = null;
let fileStoreFs: Promise<FileStoreFs> | null = null;
let d1DatabaseCache: D1DatabaseLike | null = null;

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

async function getFileStoreFs() {
  if (!fileStoreFs) {
    fileStoreFs = Promise.all([import("node:fs/promises"), import("node:path")]).then(
      ([fsModule, pathModule]) => {
        const pathApi = pathModule.default ?? pathModule;

        return {
          mkdir: async (targetPath: string, options?: { recursive?: boolean }) => {
            await fsModule.mkdir(targetPath, options);
          },
          readFile: async (targetPath: string, encoding: BufferEncoding) => fsModule.readFile(targetPath, encoding),
          writeFile: async (targetPath: string, data: string, encoding: BufferEncoding) =>
            fsModule.writeFile(targetPath, data, encoding),
          join: pathApi.join.bind(pathApi),
          dirname: pathApi.dirname.bind(pathApi),
          cwd: process.cwd.bind(process),
        };
      },
    );
  }

  return fileStoreFs;
}

async function getStorePath() {
  const fs = await getFileStoreFs();
  return process.env.WEDDING_STORE_PATH ?? fs.join(fs.cwd(), "data", "store.json");
}

async function getD1Database() {
  if (d1DatabaseCache) {
    return d1DatabaseCache;
  }

  try {
    const { env } = getCloudflareContext();
    const binding = (env as Record<string, unknown>).AISLEFLOW_DB;

    if (
      binding &&
      typeof binding === "object" &&
      "prepare" in binding &&
      typeof (binding as D1DatabaseLike).prepare === "function"
    ) {
      d1DatabaseCache = binding as D1DatabaseLike;
      return d1DatabaseCache;
    }
  } catch {
    // Not running in a Cloudflare request context or binding not configured.
  }

  try {
    const context = await getCloudflareContext({ async: true });
    const binding = (context.env as Record<string, unknown>).AISLEFLOW_DB;

    if (
      binding &&
      typeof binding === "object" &&
      "prepare" in binding &&
      typeof (binding as D1DatabaseLike).prepare === "function"
    ) {
      d1DatabaseCache = binding as D1DatabaseLike;
      return d1DatabaseCache;
    }
  } catch {
    // Async mode is primarily for SSG/static contexts; ignore if unavailable.
  }

  return null;
}

function isCloudflareWorkerRuntime() {
  return "WebSocketPair" in globalThis;
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
  const fs = await getFileStoreFs();
  const storePath = await getStorePath();

  try {
    await fs.readFile(storePath, "utf8");
  } catch {
    await fs.mkdir(fs.dirname(storePath), { recursive: true });
    await fs.writeFile(storePath, JSON.stringify(createInitialStore(), null, 2), "utf8");
  }
}

async function readRawStore() {
  const fs = await getFileStoreFs();
  const storePath = await getStorePath();
  await ensureStoreFile();
  const content = await fs.readFile(storePath, "utf8");
  return JSON.parse(content) as AppStore;
}

async function persistStore(store: AppStore) {
  const fs = await getFileStoreFs();
  const storePath = await getStorePath();
  await fs.mkdir(fs.dirname(storePath), { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
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

async function ensureD1Store(db: D1DatabaseLike) {
  let existingId: number | null;

  try {
    existingId = await db.prepare("select id from app_state where id = ?").bind(1).first<number>("id");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.toLowerCase().includes("no such table")) {
      throw new Error(
        "D1 belum diinisialisasi. Jalankan schema SQL AisleFlow terlebih dulu untuk membuat tabel app_state.",
      );
    }

    throw error;
  }

  if (existingId === null) {
    const initialStore = createInitialStore();
    await db
      .prepare("insert into app_state (id, data, version, updated_at) values (?, ?, ?, ?)")
      .bind(1, JSON.stringify(initialStore), 1, nowIso())
      .run();
  }
}

async function readD1Store(db: D1DatabaseLike) {
  await ensureD1Store(db);
  const data = await db.prepare("select data from app_state where id = ?").bind(1).first<string>("data");

  if (!data) {
    throw new Error("Store D1 tidak ditemukan setelah inisialisasi.");
  }

  return coerceStoreData(data);
}

function getD1Changes(result: { meta?: { changes?: number } }) {
  return result.meta?.changes ?? 0;
}

async function withD1StoreMutation<T>(db: D1DatabaseLike, mutate: (store: AppStore) => Promise<T> | T) {
  await ensureD1Store(db);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const rows = await db
      .prepare("select data, version from app_state where id = ?")
      .bind(1)
      .all<{ data: string; version: number }>();

    const currentRow = rows.results[0];

    if (!currentRow) {
      await ensureD1Store(db);
      continue;
    }

    const store = pruneExpiredLocks(coerceStoreData(currentRow.data));
    const result = await mutate(store);

    const updateResult = await db
      .prepare("update app_state set data = ?, version = version + 1, updated_at = ? where id = ? and version = ?")
      .bind(JSON.stringify(store), nowIso(), 1, currentRow.version)
      .run();

    if (getD1Changes(updateResult) > 0) {
      return cloneValue(result);
    }
  }

  throw new Error("Gagal memperbarui store D1 karena konflik penulisan berulang.");
}

export async function readStore() {
  const d1Database = await getD1Database();

  if (!d1Database && !isDatabaseStoreEnabled() && isCloudflareWorkerRuntime()) {
    throw new Error("Binding D1 AISLEFLOW_DB tidak tersedia di runtime Cloudflare.");
  }

  const rawStore = d1Database
    ? await readD1Store(d1Database)
    : isDatabaseStoreEnabled()
      ? await readDatabaseStore()
      : await readRawStore();

  const store = pruneExpiredLocks(rawStore);
  return cloneValue(store);
}

export async function withStoreMutation<T>(mutate: (store: AppStore) => Promise<T> | T) {
  const d1Database = await getD1Database();

  if (d1Database) {
    return withD1StoreMutation(d1Database, mutate);
  }

  if (!isDatabaseStoreEnabled() && isCloudflareWorkerRuntime()) {
    throw new Error("Binding D1 AISLEFLOW_DB tidak tersedia di runtime Cloudflare.");
  }

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
