from fastapi import FastAPI, HTTPException

app = FastAPI()

DUMMY_TAX_DATA = {
    "taxpayer_profile": {
        "first_name": "Avi",
        "last_name": "Kumarr",
        "ssn": "XXX-XX-1111",
        "address": "Atlanta, GA 30309",
        "state_of_residence": "GA",
        "occupation": "IT Worker",
        "employer": "Georgia Institute of Technology",
    },
    "tax_records": [
        {
            "tax_year": 2022,
            "filed_in_year": 2023,
            "documents": {
                "W-2": {
                    "employer_name": "Georgia Institute of Technology",
                    "employer_ein": "58-XXXXXXX",
                    "box_1_wages_tips_other_comp": 60000.00,
                    "box_2_federal_income_tax_withheld": 5800.00,
                    "box_3_social_security_wages": 60000.00,
                    "box_4_social_security_tax_withheld": 3720.00,
                    "box_5_medicare_wages_and_tips": 60000.00,
                    "box_6_medicare_tax_withheld": 870.00,
                    "box_12a_code_DD_health_coverage": 4200.00,
                    "box_16_state_wages": 60000.00,
                    "box_17_state_income_tax": 2950.00,
                },
                "1098-E": {
                    "lender": "Great Lakes / Nelnet Educational Services",
                    "box_1_student_loan_interest": 850.00,
                },
                "1099_Consolidated": {
                    "broker": "Robinhood Financial LLC",
                    "account_number": "XXXX-1234",
                    "1099-DIV": {
                        "box_1a_total_ordinary_dividends": 45.00,
                        "box_1b_qualified_dividends": 30.00,
                    },
                    "1099-B": {
                        "short_term_gains": 0.00,
                        "long_term_gains": 0.00,
                        "proceeds": 0.00,
                        "cost_basis": 0.00,
                        "net_gain": 0.00,
                    },
                    "5498": {
                        "roth_ira_contribution": 2500.00,
                    },
                },
            },
        },
        {
            "tax_year": 2023,
            "filed_in_year": 2024,
            "documents": {
                "W-2": {
                    "employer_name": "Georgia Institute of Technology",
                    "employer_ein": "58-XXXXXXX",
                    "box_1_wages_tips_other_comp": 62500.00,
                    "box_2_federal_income_tax_withheld": 6100.00,
                    "box_3_social_security_wages": 62500.00,
                    "box_4_social_security_tax_withheld": 3875.00,
                    "box_5_medicare_wages_and_tips": 62500.00,
                    "box_6_medicare_tax_withheld": 906.25,
                    "box_12a_code_DD_health_coverage": 4400.00,
                    "box_16_state_wages": 62500.00,
                    "box_17_state_income_tax": 3150.00,
                },
                "1098-E": {
                    "lender": "Great Lakes / Nelnet Educational Services",
                    "box_1_student_loan_interest": 1250.00,
                },
                "1099_Consolidated": {
                    "broker": "Robinhood Financial LLC",
                    "account_number": "XXXX-1234",
                    "1099-DIV": {
                        "box_1a_total_ordinary_dividends": 115.00,
                        "box_1b_qualified_dividends": 95.00,
                    },
                    "1099-B": {
                        "term": "Short-Term",
                        "proceeds": 1500.00,
                        "cost_basis": 1200.00,
                        "net_gain": 300.00,
                    },
                    "5498": {
                        "roth_ira_contribution": 4000.00,
                    },
                },
            },
        },
        {
            "tax_year": 2024,
            "filed_in_year": 2025,
            "documents": {
                "W-2": {
                    "employer_name": "Georgia Institute of Technology",
                    "employer_ein": "58-XXXXXXX",
                    "box_1_wages_tips_other_comp": 65000.00,
                    "box_2_federal_income_tax_withheld": 6450.00,
                    "box_3_social_security_wages": 65000.00,
                    "box_4_social_security_tax_withheld": 4030.00,
                    "box_5_medicare_wages_and_tips": 65000.00,
                    "box_6_medicare_tax_withheld": 942.50,
                    "box_12a_code_DD_health_coverage": 4500.00,
                    "box_16_state_wages": 65000.00,
                    "box_17_state_income_tax": 3300.00,
                },
                "1098-E": {
                    "lender": "Great Lakes / Nelnet Educational Services",
                    "box_1_student_loan_interest": 1100.00,
                },
                "1099_Consolidated": {
                    "broker": "Robinhood Financial LLC",
                    "account_number": "XXXX-1234",
                    "1099-DIV": {
                        "box_1a_total_ordinary_dividends": 240.00,
                        "box_1b_qualified_dividends": 210.00,
                    },
                    "1099-B": {
                        "term": "Long-Term",
                        "proceeds": 3000.00,
                        "cost_basis": 2400.00,
                        "net_gain": 600.00,
                    },
                    "5498": {
                        "roth_ira_contribution": 6500.00,
                    },
                },
            },
        },
    ],
}


def get_tax_info_for_year(tax_year: int) -> dict:
    """
    Return taxpayer profile and tax record for the given tax year.
    Uses hardcoded dummy data. Raises ValueError if the year is not found.
    """
    profile = DUMMY_TAX_DATA["taxpayer_profile"]
    records = DUMMY_TAX_DATA["tax_records"]
    for record in records:
        if record["tax_year"] == tax_year:
            return {
                "taxpayer_profile": profile,
                "tax_records": [record],
            }
    raise ValueError(f"No tax record found for year {tax_year}")


@app.get("/tax-info/{tax_year}")
def api_tax_info_for_year(tax_year: int):
    """GET /tax-info/2023 returns tax info for that year."""
    try:
        return get_tax_info_for_year(tax_year)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

# use this one for now for testing
@app.get("/tax-info")
def api_all_tax_info():
    """GET /tax-info returns full dummy tax data (all years)."""
    return DUMMY_TAX_DATA
