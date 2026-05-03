"""
KilimoChat Weather Handler Module
Fetches real-time weather data from OpenWeatherMap API for Kenyan locations.

Features:
- Current weather conditions
- 5-day weather forecast
- Agricultural recommendations based on weather
- Support for major Kenyan towns/cities
"""

import requests
import logging
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from datetime import datetime

from config import OPENWEATHER_API_KEY, REQUEST_TIMEOUT, MAX_RETRIES, logger

# Base URL for OpenWeatherMap API
OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5"

# Major Kenyan towns/cities with their coordinates
KENYA_LOCATIONS = {
    "nairobi": {"lat": -1.2921, "lon": 36.8219, "name": "Nairobi"},
    "mombasa": {"lat": -4.0435, "lon": 39.6682, "name": "Mombasa"},
    "kisumu": {"lat": -0.1022, "lon": 34.7617, "name": "Kisumu"},
    "nakuru": {"lat": -0.3031, "lon": 36.0657, "name": "Nakuru"},
    "eldoret": {"lat": 0.5143, "lon": 35.2698, "name": "Eldoret"},
    "machakos": {"lat": -1.5177, "lon": 37.2634, "name": "Machakos"},
    "nyeri": {"lat": -0.4167, "lon": 36.9500, "name": "Nyeri"},
    "meru": {"lat": 0.0467, "lon": 37.6559, "name": "Meru"},
    "kericho": {"lat": -0.3677, "lon": 35.2831, "name": "Kericho"},
    "kisii": {"lat": -0.6818, "lon": 34.7667, "name": "Kisii"},
    "kitale": {"lat": 1.0157, "lon": 35.0066, "name": "Kitale"},
    "thika": {"lat": -1.0333, "lon": 37.0667, "name": "Thika"},
    "malindi": {"lat": -3.2176, "lon": 40.1164, "name": "Malindi"},
    "garissa": {"lat": -0.4530, "lon": 39.6460, "name": "Garissa"},
    "kakamega": {"lat": 0.2849, "lon": 34.7519, "name": "Kakamega"},
}


@dataclass
class WeatherData:
    """Data class for weather information."""
    location: str
    temperature: float  # Celsius
    feels_like: float
    humidity: int  # Percentage
    description: str
    wind_speed: float  # m/s
    pressure: int  # hPa
    visibility: int  # meters
    sunrise: str
    sunset: str
    timestamp: datetime
    recommendation: str = ""


def extract_location_from_query(query: str) -> Optional[str]:
    """
    Extract location name from user query.
    
    Args:
        query: User's weather query
    
    Returns:
        Location name if found, None otherwise
    """
    query_lower = query.lower()
    
    # Check for known locations
    for location_key in KENYA_LOCATIONS:
        if location_key in query_lower:
            return location_key
    
    # Check for location patterns
    weather_patterns = [
        r"weather\s+in\s+([a-zA-Z\s]+)",
        r"weather\s+at\s+([a-zA-Z\s]+)",
        r"hali\s+ya\s+hewa\s+([a-zA-Z\s]+)",
        r"mvua\s+([a-zA-Z\s]+)",
    ]
    
    import re
    for pattern in weather_patterns:
        match = re.search(pattern, query_lower)
        if match:
            location = match.group(1).strip()
            # Check if location is in our database
            for key in KENYA_LOCATIONS:
                if key in location:
                    return key
    
    # Default to Nairobi if no location found
    if any(word in query_lower for word in ["weather", "hali", "mvua", "jua", "kiasi"]):
        return "nairobi"
    
    return None


