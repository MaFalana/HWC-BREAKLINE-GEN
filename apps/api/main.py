from fastapi import FastAPI

app = FastAPI(title="HWC API")

@app.get("/health")
def health():
    return {"ok": True}