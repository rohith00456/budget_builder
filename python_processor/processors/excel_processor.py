import pandas as pd
import openpyxl
from openpyxl.utils import get_column_letter
import json
import re
from datetime import datetime


class ExcelProcessor:
    def process(self, file_path: str) -> dict:
        sheets = {}
        errors = []

        try:
            xl = pd.ExcelFile(file_path)
            sheet_names = xl.sheet_names

            for sheet_name in sheet_names:
                try:
                    df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
                    header_row = self._find_header_row(df)
                    if header_row is None:
                        continue

                    df = pd.read_excel(file_path, sheet_name=sheet_name, header=header_row)
                    df.columns = [str(c).strip() for c in df.columns]
                    df = df.dropna(how='all')

                    rows = []
                    for _, row in df.iterrows():
                        parsed = {}
                        for col in df.columns:
                            val = row[col]
                            if pd.isna(val) if not isinstance(val, (list, dict)) else False:
                                parsed[col] = None
                            elif isinstance(val, datetime):
                                parsed[col] = val.isoformat()
                            elif isinstance(val, float) and val == int(val):
                                parsed[col] = int(val)
                            else:
                                parsed[col] = val if not isinstance(val, float) else round(val, 4)
                        rows.append(parsed)

                    sheets[sheet_name] = {
                        "columns": list(df.columns),
                        "rows": rows,
                        "total_rows": len(rows),
                        "data_types": self._detect_types(df)
                    }
                except Exception as e:
                    errors.append({"sheet": sheet_name, "error": str(e)})

        except Exception as e:
            return {"error": str(e), "sheets": {}}

        named_ranges = self._get_named_ranges(file_path)
        return {
            "sheets": sheets,
            "sheet_names": list(sheets.keys()),
            "named_ranges": named_ranges,
            "errors": errors
        }

    def _find_header_row(self, df: pd.DataFrame) -> int | None:
        for i in range(min(10, len(df))):
            row = df.iloc[i]
            non_null = row.dropna()
            if len(non_null) >= 3:
                strings = sum(1 for v in non_null if isinstance(v, str) and len(str(v)) > 0)
                if strings >= len(non_null) * 0.5:
                    return i
        return 0

    def _detect_types(self, df: pd.DataFrame) -> dict:
        types = {}
        for col in df.columns:
            sample = df[col].dropna().head(20)
            if sample.empty:
                types[col] = 'string'
                continue
            if pd.api.types.is_numeric_dtype(df[col]):
                types[col] = 'number'
            elif pd.api.types.is_datetime64_any_dtype(df[col]):
                types[col] = 'date'
            else:
                date_kw = ['date', 'period', 'month', 'year']
                if any(k in col.lower() for k in date_kw):
                    types[col] = 'date'
                else:
                    types[col] = 'string'
        return types

    def _get_named_ranges(self, file_path: str) -> list:
        try:
            wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
            ranges = []
            for name, nr in wb.defined_names.items():
                ranges.append({"name": name, "ref": str(nr.attr_text)})
            return ranges
        except Exception:
            return []