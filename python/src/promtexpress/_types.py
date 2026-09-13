from __future__ import annotations

from typing import List, Literal, Optional, TypedDict


class Answer(TypedDict):
    question: str
    answer: str


class Iteration(TypedDict):
    ofPromptId: str
    feedback: str


class ChipQuestion(TypedDict):
    label: str
    options: List[str]


class Assumption(TypedDict):
    key: str
    value: str
    label_tr: str


class RecentEntry(TypedDict):
    id: str
    mod: str
    title: str
    userInput: str
    date: str


class _GenerateResultOptional(TypedDict, total=False):
    chipQuestions: List[ChipQuestion]
    ambiguityClarifications: List[str]


class GenerateResult(_GenerateResultOptional):
    promptId: str
    output: str
    creditsUsed: int
    creditsRemaining: int
    latencyMs: int
    validationScore: Optional[float]
    validationIssues: List[str]
    assumptions: List[Assumption]
    traceId: str
    scenario: Literal["A", "B", "C"]
    recentEntry: RecentEntry


class Template(TypedDict):
    id: str
    title: str
    description: Optional[str]
    category: str
    modality: str
    engine: Optional[str]
    variables: object
    version: str


class HistoryRow(TypedDict):
    id: str
    title: str
    modality: str
    engine: str
    credits: int
    date: str
    status: Literal["Done", "Failed"]
    userInput: str
    result: Optional[str]


class HistoryPage(TypedDict):
    rows: List[HistoryRow]
    total: int
    page: int
    pageSize: int
