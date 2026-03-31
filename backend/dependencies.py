import os
import asyncio
from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
import supabase.client as sc

# Initialize Supabase Client
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("VITE_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_ANON_KEY")

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise HTTPException(
            status_code=500,
            detail="Supabase URL or ANON_KEY environment variables are missing."
        )

    token = credentials.credentials
    try:
        # Create a dynamically authenticated client for RLS to work safely
        auth_client = create_client(
            SUPABASE_URL, 
            SUPABASE_ANON_KEY,
            options=sc.ClientOptions(headers={"Authorization": f"Bearer {token}"})
        )
        
        # Verify the token natively using the Supabase API to bypass local crypto algorithm issues
        def _get_user():
            return auth_client.auth.get_user(token)
            
        user_resp = await asyncio.to_thread(_get_user)
        
        return {
            "id": user_resp.user.id,
            "role": user_resp.user.role,
            "email": user_resp.user.email,
            "token": token,
            "supabase": auth_client   # Attach client to user object for easy DB access
        }

    except Exception as e:
        print(f"Supabase Auth Verification Failed: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Could not validate credentials: {str(e)}")
