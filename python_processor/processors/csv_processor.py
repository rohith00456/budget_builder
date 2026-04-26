import csv
import chardet
import io
from typing import Dict, List, Any


class CSVProcessor:
    def process(self, file_path: str) -> Dict[str, Any]:
        encoding = self._detect_encoding(file_path)
        rows, columns, data_types, errors = self._parse_csv(file_path, encoding)
        return {
            'rows': rows,
            'columns': columns,
            'data_types': data_types,
            'errors': errors,
            'encoding': encoding,
        }

    def _detect_encoding(self, file_path: str) -> str:
        with open(file_path, 'rb') as f:
            raw = f.read(100_000)
        detected = chardet.detect(raw)
        encoding = detected.get('encoding') or 'utf-8'
        # Normalize common encodings
        encoding_map = {
            'ascii': 'utf-8',
            'windows-1252': 'cp1252',
            'iso-8859-1': 'latin-1',
        }
        return encoding_map.get(encoding.lower(), encoding)

    def _parse_csv(self, file_path: str, encoding: str):
        rows: List[Dict] = []
        errors: List[str] = []
        columns: List[str] = []
        data_types: Dict[str, str] = {}

        try:
            with open(file_path, encoding=encoding, errors='replace') as f:
                # Sniff dialect
                sample = f.read(4096)
                f.seek(0)
                try:
                    dialect = csv.Sniffer().sniff(sample)
                except csv.Error:
                    dialect = csv.excel

                reader = csv.DictReader(f, dialect=dialect)
                columns = [c.strip() for c in (reader.fieldnames or [])]

                for i, row in enumerate(reader):
                    try:
                        clean_row = {k.strip(): v.strip() if isinstance(v, str) else v
                                     for k, v in row.items() if k}
                        rows.append(clean_row)
                    except Exception as e:
                        errors.append(f'Row {i + 2}: {str(e)}')

            # Infer data types from first 50 rows
            if rows and columns:
                data_types = self._infer_types(rows[:50], columns)

        except Exception as e:
            errors.append(f'File parse error: {str(e)}')

        return rows, columns, data_types, errors

    def _infer_types(self, rows: List[Dict], columns: List[str]) -> Dict[str, str]:
        types = {}
        for col in columns:
            values = [r.get(col, '') for r in rows if r.get(col, '')]
            if not values:
                types[col] = 'string'
                continue

            # Try numeric
            numeric_count = 0
            for v in values:
                try:
                    float(str(v).replace(',', '').replace('₹', '').replace('$', ''))
                    numeric_count += 1
                except ValueError:
                    pass

            if numeric_count / len(values) > 0.8:
                types[col] = 'number'
                continue

            # Try date
            date_count = 0
            import re
            date_pattern = re.compile(
                r'\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2}|'
                r'(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)',
                re.IGNORECASE
            )
            for v in values:
                if date_pattern.search(str(v)):
                    date_count += 1

            if date_count / len(values) > 0.5:
                types[col] = 'date'
            else:
                types[col] = 'string'

        return types