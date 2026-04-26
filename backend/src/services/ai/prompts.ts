export const PROMPTS = {
  analyzeVariance: (data: any, period: string) => `
You are a senior financial analyst. Analyze the following Budget vs Actual variance data for period ${period}.

VARIANCE DATA:
${JSON.stringify(data, null, 2)}

Provide a detailed analysis in this EXACT JSON format:
{
  "summary": "2-3 sentence executive summary of what happened this period",
  "score": <overall health score 0-100, where 100 is perfectly on budget>,
  "greenFlags": ["positive observation 1", "positive observation 2"],
  "redFlags": ["concern 1", "concern 2"],
  "recommendations": [
    {
      "priority": "HIGH",
      "action": "specific action to take",
      "expectedImpact": "what improvement to expect",
      "timeframe": "by when"
    }
  ],
  "detailedExplanation": "paragraph explaining WHY variances occurred, whether they are one-time or recurring, and projected impact if unaddressed",
  "confidence": <confidence level 0-100>
}

Consider Indian financial context (₹, Lakhs, Crores). Be specific with numbers. Return ONLY valid JSON.`,

  budgetSuggestions: (historicalData: any, company: any) => `
You are a CFO advisor. Based on the historical financial data below, suggest budget amounts for the next fiscal year.

COMPANY: ${JSON.stringify(company, null, 2)}
HISTORICAL DATA (last 12 months): ${JSON.stringify(historicalData, null, 2)}

Return ONLY this JSON:
{
  "summary": "brief summary of your budgeting approach",
  "score": <confidence in suggestions 0-100>,
  "greenFlags": ["what is working well financially"],
  "redFlags": ["budget risks to flag"],
  "recommendations": [
    {
      "priority": "HIGH",
      "action": "Department X: suggest ₹Y for category Z",
      "expectedImpact": "reasoning based on historical trend",
      "timeframe": "FY2025"
    }
  ],
  "detailedExplanation": "full reasoning: growth assumptions, seasonality adjustments, benchmarks used",
  "confidence": 75
}`,

  budgetHealth: (budget: any, actuals: any) => `
You are a financial health advisor. Assess the overall budget health of this company.

BUDGET PLAN: ${JSON.stringify(budget, null, 2)}
ACTUALS: ${JSON.stringify(actuals, null, 2)}

Return ONLY this JSON:
{
  "summary": "one paragraph health overview",
  "score": <health score 0-100>,
  "greenFlags": ["what is going well - be specific with numbers"],
  "redFlags": ["what is concerning - be specific with numbers"],
  "recommendations": [
    {
      "priority": "HIGH",
      "action": "most urgent action",
      "expectedImpact": "financial impact",
      "timeframe": "this month"
    }
  ],
  "detailedExplanation": "detailed analysis: burn rate, runway, efficiency ratios, cash position",
  "confidence": 80
}`,

  forecastRevenue: (historicalRevenue: any, growthFactors: any) => `
You are a revenue forecasting expert. Based on historical revenue data, generate forecasts.

HISTORICAL REVENUE: ${JSON.stringify(historicalRevenue, null, 2)}
GROWTH FACTORS: ${JSON.stringify(growthFactors, null, 2)}

Return ONLY this JSON:
{
  "summary": "forecast overview with key assumptions",
  "score": 75,
  "greenFlags": ["revenue drivers that support growth"],
  "redFlags": ["risks to the forecast"],
  "recommendations": [
    {
      "priority": "HIGH",
      "action": "revenue action to take",
      "expectedImpact": "₹X additional revenue",
      "timeframe": "Q3"
    }
  ],
  "detailedExplanation": "3-month: ₹X (confidence Y%), 6-month: ₹X, 12-month: ₹X. Assumptions: seasonality, growth rate, market conditions. Upside scenario: ₹X. Downside scenario: ₹X.",
  "confidence": 70
}`,

  headcountAnalysis: (employees: any, plans: any) => `
You are an HR analytics expert. Analyze the headcount data and identify optimization opportunities.

EMPLOYEES: ${JSON.stringify(employees, null, 2)}
HEADCOUNT PLANS: ${JSON.stringify(plans, null, 2)}

Return ONLY this JSON:
{
  "summary": "headcount overview",
  "score": <staffing efficiency score 0-100>,
  "greenFlags": ["well-staffed departments or cost efficiencies"],
  "redFlags": ["overstaffed or understaffed departments, salary risks"],
  "recommendations": [
    {
      "priority": "HIGH",
      "action": "hiring or restructuring recommendation",
      "expectedImpact": "cost or productivity impact",
      "timeframe": "next quarter"
    }
  ],
  "detailedExplanation": "by department: overstaffed vs understaffed, cost per employee, attrition risk, salary budget variance",
  "confidence": 80
}`,

  boardNarrative: (data: any) => `
You are writing the CFO section of a board meeting report. Generate a professional board narrative.

FINANCIAL DATA: ${JSON.stringify(data, null, 2)}

Return ONLY this JSON:
{
  "summary": "executive summary paragraph (3-4 sentences, board-level language)",
  "score": <overall company financial health 0-100>,
  "greenFlags": ["top 3 highlights this period"],
  "redFlags": ["top 3 concerns for the board"],
  "recommendations": [
    {
      "priority": "HIGH",
      "action": "board-level decision needed",
      "expectedImpact": "business impact",
      "timeframe": "next 30 days"
    }
  ],
  "detailedExplanation": "full board narrative: performance vs plan, key variances explained, forward outlook, risks, opportunities. Use professional CFO language.",
  "confidence": 85
}`,

  chatWithData: (question: string, context: any) => `
You are a financial AI assistant with access to this company's financial data. Answer the user's question accurately.

FINANCIAL CONTEXT:
${JSON.stringify(context, null, 2)}

USER QUESTION: "${question}"

Return ONLY this JSON:
{
  "summary": "direct answer to the question in 1-2 sentences",
  "score": 100,
  "greenFlags": ["relevant positive data points that support the answer"],
  "redFlags": ["relevant concerns or caveats"],
  "recommendations": [
    {
      "priority": "MEDIUM",
      "action": "suggested follow-up action based on the answer",
      "expectedImpact": "expected benefit",
      "timeframe": "as relevant"
    }
  ],
  "detailedExplanation": "full detailed answer with numbers, trends, comparisons. Be specific and data-driven.",
  "confidence": 85
}`,
};