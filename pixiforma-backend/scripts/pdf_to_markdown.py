#!/usr/bin/env python3
"""Convertit un fichier PDF en Markdown via PyMuPDF4LLM."""

import sys
import os
import pymupdf4llm


def convert(pdf_path: str) -> str:
    try:
        md_text = pymupdf4llm.to_markdown(pdf_path)
        return md_text
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: pdf_to_markdown.py <path_to_pdf> [output_file]", file=sys.stderr)
        sys.exit(1)

    pdf_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None

    if not os.path.isfile(pdf_path):
        print(f"ERROR: File not found: {pdf_path}", file=sys.stderr)
        sys.exit(1)

    result = convert(pdf_path)

    if not result or not result.strip():
        print("ERROR: Empty result from pymupdf4llm", file=sys.stderr)
        sys.exit(1)

    if output_path:
        os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(result)
        print(f"OK:{len(result)}")
    else:
        print(result)
