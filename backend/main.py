from datetime import datetime, timezone
from typing import Literal, Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field
from pymongo import ReturnDocument

from database import client, tasks_collection

app = FastAPI(title="TaskFlow API")

# Allow the React dev server to call this API from the browser
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

Priority = Literal["low", "medium", "high"]


class TaskCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    title: str = Field(min_length=1, max_length=200)
    priority: Priority = "medium"
    deadline: str = Field(default="", pattern=r"^(\d{4}-\d{2}-\d{2})?$")


class TaskUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    priority: Optional[Priority] = None
    deadline: Optional[str] = Field(default=None, pattern=r"^(\d{4}-\d{2}-\d{2})?$")
    completed: Optional[bool] = None


def serialize(doc: dict) -> dict:
    """MongoDB uses _id (an ObjectId); the frontend expects a plain string id."""
    return {
        "id": str(doc["_id"]),
        "title": doc["title"],
        "priority": doc["priority"],
        "deadline": doc["deadline"],
        "completed": doc["completed"],
    }


def to_object_id(task_id: str) -> ObjectId:
    try:
        return ObjectId(task_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Task not found")


@app.get("/api/health")
def health():
    client.admin.command("ping")  # fails loudly if MongoDB is unreachable
    return {"status": "ok"}


@app.get("/api/tasks")
def list_tasks():
    docs = tasks_collection.find().sort("created_at", -1)  # newest first
    return [serialize(d) for d in docs]


@app.post("/api/tasks", status_code=201)
def create_task(task: TaskCreate):
    doc = task.model_dump()
    doc["completed"] = False
    doc["created_at"] = datetime.now(timezone.utc)
    result = tasks_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize(doc)


@app.patch("/api/tasks/{task_id}")
def update_task(task_id: str, changes: TaskUpdate):
    data = {k: v for k, v in changes.model_dump().items() if v is not None}
    if not data:
        raise HTTPException(status_code=400, detail="No changes provided")
    updated = tasks_collection.find_one_and_update(
        {"_id": to_object_id(task_id)},
        {"$set": data},
        return_document=ReturnDocument.AFTER,
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return serialize(updated)


@app.delete("/api/tasks/{task_id}", status_code=204)
def delete_task(task_id: str):
    result = tasks_collection.delete_one({"_id": to_object_id(task_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")