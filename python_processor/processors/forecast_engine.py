import statistics
from typing import Dict, List, Any
from datetime import datetime, timedelta
import math


class ForecastEngine:
    def forecast(self, historical_data: List[Dict], forecast_months: int = 6) -> Dict[str, Any]:
        if len(historical_data) < 2:
            return {'error': 'Need at least 2 data points for forecasting'}

        # Sort by period
        data = sorted(historical_data, key=lambda x: x.get('period', ''))
        amounts = [self._to_float(d.get('amount', 0)) for d in data]
        periods = [d.get('period', '') for d in data]

        n = len(amounts)
        mean_amount = statistics.mean(amounts)
        std_amount = statistics.stdev(amounts) if n > 1 else 0

        # Linear regression
        x = list(range(n))
        x_mean = statistics.mean(x)
        y_mean = mean_amount

        numerator = sum((x[i] - x_mean) * (amounts[i] - y_mean) for i in range(n))
        denominator = sum((x[i] - x_mean) ** 2 for i in range(n))
        slope = numerator / denominator if denominator != 0 else 0
        intercept = y_mean - slope * x_mean

        # Seasonal factors (detect monthly patterns)
        seasonal_factors = self._compute_seasonal_factors(data)

        # Moving averages
        ma3 = self._moving_average(amounts, 3)
        ma6 = self._moving_average(amounts, 6)

        # Generate forecasts
        last_period = periods[-1]
        forecasts = []

        for i in range(1, forecast_months + 1):
            future_x = n - 1 + i
            base_forecast = intercept + slope * future_x

            future_period = self._add_months(last_period, i)
            future_month = int(future_period.split('-')[1]) if '-' in future_period else 1
            seasonal_factor = seasonal_factors.get(future_month, 1.0)
            adjusted_forecast = base_forecast * seasonal_factor

            # Confidence interval widens with distance
            confidence = max(40, 90 - i * 5)
            margin = std_amount * (1 + i * 0.1) * 1.645  # 90% CI

            forecasts.append({
                'period': future_period,
                'projected': round(max(0, adjusted_forecast), 2),
                'lower': round(max(0, adjusted_forecast - margin), 2),
                'upper': round(adjusted_forecast + margin, 2),
                'confidence': confidence,
                'seasonal_factor': round(seasonal_factor, 3),
                'method': 'linear_regression_seasonal',
            })

        # Growth rate
        growth_rate = 0
        if amounts[0] != 0:
            growth_rate = ((amounts[-1] - amounts[0]) / abs(amounts[0])) * 100 / max(n - 1, 1)

        return {
            'forecasts': forecasts,
            'method': 'linear_regression_seasonal',
            'historical_mean': round(mean_amount, 2),
            'historical_std': round(std_amount, 2),
            'growth_rate_monthly': round(growth_rate, 2),
            'slope': round(slope, 2),
            'moving_average_3m': round(ma3, 2) if ma3 else None,
            'moving_average_6m': round(ma6, 2) if ma6 else None,
            'data_points': n,
        }

    def _compute_seasonal_factors(self, data: List[Dict]) -> Dict[int, float]:
        monthly_amounts = {}
        for d in data:
            period = d.get('period', '')
            if '-' in period:
                month = int(period.split('-')[1])
                amount = self._to_float(d.get('amount', 0))
                if month not in monthly_amounts:
                    monthly_amounts[month] = []
                monthly_amounts[month].append(amount)

        if not monthly_amounts:
            return {}

        monthly_means = {m: statistics.mean(v) for m, v in monthly_amounts.items()}
        overall_mean = statistics.mean(list(monthly_means.values())) or 1

        return {m: (v / overall_mean) if overall_mean != 0 else 1.0
                for m, v in monthly_means.items()}

    def _moving_average(self, values: List[float], window: int) -> float:
        if len(values) < window:
            return statistics.mean(values) if values else 0
        return statistics.mean(values[-window:])

    def _add_months(self, period: str, months: int) -> str:
        try:
            if '-' in period:
                year, month = map(int, period.split('-'))
            else:
                year, month = int(period), 1

            total_months = year * 12 + (month - 1) + months
            new_year = total_months // 12
            new_month = (total_months % 12) + 1
            return f'{new_year}-{str(new_month).zfill(2)}'
        except Exception:
            return period

    def _to_float(self, value) -> float:
        try:
            return float(str(value).replace(',', '').replace('₹', '').replace('$', '').strip())
        except (ValueError, TypeError):
            return 0.0