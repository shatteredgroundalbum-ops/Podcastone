import os
import json
import uuid
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Optional, AsyncIterator

import bcrypt
import jwt
import psycopg2
import psycopg2.extras
from fastapi import APIRouter, FastAPI, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from openai import AsyncOpenAI

api = APIRouter()

# ── Config ──────────────────────────────────────────────────────────────────
JWT_SECRET = os.environ.get("JWT_SECRET", "podcast-wizard-secret-key-2024")
JWT_ALGO = "HS256"
JWT_EXPIRE_DAYS = 30

TOGETHER_API_KEY = os.environ.get("TOGETHER_API_KEY", "")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
DB_URL = os.environ.get("DB334CA579_DATABASE_URL", "")

together_client = AsyncOpenAI(
    api_key=TOGETHER_API_KEY or "placeholder",
    base_url="https://api.together.xyz/v1",
)

openrouter_client = AsyncOpenAI(
    api_key=OPENROUTER_API_KEY or "placeholder",
    base_url="https://openrouter.ai/api/v1",
    default_headers={
        "HTTP-Referer": "https://podcastone.workshop.build",
        "X-Title": "Podcast One Script Wizard",
    },
)

# Together.AI — paid, highest quality per task
TOGETHER_MODELS = {
    "research":   "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    "draft":      "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    "polish":     "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    "production": "mistralai/Mixtral-8x22B-Instruct-v0.1",
    "titles":     "meta-llama/Llama-3.3-70B-Instruct-Turbo",
}

# OpenRouter — free tier fallback
OPENROUTER_MODELS = {
    "research":   "meta-llama/llama-3.3-70b-instruct:free",
    "draft":      "meta-llama/llama-3.3-70b-instruct:free",
    "polish":     "google/gemma-3-27b-it:free",
    "production": "meta-llama/llama-3.3-70b-instruct:free",
    "titles":     "mistralai/mistral-7b-instruct:free",
}


# ── DB helper ────────────────────────────────────────────────────────────────
def get_conn():
    return psycopg2.connect(DB_URL, cursor_factory=psycopg2.extras.RealDictCursor)


# ── Auth helpers ─────────────────────────────────────────────────────────────
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode(), hashed.encode())


def make_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def decode_token(token: str) -> str:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        return payload["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_current_user(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    return decode_token(auth[7:])


# ── Auth endpoints ────────────────────────────────────────────────────────────
class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


@api.post("/auth/signup")
async def signup(body: SignupRequest):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE email = %s", (body.email.lower(),))
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="Email already registered")
        pw_hash = hash_password(body.password)
        cur.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s) RETURNING id, name, email",
            (body.name, body.email.lower(), pw_hash),
        )
        user = dict(cur.fetchone())
        conn.commit()
        return {"token": make_token(str(user["id"])), "user": {"id": str(user["id"]), "name": user["name"], "email": user["email"]}}
    finally:
        conn.close()