def get_current_weather(location: str) -> Optional[WeatherData]:
    """
    Get current weather for a location.
    
    Args:
        location: Location name or coordinates
    
    Returns:
        WeatherData object or None if failed
    """
    if not OPENWEATHER_API_KEY:
        logger.warning("OPENWEATHER_API_KEY not set")
        return None
    
    # Get coordinates
    if location.lower() in KENYA_LOCATIONS:
        coords = KENYA_LOCATIONS[location.lower()]
        lat, lon = coords["lat"], coords["lon"]
        location_name = coords["name"]
    else:
        # Try to geocode (not implemented - would need geocoding API)
        logger.warning(f"Unknown location: {location}")
        return None
    
    # API call with retries
    for attempt in range(MAX_RETRIES):
        try:
            url = f"{OPENWEATHER_BASE_URL}/weather"
            params = {
                "lat": lat,
                "lon": lon,
                "appid": OPENWEATHER_API_KEY,
                "units": "metric",  # Celsius
            }
            
            response = requests.get(url, params=params, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            
            data = response.json()
            
            # Parse weather data
            weather = WeatherData(
                location=location_name,
                temperature=data["main"]["temp"],
                feels_like=data["main"]["feels_like"],
                humidity=data["main"]["humidity"],
                description=data["weather"][0]["description"],
                wind_speed=data["wind"]["speed"],
                pressure=data["main"]["pressure"],
                visibility=data.get("visibility", 0),
                sunrise=datetime.fromtimestamp(data["sys"]["sunrise"]).strftime("%H:%M"),
                sunset=datetime.fromtimestamp(data["sys"]["sunset"]).strftime("%H:%M"),
                timestamp=datetime.now(),
            )
            
            # Generate farming recommendation
            weather.recommendation = generate_farming_recommendation(weather)
            
            logger.info(f"Weather fetched for {location_name}: {weather.temperature}°C, {weather.description}")
            return weather
            
        except requests.exceptions.RequestException as e:
            logger.warning(f"Weather API attempt {attempt + 1} failed: {e}")
            if attempt < MAX_RETRIES - 1:
                import time
                time.sleep(2 ** attempt)  # Exponential backoff
        except Exception as e:
            logger.error(f"Weather data parsing error: {e}")
            return None
    
    logger.error("Failed to fetch weather after all retries")
    return None


def generate_farming_recommendation(weather: WeatherData) -> str:
    """
    Generate farming advice based on weather conditions.
    
    Args:
        weather: WeatherData object
    
    Returns:
        Farming recommendation string
    """
    temp = weather.temperature
    humidity = weather.humidity
    description = weather.description.lower()
    
    recommendations = []
    
    # Temperature recommendations
    if temp > 30:
        recommendations.append("High temperatures - ensure adequate irrigation for crops")
    elif temp < 15:
        recommendations.append("Cool temperatures - good for leafy vegetables, protect sensitive crops")
    
    # Humidity recommendations
    if humidity > 80:
        recommendations.append("High humidity - watch for fungal diseases, ensure good ventilation")
    elif humidity < 40:
        recommendations.append("Low humidity - increase irrigation frequency")
    
    # Weather condition recommendations
    if "rain" in description or "mvua" in description:
        recommendations.append("Rainy conditions - good time for planting, avoid spraying chemicals")
    elif "clear" in description or "sunny" in description:
        recommendations.append("Clear skies - good for harvesting and field activities")
    elif "cloud" in description:
        recommendations.append("Cloudy conditions - good for transplanting seedlings")
    elif "wind" in description:
        recommendations.append("Windy conditions - secure any structures, avoid spraying")
    
    return " | ".join(recommendations) if recommendations else "Favorable conditions for general farming activities"


def format_weather_for_user(weather: WeatherData, language: str = "en") -> str:
    """
    Format weather data for user display.
    
    Args:
        weather: WeatherData object
        language: "en" or "sw"
    
    Returns:
        Formatted weather string
    """
    if language == "sw":
        return f"""🌤️ Hali ya Hewa - {weather.location}

🌡️ Joto: {weather.temperature:.1f}°C (inahisi kama {weather.feels_like:.1f}°C)
💧 Unyevu: {weather.humidity}%
🌬️ Upepo: {weather.wind_speed:.1f} m/s
👁️ Maono: {weather.visibility / 1000:.1f} km
📝 Maelezo: {weather.description.capitalize()}

🌅 Mzuka wa jua: {weather.sunrise}
🌇 Machweo ya jua: {weather.sunset}

💡 Ushauri wa Kilimo:
{weather.recommendation}"""
    else:
        return f"""🌤️ Weather Report - {weather.location}

🌡️ Temperature: {weather.temperature:.1f}°C (feels like {weather.feels_like:.1f}°C)
💧 Humidity: {weather.humidity}%
🌬️ Wind: {weather.wind_speed:.1f} m/s
👁️ Visibility: {weather.visibility / 1000:.1f} km
📝 Conditions: {weather.description.capitalize()}

🌅 Sunrise: {weather.sunrise}
🌇 Sunset: {weather.sunset}

💡 Farming Recommendation:
{weather.recommendation}"""


def get_forecast(location: str, days: int = 3) -> Optional[List[Dict[str, Any]]]:
    """
    Get weather forecast for upcoming days.
    
    Args:
        location: Location name
        days: Number of days (max 5)
    
    Returns:
        List of forecast data or None
    """
    if not OPENWEATHER_API_KEY:
        return None
    
    # Get coordinates
    if location.lower() in KENYA_LOCATIONS:
        coords = KENYA_LOCATIONS[location.lower()]
        lat, lon = coords["lat"], coords["lon"]
    else:
        return None
    
    try:
        url = f"{OPENWEATHER_BASE_URL}/forecast"
        params = {
            "lat": lat,
            "lon": lon,
            "appid": OPENWEATHER_API_KEY,
            "units": "metric",
        }
        
        response = requests.get(url, params=params, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        
        data = response.json()
        
        # Process forecast (returns data every 3 hours, group by day)
        forecasts = []
        current_date = None
        
        for item in data["list"][:days * 8]:  # 8 readings per day (3-hour intervals)
            dt = datetime.fromtimestamp(item["dt"])
            date_str = dt.strftime("%Y-%m-%d")
            
            if date_str != current_date:
                current_date = date_str
                forecasts.append({
                    "date": dt.strftime("%A, %d %B"),
                    "temp_min": item["main"]["temp_min"],
                    "temp_max": item["main"]["temp_max"],
                    "description": item["weather"][0]["description"],
                    "humidity": item["main"]["humidity"],
                })
        
        return forecasts[:days]
        
    except Exception as e:
        logger.error(f"Forecast fetch error: {e}")
        return None


def format_forecast_for_user(forecasts: List[Dict[str, Any]], location: str, language: str = "en") -> str:
    """Format forecast data for user display."""
    if not forecasts:
        return "No forecast data available."
    
    if language == "sw":
        result = f"🌤️ Utabiri wa Hali ya Hewa - {location}\n\n"
        for day in forecasts:
            result += f"📅 {day['date']}\n"
            result += f"   🌡️ Joto: {day['temp_min']:.1f}°C - {day['temp_max']:.1f}°C\n"
            result += f"   💧 Unyevu: {day['humidity']}%\n"
            result += f"   📝 {day['description'].capitalize()}\n\n"
    else:
        result = f"🌤️ Weather Forecast - {location}\n\n"
        for day in forecasts:
            result += f"📅 {day['date']}\n"
            result += f"   🌡️ Temp: {day['temp_min']:.1f}°C - {day['temp_max']:.1f}°C\n"
            result += f"   💧 Humidity: {day['humidity']}%\n"
            result += f"   📝 {day['description'].capitalize()}\n\n"
    
    return result


# Quick lookup for weather queries
def needs_weather_data(query: str) -> bool:
    """Check if query is asking for weather information."""
    weather_keywords = [
        "weather", "hali ya hewa", "mvua", "jua", "kiasi", "baridi", "joto",
        "rain", "temperature", "sunny", "cloudy", "wind", "humidity",
        "forecast", "utabiri", "leo", "kesho", "wiki"
    ]
    
    query_lower = query.lower()
    return any(keyword in query_lower for keyword in weather_keywords)


def get_weather_response(query: str, language: str = "en") -> Optional[str]:
    """
    Main function to get weather response for a query.
    
    Args:
        query: User's query
        language: "en" or "sw"
    
    Returns:
        Formatted weather response or None
    """
    # Extract location
    location = extract_location_from_query(query)
    
    if not location:
        return None
    
    # Check if asking for forecast
    if any(word in query.lower() for word in ["forecast", "utabiri", "kesho", "next", "coming"]):
        forecasts = get_forecast(location)
        if forecasts:
            location_name = KENYA_LOCATIONS.get(location, {}).get("name", location)
            return format_forecast_for_user(forecasts, location_name, language)
    
    # Get current weather
    weather = get_current_weather(location)
    
    if weather:
        return format_weather_for_user(weather, language)
    
    return None
