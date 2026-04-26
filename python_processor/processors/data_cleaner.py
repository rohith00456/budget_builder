import re
from typing import Dict, List, Any
from datetime import datetime
import statistics


class DataCleaner:
    DEPARTMENT_ALIASES = {
        'eng': 'Engineering', 'engineering': 'Engineering', 'tech': 'Engineering',
        'mktg': 'Marketing', 'marketing': 'Marketing', 'mkt': 'Marketing',
        'sales': 'Sales', 'biz dev': 'Sales', 'business development': 'Sales',
        'hr': 'Human Resources', 'human resources': 'Human Resources', 'people': 'Human Resources',
        'fin': 'Finance', 'finance': 'Finance', 'accounts': 'Finance', 'accounting': 'Finance',
        'ops': 'Operations', 'operations': 'Operations',
        'cs': 'Customer Success', 'customer success': 'Customer Success', 'support': 'Customer Success',
        'product': 'Product', 'pm': 'Product',
        'legal': 'Legal', 'compliance': 'Legal',
        'admin': 'Admin', 'administration': 'Admin', 'g&a': 'Admin',
        'r&d': 'R&D', 'research': 'R&D', 'research and development': 'R&D',
    }

    def clean(self, rows: List[Dict], columns: List[str]) -> Dict[str, Any]:
        if not rows:
            return {'rows': [], 'errors': [], 'data_quality_score': 0}

        errors = []
        original_count = len(rows)

        # 1. Remove duplicate rows
        rows = self._remove_duplicates(rows)
        dedup_removed = original_count - len(rows)
        if dedup_removed > 0:
            errors.append(f'Removed {dedup_removed} duplicate rows')

        # 2. Normalize department names
        dept_cols = [c for c in columns if 'dept' in c.lower() or 'department' in c.lower()]
        for col in dept_cols:
            for row in rows:
                if col in row and row[col]:
                    row[col] = self._normalize_department(str(row[col]))

        # 3. Standardize dates
        date_cols = [c for c in columns if any(kw in c.lower() for kw in ['date', 'period', 'month', 'year'])]
        for col in date_cols:
            for row in rows:
                if col in row and row[col]:
                    normalized = self._normalize_date(str(row[col]))
                    if normalized:
                        row[col] = normalized

        # 4. Fill missing numeric values
        numeric_cols = self._detect_numeric_columns(rows, columns)
        for col in numeric_cols:
            col_values = [self._to_float(r.get(col)) for r in rows]
            valid_values = [v for v in col_values if v is not None]
            fill_value = statistics.median(valid_values) if valid_values else 0
            for row in rows:
                if row.get(col) in ('', None):
                    row[col] = 0
                    errors.append(f'Filled missing value in column "{col}"')

        # 5. Flag outliers (> 3 std deviations)
        outlier_count = 0
        for col in numeric_cols:
            col_values = [self._to_float(r.get(col)) for r in rows]
            valid_values = [v for v in col_values if v is not None]
            if len(valid_values) > 5:
                mean = statistics.mean(valid_values)
                std = statistics.stdev(valid_values) if len(valid_values) > 1 else 0
                for row in rows:
                    val = self._to_float(row.get(col))
                    if val is not None and std > 0 and abs(val - mean) > 3 * std:
                        row['_outlier_flag'] = True
                        outlier_count += 1

        if outlier_count > 0:
            errors.append(f'Flagged {outlier_count} outlier values (>3 std deviations)')

        # 6. Compute quality score
        quality_score = self._compute_quality_score(rows, columns, original_count, dedup_removed, errors)

        return {
            'rows': rows,
            'errors': errors,
            'data_quality_score': quality_score,
            'stats': {
                'original_rows': original_count,
                'cleaned_rows': len(rows),
                'duplicates_removed': dedup_removed,
                'outliers_flagged': outlier_count,
            }
        }

    def _remove_duplicates(self, rows: List[Dict]) -> List[Dict]:
        seen = set()
        unique = []
        for row in rows:
            key = tuple(sorted((k, str(v)) for k, v in row.items() if not k.startswith('_')))
            if key not in seen:
                seen.add(key)
                unique.append(row)
        return unique

    def _normalize_department(self, value: str) -> str:
        normalized = value.strip().lower()
        return self.DEPARTMENT_ALIASES.get(normalized, value.strip().title())

    def _normalize_date(self, value: str) -> str:
        value = value.strip()
        formats = [
            '%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y',
            '%Y/%m/%d', '%b %Y', '%B %Y', '%Y-%m',
            '%d %b %Y', '%d %B %Y',
        ]
        for fmt in formats:
            try:
                dt = datetime.strptime(value, fmt)
                return dt.strftime('%Y-%m-%d')
            except ValueError:
                continue
        return value

    def _detect_numeric_columns(self, rows: List[Dict], columns: List[str]) -> List[str]:
        numeric = []
        sample = rows[:50]
        for col in columns:
            values = [r.get(col) for r in sample if r.get(col) not in ('', None)]
            if not values:
                continue
            count = sum(1 for v in values if self._to_float(v) is not None)
            if count / len(values) > 0.7:
                numeric.append(col)
        return numeric

    def _to_float(self, value) -> float:
        if value is None or value == '':
            return None
        try:
            return float(str(value).replace(',', '').replace('₹', '').replace('$', '').replace('%', '').strip())
        except (ValueError, TypeError):
            return None

    def _compute_quality_score(self, rows, columns, original_count, dedup_removed, errors) -> int:
        score = 100

        if original_count > 0:
            dup_ratio = dedup_removed / original_count
            score -= int(dup_ratio * 30)

        missing_count = 0
        total_cells = len(rows) * len(columns)
        for row in rows:
            for col in columns:
                if row.get(col) in ('', None):
                    missing_count += 1

        if total_cells > 0:
            missing_ratio = missing_count / total_cells
            score -= int(missing_ratio * 40)

        score -= min(len(errors) * 2, 20)
        return max(0, min(100, score))