@api.post("/auth/login")
async def login(body: LoginRequest):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, name, email, password_hash FROM users WHERE email = %s", (body.email.lower(),))
        row = cur.fetchone()
        if not row or not verify_password(body.password, row["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        return {"token": make_token(str(row["id"])), "user": {"id": str(row["id"]), "name": row["name"], "email": row["email"]}}
    finally:
        conn.close()


@api.get("/auth/me")
async def get_me(user_id: str = Depends(get_current_user)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, name, email FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        return {"id": str(row["id"]), "name": row["name"], "email": row["email"]}
    finally:
        conn.close()


class UpdateAccountRequest(BaseModel):
    name: str
    email: str
    current_password: str
    new_password: Optional[str] = None


@api.put("/auth/me")
async def update_account(body: UpdateAccountRequest, user_id: str = Depends(get_current_user)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT password_hash FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        if not row or not verify_password(body.current_password, row["password_hash"]):
            raise HTTPException(status_code=401, detail="Current password incorrect")
        new_hash = hash_password(body.new_password) if body.new_password else row["password_hash"]
        cur.execute(
            "UPDATE users SET name=%s, email=%s, password_hash=%s WHERE id=%s RETURNING id, name, email",
            (body.name, body.email.lower(), new_hash, user_id),
        )
        updated = dict(cur.fetchone())
        conn.commit()
        return {"id": str(updated["id"]), "name": updated["name"], "email": updated["email"]}
    finally:
        conn.close()


# ── Session endpoints ─────────────────────────────────────────────────────────
class SessionCreate(BaseModel):
    project_name: str


class SessionUpdate(BaseModel):
    project_name: Optional[str] = None
    current_stage: Optional[int] = None
    current_section: Optional[int] = None
    data: Optional[dict] = None


@api.get("/sessions")
async def list_sessions(user_id: str = Depends(get_current_user)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, project_name, current_stage, current_section, data, created_at, updated_at FROM sessions WHERE user_id=%s ORDER BY updated_at DESC",
            (user_id,),
        )
        rows = cur.fetchall()
        return [
            {
                "id": str(r["id"]),
                "project_name": r["project_name"],
                "current_stage": r["current_stage"],
                "current_section": r["current_section"],
                "data": r["data"],
                "created_at": r["created_at"].isoformat(),
                "updated_at": r["updated_at"].isoformat(),
            }
            for r in rows
        ]
    finally:
        conn.close()


@api.post("/sessions")
async def create_session(body: SessionCreate, user_id: str = Depends(get_current_user)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO sessions (user_id, project_name) VALUES (%s, %s) RETURNING id, project_name, current_stage, current_section, data, created_at, updated_at",
            (user_id, body.project_name),
        )
        r = cur.fetchone()
        conn.commit()
        return {
            "id": str(r["id"]),
            "project_name": r["project_name"],
            "current_stage": r["current_stage"],
            "current_section": r["current_section"],
            "data": r["data"],
            "created_at": r["created_at"].isoformat(),
            "updated_at": r["updated_at"].isoformat(),
        }
    finally:
        conn.close()


@api.get("/sessions/{session_id}")
async def get_session(session_id: str, user_id: str = Depends(get_current_user)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM sessions WHERE id=%s AND user_id=%s", (session_id, user_id))
        r = cur.fetchone()
        if not r:
            raise HTTPException(status_code=404, detail="Session not found")
        return {
            "id": str(r["id"]),
            "project_name": r["project_name"],
            "current_stage": r["current_stage"],
            "current_section": r["current_section"],
            "data": r["data"],
            "created_at": r["created_at"].isoformat(),
            "updated_at": r["updated_at"].isoformat(),
        }
    finally:
        conn.close()


@api.put("/sessions/{session_id}")
async def update_session(session_id: str, body: SessionUpdate, user_id: str = Depends(get_current_user)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM sessions WHERE id=%s AND user_id=%s", (session_id, user_id))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Session not found")

        updates, vals = [], []
        if body.project_name is not None:
            updates.append("project_name=%s"); vals.append(body.project_name)
        if body.current_stage is not None:
            updates.append("current_stage=%s"); vals.append(body.current_stage)
        if body.current_section is not None:
            updates.append("current_section=%s"); vals.append(body.current_section)
        if body.data is not None:
            updates.append("data=%s"); vals.append(json.dumps(body.data))
        updates.append("updated_at=NOW()")
        vals.extend([session_id, user_id])

        cur.execute(
            f"UPDATE sessions SET {', '.join(updates)} WHERE id=%s AND user_id=%s RETURNING *",
            vals,
        )
        r = cur.fetchone()
        conn.commit()
        return {
            "id": str(r["id"]),
            "project_name": r["project_name"],
            "current_stage": r["current_stage"],
            "current_section": r["current_section"],
            "data": r["data"],
            "created_at": r["created_at"].isoformat(),
            "updated_at": r["updated_at"].isoformat(),
        }
    finally:
        conn.close()


@api.delete("/sessions/{session_id}")
async def delete_session(session_id: str, user_id: str = Depends(get_current_user)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM sessions WHERE id=%s AND user_id=%s", (session_id, user_id))
        conn.commit()
        return {"status": "deleted"}
    finally:
        conn.close()


# ── AI endpoints (streaming) ──────────────────────────────────────────────────
class AIRequest(BaseModel):
    task: str          # research | draft | polish | production | titles
    session_data: dict
    extra: Optional[dict] = None


def build_research_prompt(data: dict) -> str:
    podcast_type = data.get("podcastType", "")
    subject = data.get("subject", "")
    is_true_crime = "true crime" in podcast_type.lower()

    if is_true_crime:
        case = data.get("tcCaseOrPersonName", "")
        city = data.get("tcCity", ""); state = data.get("tcState", "")
        crime = data.get("tcCrimeType", ""); status = data.get("tcCaseStatus", "")
        victim = data.get("tcVictimName", ""); suspect = data.get("tcSuspectName", "")
        ctx = data.get("tcAdditionalContext", "")
        return f"""You are a professional podcast researcher specializing in true crime.

Research the following case for a {podcast_type} podcast episode:
Case/Person: {case}
Location: {city}, {state}
Crime Type: {crime}
Case Status: {status}
Victim: {victim}
Suspect/Perpetrator: {suspect}
Additional Context: {ctx}

Runtime: {data.get('runtime', '30 minutes')}
Tone: {', '.join(data.get('tones', ['Investigative']))}

Provide a comprehensive research report including:
1. BACKGROUND & OVERVIEW — Key facts, timeline of events
2. KEY PLAYERS — Victims, suspects, law enforcement, witnesses
3. EVIDENCE & INVESTIGATION — What was found, how the case developed
4. LEGAL PROCEEDINGS — Arrests, trials, verdicts (if applicable)
5. CURRENT STATUS — Where the case stands today
6. COMPELLING ANGLES — The most gripping narrative hooks for a podcast audience
7. SOURCES & VERIFICATION — Types of sources to reference (court records, news, etc.)
8. SUGGESTED EPISODE STRUCTURE — How to tell this story effectively

Write in a professional, factual tone. Be thorough and specific."""
    else:
        return f"""You are a professional podcast researcher.

Research the following topic for a {podcast_type} podcast episode:
Subject: {subject}
Sub-type: {data.get('podcastSubType', '')}
Runtime: {data.get('runtime', '30 minutes')}
Tone: {', '.join(data.get('tones', ['Conversational']))}
Additional Context: {data.get('additionalContext', '')}

Provide a comprehensive research report including:
1. TOPIC OVERVIEW — Core facts, background, context
2. KEY INFORMATION — The most important points to cover
3. EXPERT PERSPECTIVES — Different viewpoints and expert opinions
4. CURRENT DEVELOPMENTS — What's happening now, recent news
5. COMPELLING NARRATIVE ANGLES — What will hook the audience
6. SUPPORTING DATA & EXAMPLES — Statistics, case studies, examples
7. POTENTIAL INTERVIEW POINTS — Questions a host might explore
8. SUGGESTED EPISODE STRUCTURE — How to organize the content

Write in a professional, engaging tone. Be thorough and specific."""


def build_draft_prompt(data: dict, draft_num: int) -> str:
    podcast_type = data.get("podcastType", "")
    subject = data.get("subject", "") or data.get("tcCaseOrPersonName", "")
    runtime = data.get("runtime", "30 minutes")
    tones = ", ".join(data.get("tones", ["Conversational"]))
    research = data.get("aiResearchSummary", "")
    prev_draft = data.get("draft1Script", "") if draft_num == 2 else ""
    feedback = data.get("draft1Feedback", "") if draft_num == 2 else ""

    wpm = 150
    try:
        mins = int(runtime.split()[0])
        target_words = mins * wpm
    except Exception:
        target_words = 4500

    if draft_num == 1:
        return f"""You are a professional podcast scriptwriter.

Write a complete, production-ready podcast script (DRAFT 1) for:
Show Type: {podcast_type}
Subject: {subject}
Target Runtime: {runtime} (~{target_words} words)
Tone: {tones}

Research Summary:
{research}

SCRIPT REQUIREMENTS:
- Write a FULL script with every word the host will say — no placeholders
- Include a strong cold open / hook in the first 30 seconds
- Natural, conversational language even in serious moments
- Smooth transitions between sections
- Include [PAUSE], [EMPHASIS], [MUSIC STING] cues where appropriate
- End with a clear call-to-action and sign-off

FORMAT: Start with a brief episode overview (1-2 sentences), then the full script labeled clearly.
Target approximately {target_words} words."""
    else:
        return f"""You are a professional podcast scriptwriter revising a script based on feedback.

ORIGINAL DRAFT:
{prev_draft[:3000]}

REVISION NOTES / FEEDBACK:
{feedback}

Subject: {subject} | Type: {podcast_type} | Runtime: {runtime} | Tone: {tones}

Write DRAFT 2 — an improved full script incorporating all feedback. 
Maintain the same approximate length ({target_words} words).
Be specific and complete — every word the host will say."""


def build_polish_prompt(data: dict) -> str:
    draft2 = data.get("draft2Script", "") or data.get("draft1Script", "")
    feedback = data.get("draft2Feedback", "") or data.get("draft1Feedback", "")
    podcast_type = data.get("podcastType", "")
    runtime = data.get("runtime", "30 minutes")
    tones = ", ".join(data.get("tones", ["Conversational"]))

    return f"""You are a senior podcast script editor performing a final polish.

DRAFT TO POLISH:
{draft2[:4000]}

FINAL NOTES:
{feedback}

Podcast Type: {podcast_type} | Runtime: {runtime} | Tone: {tones}

Perform a FINAL POLISH of this script:
1. Fix any awkward phrasing or run-on sentences
2. Tighten language — cut filler, sharpen every sentence
3. Ensure the opening hook is irresistible
4. Make transitions seamless
5. Verify the pacing fits the runtime
6. Ensure the closing is strong and memorable
7. Add/refine production cues ([PAUSE], [MUSIC], [EMPHASIS]) where needed

Output the COMPLETE, FINAL, POLISHED SCRIPT — ready to record. Every word the host says."""


def build_production_prompt(data: dict) -> str:
    final_script = data.get("finalScript", "") or data.get("draft2Script", "") or data.get("draft1Script", "")
    podcast_type = data.get("podcastType", "")
    subject = data.get("subject", "") or data.get("tcCaseOrPersonName", "")
    runtime = data.get("runtime", "30 minutes")

    return f"""You are a broadcast production specialist converting a podcast script into a professional production block format.

FINAL SCRIPT:
{final_script[:5000]}

Podcast: {podcast_type} | Subject: {subject} | Runtime: {runtime}

Convert this into a PRODUCTION BLOCK SCRIPT with the following format:

[INTRO MUSIC — 5 sec fade in]

HOST: [dialogue here]

[MUSIC STING]

HOST CONT: [dialogue continues]

[SOUND EFFECT: description]

Requirements:
- Every line of dialogue on its own HOST: block
- All music, sound, and production cues in [BRACKETS] on separate lines
- Segment breaks clearly labeled (SEGMENT 1, SEGMENT 2, etc.)
- Timing notes for each major section (approx. time markers)
- Clear [OUTRO MUSIC] and [END] markers
- Professional broadcast-ready format

Output ONLY the production block script, nothing else."""


def build_titles_prompt(data: dict) -> str:
    subject = data.get("subject", "") or data.get("tcCaseOrPersonName", "")
    podcast_type = data.get("podcastType", "")
    research = data.get("aiResearchSummary", "")
    return f"""Generate 5 compelling podcast episode titles for:
Type: {podcast_type}
Subject: {subject}
Context: {research[:500]}

Make each title:
- Intriguing and click-worthy
- Under 60 characters
- Varied in style (question, statement, dramatic, mysterious, etc.)

Return ONLY the 5 titles, one per line, numbered 1-5."""


async def _do_stream(client: AsyncOpenAI, model: str, prompt: str) -> AsyncIterator[str]:
    stream = await client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        stream=True,
        max_tokens=4096,
        temperature=0.7,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta


async def stream_ai(prompt: str, task: str):
    """Try Together.AI first; fall back to OpenRouter on any error."""
    t_model = TOGETHER_MODELS.get(task, TOGETHER_MODELS["draft"])
    or_model = OPENROUTER_MODELS.get(task, OPENROUTER_MODELS["draft"])

    # Prefer Together.AI if key is present
    if TOGETHER_API_KEY:
        try:
            provider = "Together.AI"
            model = t_model
            gen = _do_stream(together_client, t_model, prompt)
            # yield provider info first
            yield ("__meta__", f'{{"provider":"Together.AI","model":"{t_model}"}}')
            async for token in gen:
                yield ("token", token)
            return
        except Exception:
            pass  # fall through to OpenRouter

    # OpenRouter fallback
    if OPENROUTER_API_KEY:
        yield ("__meta__", f'{{"provider":"OpenRouter","model":"{or_model}"}}')
        async for token in _do_stream(openrouter_client, or_model, prompt):
            yield ("token", token)
        return

    raise HTTPException(status_code=503, detail="No AI provider configured")


@api.post("/ai/generate")
async def ai_generate(body: AIRequest, user_id: str = Depends(get_current_user)):
    data = body.session_data
    task = body.task

    if task == "research":
        prompt = build_research_prompt(data)
    elif task == "draft1":
        prompt = build_draft_prompt(data, 1)
    elif task == "draft2":
        prompt = build_draft_prompt(data, 2)
    elif task == "polish":
        prompt = build_polish_prompt(data)
    elif task == "production":
        prompt = build_production_prompt(data)
    elif task == "titles":
        prompt = build_titles_prompt(data)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown task: {task}")

    model_key = "draft" if task.startswith("draft") else task

    async def event_stream():
        async for kind, payload in stream_ai(prompt, model_key):
            if kind == "__meta__":
                yield f"data: {payload}\n\n"
            else:
                escaped = payload.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
                yield f'data: {{"token":"{escaped}"}}\n\n'
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ── App factory ───────────────────────────────────────────────────────────────
def create_app(static_dir: str = "./dist") -> FastAPI:
    app = FastAPI(title="Podcast One API")
    app.include_router(api, prefix="/api")

    import os as _os
    if _os.path.isdir(static_dir):
        from fastapi.responses import FileResponse

        @app.get("/{full_path:path}")
        async def serve_spa(full_path: str):
            file_path = _os.path.join(static_dir, full_path)
            if _os.path.isfile(file_path):
                return FileResponse(file_path)
            return FileResponse(_os.path.join(static_dir, "index.html"))

    return app
