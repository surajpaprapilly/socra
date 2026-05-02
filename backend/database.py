import asyncio
import httpx
from typing import Any, Callable, Dict

async def _run(fn: Callable):
    """Run a sync DB call in a thread, retrying once on HTTP/2 connection drop."""
    try:
        return await asyncio.to_thread(fn)
    except httpx.RemoteProtocolError:
        return await asyncio.to_thread(fn)

async def db_select(supabase_client, table: str, match_cols: Dict[str, Any]):
    query = supabase_client.table(table).select("*")
    for k, v in match_cols.items():
        query = query.eq(k, v)
    res = await _run(query.execute)
    return res.data

async def db_insert(supabase_client, table: str, data: Dict[str, Any]):
    res = await _run(supabase_client.table(table).insert(data).execute)
    return res.data

async def db_update(supabase_client, table: str, data: Dict[str, Any], match_cols: Dict[str, Any]):
    query = supabase_client.table(table).update(data)
    for k, v in match_cols.items():
        query = query.eq(k, v)
    res = await _run(query.execute)
    return res.data

async def db_upsert(supabase_client, table: str, data: Dict[str, Any]):
    res = await _run(supabase_client.table(table).upsert(data).execute)
    return res.data

async def db_delete(supabase_client, table: str, match_cols: Dict[str, Any]):
    query = supabase_client.table(table).delete()
    for k, v in match_cols.items():
        query = query.eq(k, v)
    res = await _run(query.execute)
    return res.data
