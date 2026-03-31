import asyncio
from typing import Any, Dict

async def db_select(supabase_client, table: str, match_cols: Dict[str, Any]):
    """Async wrapper for Supabase select"""
    query = supabase_client.table(table).select("*")
    for k, v in match_cols.items():
        query = query.eq(k, v)
        
    def _run():
        return query.execute()
        
    res = await asyncio.to_thread(_run)
    return res.data

async def db_insert(supabase_client, table: str, data: Dict[str, Any]):
    """Async wrapper for Supabase insert"""
    def _run():
        return supabase_client.table(table).insert(data).execute()
    res = await asyncio.to_thread(_run)
    return res.data

async def db_update(supabase_client, table: str, data: Dict[str, Any], match_cols: Dict[str, Any]):
    """Async wrapper for Supabase update"""
    query = supabase_client.table(table).update(data)
    for k, v in match_cols.items():
        query = query.eq(k, v)
        
    def _run():
        return query.execute()
    res = await asyncio.to_thread(_run)
    return res.data

async def db_upsert(supabase_client, table: str, data: Dict[str, Any]):
    """Async wrapper for Supabase upsert"""
    def _run():
        return supabase_client.table(table).upsert(data).execute()
    res = await asyncio.to_thread(_run)
    return res.data

async def db_delete(supabase_client, table: str, match_cols: Dict[str, Any]):
    """Async wrapper for Supabase delete"""
    query = supabase_client.table(table).delete()
    for k, v in match_cols.items():
        query = query.eq(k, v)
        
    def _run():
        return query.execute()
    res = await asyncio.to_thread(_run)
    return res.data
