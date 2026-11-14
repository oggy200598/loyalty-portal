"""SQL Server connection shared by serving and offline feature exports."""
import os
from urllib.parse import quote_plus


def connection_string():
    def quoted(value):
        return '{' + value.replace('}', '}}') + '}'
    server = os.environ.get('SQLSERVER_SERVER', r'.\SQLEXPRESS')
    port = os.environ.get('SQLSERVER_PORT')
    if port and '\\' not in server:
        server += ',' + port
    database = os.environ.get('SQLSERVER_DATABASE', 'ecommerce_risk_sqlserver')
    result = f'DRIVER={{ODBC Driver 18 for SQL Server}};SERVER={quoted(server)};DATABASE={quoted(database)};Encrypt=yes;'
    if os.environ.get('SQLSERVER_AUTH') == 'windows':
        return result + 'Trusted_Connection=yes;TrustServerCertificate=yes;'
    user, password = os.environ.get('SQLSERVER_USER'), os.environ.get('SQLSERVER_PASSWORD')
    if not user or not password:
        raise RuntimeError('Configure SQL Server credentials or SQLSERVER_AUTH=windows')
    trust = 'yes' if os.environ.get('SQLSERVER_TRUST_CERTIFICATE') == 'true' else 'no'
    return result + f'UID={quoted(user)};PWD={quoted(password)};TrustServerCertificate={trust};'


def sqlalchemy_url():
    return 'mssql+pyodbc:///?odbc_connect=' + quote_plus(connection_string())
