"""Small DB-API dictionary row facade; statements remain parameterized T-SQL."""
from contextlib import contextmanager
from datetime import datetime, timezone
from uuid import UUID
import pyodbc
from ml.sqlserver import connection_string


class Cursor:
    def __init__(self, raw):
        self.raw = raw

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.raw.close()

    def execute(self, sql, params=()):
        self.raw.execute(sql, params)
        return self

    def _row(self, row):
        if row is None:
            return None
        result = {}
        for metadata, value in zip(self.raw.description, row):
            key = metadata[0]
            if isinstance(value, datetime) and value.tzinfo is None:
                value = value.replace(tzinfo=timezone.utc)
            if isinstance(value, str) and (key == 'id' or key.endswith('_id')):
                try:
                    value = str(UUID(value))
                except ValueError:
                    pass
            result[key] = value
        return result

    def fetchone(self):
        return self._row(self.raw.fetchone())

    def fetchall(self):
        return [self._row(row) for row in self.raw.fetchall()]


class Connection:
    def __init__(self, raw):
        self.raw = raw

    def cursor(self):
        return Cursor(self.raw.cursor())


@contextmanager
def connect():
    raw = pyodbc.connect(connection_string(), autocommit=False, timeout=10)
    try:
        with raw.cursor() as cursor:
            cursor.execute('SET NOCOUNT ON; SET XACT_ABORT ON')
        yield Connection(raw)
        raw.commit()
    except Exception:
        raw.rollback()
        raise
    finally:
        raw.close()
