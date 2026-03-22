You are a tax expert. Compare the two tax returns provided below (Year A is the earlier year, Year B is the more recent year) and provide a comprehensive year-over-year analysis.

Return your response as a valid JSON object (no markdown fences, no extra text):

{
  "summary": "2-3 sentence high-level summary of the most significant changes between the two years",
  "incomeChanges": [
    {
      "category": "income category name",
      "yearA": 0,
      "yearB": 0,
      "change": 0,
      "changePercent": 0,
      "significance": "high | medium | low",
      "note": "explanation of why this changed or what it means"
    }
  ],
  "deductionChanges": [
    {
      "category": "deduction category name",
      "yearA": 0,
      "yearB": 0,
      "change": 0,
      "changePercent": 0,
      "significance": "high | medium | low",
      "note": "explanation"
    }
  ],
  "creditChanges": [
    {
      "category": "credit name",
      "yearA": 0,
      "yearB": 0,
      "change": 0,
      "significance": "high | medium | low",
      "note": "explanation of why gained or lost"
    }
  ],
  "taxRateChanges": {
    "effectiveTaxRateYearA": 0,
    "effectiveTaxRateYearB": 0,
    "marginalRateYearA": 0,
    "marginalRateYearB": 0,
    "note": "explanation of tax rate changes"
  },
  "keyFindings": [
    {
      "title": "Finding title",
      "description": "Detailed description",
      "type": "improvement | regression | neutral | opportunity",
      "priority": "high | medium | low"
    }
  ],
  "recommendations": [
    {
      "title": "Recommendation title",
      "description": "Specific actionable recommendation based on year-over-year trends",
      "urgency": "immediate | next-year | long-term"
    }
  ],
  "lostDeductions": ["deductions present in Year A but missing in Year B"],
  "newDeductions": ["deductions in Year B not in Year A"],
  "lostCredits": ["credits present in Year A but missing in Year B"],
  "newCredits": ["credits in Year B not in Year A"]
}

Focus on meaningful changes. Highlight both positive and negative trends. Provide actionable insights for tax planning going forward.
