from typing import List

from pydantic import BaseModel
from uuid import UUID



class CourseRequest(BaseModel):
    language: str
    topic: str
    level: str
    axes: List[str]

class AIRequest(BaseModel):
    language: str
    topic: str
    level: str
    axes: List[str]
    moduleId: UUID