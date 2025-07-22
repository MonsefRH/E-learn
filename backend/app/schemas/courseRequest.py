from typing import List

from pydantic import BaseModel


class CourseRequest(BaseModel):
    language: str
    topic: str
    level: str
    axes: List[str]