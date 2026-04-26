from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import tempfile
import traceback

from processors.csv_processor import CSVProcessor
from processors.excel_processor import ExcelProcessor
from processors.data_cleaner import DataCleaner
from processors.variance_calculator import VarianceCalculator
from processors.forecast_engine import ForecastEngine

app = Flask(__name__)
CORS(app)

csv_processor = CSVProcessor()
excel_processor = ExcelProcessor()
data_cleaner = DataCleaner()
variance_calculator = VarianceCalculator()
forecast_engine = ForecastEngine()


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'python_processor', 'version': '1.0.0'})


@app.route('/process/csv', methods=['POST'])
def process_csv():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    file_type = request.form.get('file_type', 'UNKNOWN')

    with tempfile.NamedTemporaryFile(delete=False, suffix='.csv') as tmp:
        file.save(tmp.name)
        tmp_path = tmp.name

    try:
        result = csv_processor.process(tmp_path)
        cleaned = data_cleaner.clean(result['rows'], result['columns'])
        return jsonify({
            'rows': cleaned['rows'],
            'columns': result['columns'],
            'data_types': result['data_types'],
            'data_quality_score': cleaned['data_quality_score'],
            'errors': cleaned['errors'],
            'total_rows': len(cleaned['rows']),
            'file_type': file_type,
        })
    except Exception as e:
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500
    finally:
        os.unlink(tmp_path)


@app.route('/process/excel', methods=['POST'])
def process_excel():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    file_type = request.form.get('file_type', 'UNKNOWN')
    ext = os.path.splitext(file.filename)[1].lower()

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        file.save(tmp.name)
        tmp_path = tmp.name

    try:
        result = excel_processor.process(tmp_path)
        # Clean the first sheet
        first_sheet = list(result['sheets'].keys())[0] if result['sheets'] else None
        if first_sheet:
            sheet_data = result['sheets'][first_sheet]
            cleaned = data_cleaner.clean(sheet_data['rows'], sheet_data['columns'])
            return jsonify({
                'rows': cleaned['rows'],
                'columns': sheet_data['columns'],
                'data_types': sheet_data['data_types'],
                'data_quality_score': cleaned['data_quality_score'],
                'errors': cleaned['errors'],
                'total_rows': len(cleaned['rows']),
                'all_sheets': list(result['sheets'].keys()),
                'file_type': file_type,
            })
        return jsonify({'error': 'No sheets found in Excel file'}), 400
    except Exception as e:
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500
    finally:
        os.unlink(tmp_path)


@app.route('/process/variance', methods=['POST'])
def process_variance():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'JSON body required'}), 400

    budget_data = data.get('budget_data', [])
    actuals_data = data.get('actuals_data', [])
    line_type = data.get('line_type', 'EXPENSE')

    try:
        result = variance_calculator.calculate(budget_data, actuals_data, line_type)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/forecast', methods=['POST'])
def forecast():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'JSON body required'}), 400

    historical_data = data.get('historical_data', [])
    forecast_months = data.get('forecast_months', 6)

    try:
        result = forecast_engine.forecast(historical_data, forecast_months)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/clean', methods=['POST'])
def clean_data():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'JSON body required'}), 400

    rows = data.get('rows', [])
    columns = data.get('columns', [])

    try:
        result = data_cleaner.clean(rows, columns)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@app.route('/api/health', methods=['GET'])
def api_health():
    return health()


@app.route('/api/forecast', methods=['POST'])
def api_forecast():
    return forecast()


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_ENV', 'production') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)