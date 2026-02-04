#!/bin/bash
# Start the PDF extraction service

echo "Starting PDF extraction service..."
echo "Installing dependencies..."
pip3 install -q -r requirements.txt

echo "Starting FastAPI server on port 8001..."
python3 pdf_service.py
