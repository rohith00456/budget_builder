import pandas as pd
import json

file_path = r'F:\financial_budget_builder\sampledata\financial_budget_builder_gap_report.xlsx'
xls = pd.ExcelFile(file_path)

out = {}
for sheet in xls.sheet_names:
    df = pd.read_excel(xls, sheet_name=sheet)
    out[sheet] = df.to_dict(orient='records')

with open('excel_data.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, indent=2, default=str)
