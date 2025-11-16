import json
from typing import Optional

def save_jeopardy_board(supabase, board: dict, title: Optional[str] = None, owner_id: Optional[str] = None):
    """Save a Jeopardy board dict to Supabase.

    Expects a table named `jeopardy_boards` with (at minimum) columns:
      - id (uuid, default)
      - title (text)
      - owner_id (text)
      - board (jsonb)
      - created_at (timestamp with time zone default now())

    If the table does not exist, the insert will fail and the exception will be propagated.
    """
    payload = {
        "title": title or (board.get("title") if isinstance(board, dict) else None) or "Untitled Jeopardy Board",
        "owner_id": owner_id,
        "board": board,
    }

    # Use the Supabase client to insert the record
    res = supabase.table("jeopardy_boards").insert(payload).execute()

    # The Supabase client returns a dict-like response. Normalize to return inserted data.
    if res.status_code and res.status_code >= 400:
        raise RuntimeError(f"Failed to insert jeopardy board: {res.status_code} {res.text}")

    # Some supabase clients return data under `data`, others directly. Try both.
    data = None
    try:
        data = res.data
    except Exception:
        try:
            data = res.get("data")
        except Exception:
            data = res

    return data
