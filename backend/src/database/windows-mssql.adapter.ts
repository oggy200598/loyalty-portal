import { createRequire } from 'node:module';
import type {
  ConnectionPool,
  Transaction as MssqlTransaction,
  config,
} from 'mssql';
import {
  ColumnTypeEnum as C,
  DriverAdapterError,
} from '@prisma/driver-adapter-utils';
import type {
  ColumnType,
  IsolationLevel,
  SqlDriverAdapter,
  SqlDriverAdapterFactory,
  SqlQuery,
  SqlResultSet,
  Transaction,
} from '@prisma/driver-adapter-utils';

// Windows SSPI/ODBC support, isolated from the official adapter used for SQL logins.
// No mutation/patching of node-mssql or Prisma internals.
const load = createRequire(__filename);
type Column = { name: string; type: { declaration: string } };
type Result = {
  recordset?: unknown[][];
  columns?: Column[][];
  rowsAffected: number[];
};
function columnType(name: string): ColumnType {
  switch (name.toLowerCase()) {
    case 'bigint':
      return C.Int64;
    case 'int':
    case 'smallint':
    case 'tinyint':
      return C.Int32;
    case 'decimal':
    case 'numeric':
    case 'money':
    case 'smallmoney':
      return C.Numeric;
    case 'bit':
      return C.Boolean;
    case 'float':
      return C.Double;
    case 'real':
      return C.Float;
    case 'date':
      return C.Date;
    case 'time':
      return C.Time;
    case 'datetime':
    case 'datetime2':
    case 'datetimeoffset':
    case 'smalldatetime':
      return C.DateTime;
    case 'uniqueidentifier':
      return C.Uuid;
    case 'binary':
    case 'varbinary':
    case 'image':
      return C.Bytes;
    default:
      return C.Text;
  }
}
function driverError(error: unknown): never {
  const e = error as { number?: number; message?: string };
  const common = {
    originalCode: String(e.number ?? ''),
    originalMessage: e.message,
  };
  if (e.number === 2601 || e.number === 2627)
    throw new DriverAdapterError({
      ...common,
      kind: 'UniqueConstraintViolation',
      constraint: undefined,
    });
  if (e.number === 547)
    throw new DriverAdapterError({
      ...common,
      kind: 'ForeignKeyConstraintViolation',
      constraint: undefined,
    });
  if (e.number === 1205)
    throw new DriverAdapterError({
      ...common,
      kind: 'TransactionWriteConflict',
    });
  if (e.number !== undefined)
    throw new DriverAdapterError({
      ...common,
      kind: 'mssql',
      code: e.number,
      message: e.message ?? 'SQL Server error',
    });
  throw error;
}
class WindowsQueryable {
  readonly provider = 'sqlserver' as const;
  readonly adapterName = '@prisma/adapter-mssql';
  private tail: Promise<void> = Promise.resolve();
  constructor(
    protected readonly connection: ConnectionPool | MssqlTransaction,
  ) {}
  protected serial<T>(task: () => Promise<T>): Promise<T> {
    const next = this.tail.then(task);
    this.tail = next.then(
      () => {},
      () => {},
    );
    return next;
  }
  private run(query: SqlQuery): Promise<Result> {
    return this.serial(async () => {
      const request = this.connection.request();
      request.arrayRowMode = true;
      const driver = load('mssql/msnodesqlv8') as typeof import('mssql');
      query.args.forEach((value, index) => {
        const type = query.argTypes[index];
        let converted = value;
        if (type.scalarType === 'datetime' && typeof value === 'string')
          converted = new Date(value);
        if (converted instanceof Date)
          converted =
            type.dbType === 'DATE'
              ? converted.toISOString().slice(0, 10)
              : converted.toISOString().replace('T', ' ').replace('Z', '');
        if (typeof converted === 'bigint') converted = converted.toString();
        if (type.scalarType === 'bytes' && typeof converted === 'string')
          converted = Buffer.from(converted, 'base64');
        if (type.scalarType === 'int')
          request.input(`risk_arg_${index + 1}`, driver.Int, converted);
        else if (
          type.scalarType === 'bigint' &&
          Number.isSafeInteger(Number(converted))
        )
          request.input(
            `risk_arg_${index + 1}`,
            driver.BigInt,
            converted === null ? null : Number(converted),
          );
        else request.input(`risk_arg_${index + 1}`, converted);
      });
      const sql = query.sql.replace(
        /'(?:''|[^'])*'|\[(?:\]\]|[^\]])*\]|@P(\d+)\b/g,
        (token, number: string | undefined) =>
          number ? `@risk_arg_${number}` : token,
      );
      try {
        return await request.query(sql);
      } catch (e) {
        return driverError(e);
      }
    });
  }
  async queryRaw(query: SqlQuery): Promise<SqlResultSet> {
    const result = await this.run(query);
    const columns = result.columns?.[0] ?? [];
    return {
      columnNames: columns.map((c) => c.name),
      columnTypes: columns.map((c) => columnType(c.type.declaration)),
      rows: (result.recordset ?? []).map((row) =>
        row.map((v, i) => {
          if (v instanceof Date) return v.toISOString();
          if (typeof v === 'boolean') return v ? 1 : 0;
          if (
            typeof v === 'string' &&
            columns[i]?.type.declaration === 'uniqueidentifier'
          )
            return v.toLowerCase();
          return v;
        }),
      ),
    };
  }
  async executeRaw(query: SqlQuery): Promise<number> {
    return (await this.run(query)).rowsAffected?.[0] ?? 0;
  }
}
class WindowsTransaction extends WindowsQueryable implements Transaction {
  readonly options = { usePhantomQuery: true };
  constructor(private readonly tx: MssqlTransaction) {
    super(tx);
  }
  async commit() {
    await this.serial(() => this.tx.commit());
  }
  async rollback() {
    await this.serial(async () => {
      try {
        await this.tx.rollback();
      } catch (e) {
        if ((e as { code?: string }).code !== 'EABORT') throw e;
      }
    });
  }
}
class WindowsAdapter extends WindowsQueryable implements SqlDriverAdapter {
  constructor(private readonly pool: ConnectionPool) {
    super(pool);
  }
  async executeScript(script: string) {
    await this.pool.request().batch(script);
  }
  async startTransaction(level?: IsolationLevel): Promise<Transaction> {
    const driver = load('mssql/msnodesqlv8') as typeof import('mssql');
    const tx = this.pool.transaction();
    tx.on('error', () => {});
    const levels = {
      'READ UNCOMMITTED': driver.ISOLATION_LEVEL.READ_UNCOMMITTED,
      'READ COMMITTED': driver.ISOLATION_LEVEL.READ_COMMITTED,
      'REPEATABLE READ': driver.ISOLATION_LEVEL.REPEATABLE_READ,
      SNAPSHOT: driver.ISOLATION_LEVEL.SNAPSHOT,
      SERIALIZABLE: driver.ISOLATION_LEVEL.SERIALIZABLE,
    };
    await tx.begin(
      level ? levels[level] : driver.ISOLATION_LEVEL.READ_COMMITTED,
    );
    return new WindowsTransaction(tx);
  }
  getConnectionInfo() {
    return {
      schemaName: 'dbo',
      maxBindValues: 2098,
      supportsRelationJoins: false,
    };
  }
  async dispose() {
    await this.pool.close();
  }
}
export class WindowsMssqlFactory implements SqlDriverAdapterFactory {
  readonly provider = 'sqlserver' as const;
  readonly adapterName = '@prisma/adapter-mssql';
  constructor(private readonly connection: config) {}
  async connect(): Promise<SqlDriverAdapter> {
    const driver = load('mssql/msnodesqlv8') as typeof import('mssql');
    const pool = new driver.ConnectionPool(this.connection);
    pool.on('error', () => {});
    await pool.connect();
    return new WindowsAdapter(pool);
  }
}
