# scripts/fem_runner.py
import sys, json, os, datetime
from pymongo import MongoClient

def read_payload():
    raw = sys.stdin.read().strip()
    if not raw:
        return {}
    try:
        return json.loads(raw.splitlines()[-1])
    except Exception:
        return {}

p = read_payload()
clientid = str(p.get("clientid","")).lower()
job_id   = p.get("job_id")
params   = p.get("params") or {}

# Mongo
uri = (os.getenv("MONGODB_URI") or os.getenv("MONGO_URI") or os.getenv("mongodb_uri") or "mongodb://127.0.0.1:27017")
db = MongoClient(uri)["biostrucx"]
col = db["simulation_result"]

now = datetime.datetime.utcnow()
col.update_one({"clientid": clientid, "job_id": job_id},
               {"$set": {"status": "running", "started_at": now}})

# --- Modelo/caja (placeholder para render 3D inmediato) ---
dims = params.get("dims") or {"lx": 0.50, "ly": 0.25, "lz": 0.30}  # m
supports = params.get("supports") or "simply_supported"
loads = params.get("loads") or {"type": "none"}

lx, ly, lz = float(dims.get("lx",0.5)), float(dims.get("ly",0.25)), float(dims.get("lz",0.30))
x, y, z = lx/2, ly/2, lz/2
vertices = [
  [-x,-y,-z], [ x,-y,-z], [ x, y,-z], [-x, y,-z],
  [-x,-y, z], [ x,-y, z], [ x, y, z], [-x, y, z],
]
indices = [
  0,1,2, 2,3,0,  4,5,6, 6,7,4,
  0,4,5, 5,1,0,  1,5,6, 6,2,1,
  2,6,7, 7,3,2,  3,7,4, 4,0,3
]
u_mag = [0.0]*len(vertices)

model = {"type":"beam","dims":dims,"supports":supports,"loads":loads,"mesh":{"nodes":[],"elements":[]}}
results = {"ux":[],"uy":[],"uz":[]}
viz = {"vertices":vertices,"indices":indices,"u_mag":u_mag}

col.update_one({"clientid": clientid, "job_id": job_id},
               {"$set": {
                   "status":"done",
                   "finished_at": datetime.datetime.utcnow(),
                   "model": model,
                   "results": results,
                   "viz": viz
               }})

print(json.dumps({"ok": True, "clientid": clientid, "job_id": job_id}))

