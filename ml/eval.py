#!/usr/bin/env python3
"""Compare Ollama models on the held-out examples in data/valid.jsonl.

For each example the model gets the same system/user messages the API sends and is scored on:
  - valid: the reply parses as the expected JSON object
  - count: question-generation replies contain exactly the requested number of questions
  - types: every question_type is technical, behavioral or system_design
  - scores: evaluation replies have three numeric scores in 0-10

Usage: python3 eval.py llama3.2:3b preparation-ai [--limit 20] [--data data/valid.jsonl]
Standard library only; talks to Ollama's OpenAI-compatible endpoint.
"""
import argparse
import json
import re
import time
import urllib.error
import urllib.request

TYPES = {"technical", "behavioral", "system_design"}


NO_JSON_MODE = set()  # models whose endpoint rejects response_format, as the backend tracks


def chat(base_url, model, messages, timeout):
    payload = {"model": model, "messages": messages, "temperature": 0.7, "max_tokens": 1500}
    if model not in NO_JSON_MODE:
        payload["response_format"] = {"type": "json_object"}
    req = urllib.request.Request(base_url.rstrip("/") + "/chat/completions", json.dumps(payload).encode(),
                                 {"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.load(resp)["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as e:
        message = e.read().decode(errors="replace").lower()
        if "response_format" in payload and e.code in (400, 501) and ("response_format" in message or "structured output" in message):
            NO_JSON_MODE.add(model)
            return chat(base_url, model, messages, timeout)
        raise


def parse(content):
    start, end = content.find("{"), content.rfind("}")
    if start == -1 or end < start:
        return None
    try:
        return json.loads(content[start:end + 1])
    except json.JSONDecodeError:
        return None


def score(example, reply):
    prompt = example["messages"][1]["content"]
    data = parse(reply)
    result = {"valid": isinstance(data, dict)}
    if not result["valid"]:
        return result

    if prompt.startswith("Write "):
        wanted = int(re.match(r"Write (\d+)", prompt).group(1))
        questions = data.get("questions")
        ok_list = isinstance(questions, list) and all(isinstance(q, dict) for q in questions)
        result["valid"] = ok_list
        result["count"] = ok_list and len(questions) == wanted
        result["types"] = ok_list and all(q.get("question_type") in TYPES and q.get("question_text") for q in questions)
    else:
        keys = ("technical_score", "communication_score", "problem_solving_score")
        result["scores"] = all(isinstance(data.get(k), (int, float)) and 0 <= data[k] <= 10 for k in keys)
    return result


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("models", nargs="+")
    ap.add_argument("--data", default="data/valid.jsonl")
    ap.add_argument("--limit", type=int, default=20)
    ap.add_argument("--base-url", default="http://127.0.0.1:11434/v1")
    ap.add_argument("--timeout", type=int, default=300)
    args = ap.parse_args()

    with open(args.data) as f:
        examples = [json.loads(line) for line in f][: args.limit]

    for model in args.models:
        totals, counts, elapsed = {}, {}, 0.0
        for ex in examples:
            start = time.time()
            try:
                reply = chat(args.base_url, model, ex["messages"][:-1], args.timeout)
            except Exception as e:  # count request failures as invalid replies
                reply = f"error: {e}"
            elapsed += time.time() - start
            for k, v in score(ex, reply).items():
                totals[k] = totals.get(k, 0) + int(bool(v))
                counts[k] = counts.get(k, 0) + 1
        summary = ", ".join(f"{k} {totals[k]}/{counts[k]}" for k in ("valid", "count", "types", "scores") if k in counts)
        print(f"{model}: {summary}, avg {elapsed / max(len(examples), 1):.1f}s per example")


if __name__ == "__main__":
    main()
