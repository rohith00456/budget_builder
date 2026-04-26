from typing import Dict, List, Any


class VarianceCalculator:
    def calculate(self, budget_data: List[Dict], actuals_data: List[Dict], line_type: str = 'EXPENSE') -> Dict[str, Any]:
        budget_map = {}
        for item in budget_data:
            key = f"{item.get('department', '')}::{item.get('category', '')}"
            budget_map[key] = {
                'department': item.get('department', ''),
                'category': item.get('category', ''),
                'budget_amount': self._to_float(item.get('amount', item.get('budget_amount', 0))),
                'account_code': item.get('account_code', ''),
                'type': item.get('type', line_type),
            }

        actuals_map = {}
        for item in actuals_data:
            key = f"{item.get('department', '')}::{item.get('category', '')}"
            if key in actuals_map:
                actuals_map[key] += self._to_float(item.get('amount', item.get('actual_amount', 0)))
            else:
                actuals_map[key] = self._to_float(item.get('amount', item.get('actual_amount', 0)))

        variances = []
        all_keys = set(list(budget_map.keys()) + list(actuals_map.keys()))

        summary = {
            'total_budget': 0,
            'total_actual': 0,
            'total_variance': 0,
            'fav_count': 0,
            'unfav_count': 0,
            'onplan_count': 0,
        }

        for key in all_keys:
            budget_item = budget_map.get(key, {})
            budget_amount = budget_item.get('budget_amount', 0) or 0
            actual_amount = actuals_map.get(key, 0) or 0
            item_type = budget_item.get('type', line_type)

            variance = actual_amount - budget_amount
            variance_pct = (variance / abs(budget_amount) * 100) if budget_amount != 0 else 0

            status = self._determine_status(variance, variance_pct, item_type)

            dept, category = key.split('::', 1)

            record = {
                'department': budget_item.get('department', dept),
                'category': budget_item.get('category', category),
                'account_code': budget_item.get('account_code', ''),
                'type': item_type,
                'budget_amount': round(budget_amount, 2),
                'actual_amount': round(actual_amount, 2),
                'variance': round(variance, 2),
                'variance_pct': round(variance_pct, 2),
                'status': status,
            }
            variances.append(record)

            summary['total_budget'] += budget_amount
            summary['total_actual'] += actual_amount
            summary['total_variance'] += variance

            if status == 'FAV':
                summary['fav_count'] += 1
            elif status == 'UNFAV':
                summary['unfav_count'] += 1
            else:
                summary['onplan_count'] += 1

        # Sort by absolute variance % descending
        variances.sort(key=lambda x: abs(x['variance_pct']), reverse=True)

        summary['total_variance'] = round(summary['total_variance'], 2)
        summary['total_budget'] = round(summary['total_budget'], 2)
        summary['total_actual'] = round(summary['total_actual'], 2)

        return {
            'variances': variances,
            'summary': summary,
            'total_records': len(variances),
        }

    def _determine_status(self, variance: float, variance_pct: float, line_type: str) -> str:
        if abs(variance_pct) < 2.0:
            return 'ONPLAN'
        if line_type == 'REVENUE':
            return 'FAV' if variance >= 0 else 'UNFAV'
        else:  # EXPENSE or HEADCOUNT
            return 'FAV' if variance <= 0 else 'UNFAV'

    def _to_float(self, value) -> float:
        if value is None or value == '':
            return 0.0
        try:
            return float(str(value).replace(',', '').replace('₹', '').replace('$', '').strip())
        except (ValueError, TypeError):
            return 0.0