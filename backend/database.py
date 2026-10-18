import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()  # reads backend/.env into environment variables

client = MongoClient(os.environ["MONGODB_URL"])
db = client[os.getenv("DB_NAME", "taskflow")]
tasks_collection = db["tasks"]