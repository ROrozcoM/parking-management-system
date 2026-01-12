from datetime import datetime, date

def get_current_campaign_dates():
    """
    Calcula las fechas de la campaña actual (Sept - Jun)
    
    Lógica:
    - Sept-Dic → Campaña actual (año actual)
    - Ene-Jun → Campaña actual (año anterior)
    - Jul-Ago → Campaña anterior (parking cerrado)
    
    Returns:
        dict: {
            "campaign_name": "2025/2026",
            "start_date": date(2025, 9, 1),
            "end_date": date(2026, 6, 30)
        }
    """
    now = datetime.now()
    month = now.month
    year = now.year
    
    if month >= 9:  # Sept-Dic
        campaign_year = year
    elif month <= 6:  # Ene-Jun
        campaign_year = year - 1
    else:  # Jul-Ago (cerrado)
        campaign_year = year - 1
    
    start_date = date(campaign_year, 9, 1)
    end_date = date(campaign_year + 1, 6, 30)
    
    return {
        "campaign_name": f"{campaign_year}/{campaign_year + 1}",
        "start_date": start_date,
        "end_date": end_date
    }