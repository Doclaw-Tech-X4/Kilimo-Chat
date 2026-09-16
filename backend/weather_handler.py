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
    # Nairobi County
    "westlands": {"name": "Westlands", "county": "Nairobi", "lat": -1.2676, "lon": 36.8121},
    "dagoretti_north": {"name": "Dagoretti North", "county": "Nairobi", "lat": -1.2854, "lon": 36.7589},
    "dagoretti_south": {"name": "Dagoretti South", "county": "Nairobi", "lat": -1.3090, "lon": 36.7410},
    "langata": {"name": "Lang'ata", "county": "Nairobi", "lat": -1.3456, "lon": 36.7865},
    "kibra": {"name": "Kibra", "county": "Nairobi", "lat": -1.3137, "lon": 36.7884},
    "roysambu": {"name": "Roysambu", "county": "Nairobi", "lat": -1.2185, "lon": 36.8872},
    "kasarani": {"name": "Kasarani", "county": "Nairobi", "lat": -1.2229, "lon": 36.8974},
    "ruaraka": {"name": "Ruaraka", "county": "Nairobi", "lat": -1.2428, "lon": 36.8712},
    "embakasi_south": {"name": "Embakasi South", "county": "Nairobi", "lat": -1.3283, "lon": 36.8833},
    "embakasi_north": {"name": "Embakasi North", "county": "Nairobi", "lat": -1.2589, "lon": 36.8972},
    "embakasi_central": {"name": "Embakasi Central", "county": "Nairobi", "lat": -1.2783, "lon": 36.9021},
    "embakasi_east": {"name": "Embakasi East", "county": "Nairobi", "lat": -1.3061, "lon": 36.9247},
    "embakasi_west": {"name": "Embakasi West", "county": "Nairobi", "lat": -1.2868, "lon": 36.8839},
    "makadara": {"name": "Makadara", "county": "Nairobi", "lat": -1.3014, "lon": 36.8550},
    "kamukunji": {"name": "Kamukunji", "county": "Nairobi", "lat": -1.2831, "lon": 36.8488},
    "starehe": {"name": "Starehe", "county": "Nairobi", "lat": -1.2800, "lon": 36.8250},
    "mathare": {"name": "Mathare", "county": "Nairobi", "lat": -1.2619, "lon": 36.8583},

    # Mombasa County
    "changamwe": {"name": "Changamwe", "county": "Mombasa", "lat": -4.0251, "lon": 39.6300},
    "jomvu": {"name": "Jomvu", "county": "Mombasa", "lat": -4.0083, "lon": 39.6083},
    "kisauni": {"name": "Kisauni", "county": "Mombasa", "lat": -4.0050, "lon": 39.6917},
    "nyali": {"name": "Nyali", "county": "Mombasa", "lat": -4.0410, "lon": 39.7040},
    "likoni": {"name": "Likoni", "county": "Mombasa", "lat": -4.0833, "lon": 39.6583},
    "mvita": {"name": "Mvita", "county": "Mombasa", "lat": -4.0544, "lon": 39.6636},

    # Kisumu County
    "kisumu_central": {"name": "Kisumu Central", "county": "Kisumu", "lat": -0.1022, "lon": 34.7617},
    "kisumu_east": {"name": "Kisumu East", "county": "Kisumu", "lat": -0.0833, "lon": 34.8000},
    "kisumu_west": {"name": "Kisumu West", "county": "Kisumu", "lat": -0.0667, "lon": 34.6667},
    "muhoroni": {"name": "Muhoroni", "county": "Kisumu", "lat": -0.1514, "lon": 35.1978},
    "nyakach": {"name": "Nyakach", "county": "Kisumu", "lat": -0.3333, "lon": 35.0333},
    "nyando": {"name": "Nyando", "county": "Kisumu", "lat": -0.1833, "lon": 34.9333},
    "seme": {"name": "Seme", "county": "Kisumu", "lat": -0.1333, "lon": 34.5167},

    # Nakuru County
    "bahati": {"name": "Bahati", "county": "Nakuru", "lat": -0.1667, "lon": 36.1500},
    "gilgil": {"name": "Gilgil", "county": "Nakuru", "lat": -0.4925, "lon": 36.2844},
    "kuresoi_north": {"name": "Kuresoi North", "county": "Nakuru", "lat": -0.2167, "lon": 35.6167},
    "kuresoi_south": {"name": "Kuresoi South", "county": "Nakuru", "lat": -0.4000, "lon": 35.5833},
    "molo": {"name": "Molo", "county": "Nakuru", "lat": -0.2472, "lon": 35.7344},
    "naivasha": {"name": "Naivasha", "county": "Nakuru", "lat": -0.7167, "lon": 36.4333},
    "nakuru_city_east": {"name": "Nakuru City East", "county": "Nakuru", "lat": -0.2833, "lon": 36.0833},
    "nakuru_city_west": {"name": "Nakuru City West", "county": "Nakuru", "lat": -0.3000, "lon": 36.0333},
    "njoro": {"name": "Njoro", "county": "Nakuru", "lat": -0.3375, "lon": 35.9422},
    "rongai": {"name": "Rongai", "county": "Nakuru", "lat": -0.1667, "lon": 35.8667},
    "subukia": {"name": "Subukia", "county": "Nakuru", "lat": -0.0167, "lon": 36.2333},

    # Uasin Gishu County
    "ainabkoi": {"name": "Ainabkoi", "county": "Uasin Gishu", "lat": 0.3667, "lon": 35.4500},
    "kapseret": {"name": "Kapseret", "county": "Uasin Gishu", "lat": 0.4500, "lon": 35.2167},
    "kesses": {"name": "Kesses", "county": "Uasin Gishu", "lat": 0.3167, "lon": 35.3333},
    "moiben": {"name": "Moiben", "county": "Uasin Gishu", "lat": 0.7333, "lon": 35.4000},
    "soy": {"name": "Soy", "county": "Uasin Gishu", "lat": 0.6833, "lon": 35.1667},
    "turbo": {"name": "Turbo", "county": "Uasin Gishu", "lat": 0.6333, "lon": 35.0500},

    # Kiambu County
    "gatundu_north": {"name": "Gatundu North", "county": "Kiambu", "lat": -0.9667, "lon": 36.9167},
    "gatundu_south": {"name": "Gatundu South", "county": "Kiambu", "lat": -1.0000, "lon": 36.9500},
    "githunguri": {"name": "Githunguri", "county": "Kiambu", "lat": -1.0583, "lon": 36.7778},
    "juja": {"name": "Juja", "county": "Kiambu", "lat": -1.1000, "lon": 37.0167},
    "kabete": {"name": "Kabete", "county": "Kiambu", "lat": -1.2500, "lon": 36.7167},
    "kiambaa": {"name": "Kiambaa", "county": "Kiambu", "lat": -1.1833, "lon": 36.7833},
    "kiambu_town": {"name": "Kiambu Town", "county": "Kiambu", "lat": -1.1714, "lon": 36.8356},
    "kikuyu": {"name": "Kikuyu", "county": "Kiambu", "lat": -1.2444, "lon": 36.6631},
    "lari": {"name": "Lari", "county": "Kiambu", "lat": -0.9833, "lon": 36.6500},
    "limuru": {"name": "Limuru", "county": "Kiambu", "lat": -1.1167, "lon": 36.6500},
    "ruiru": {"name": "Ruiru", "county": "Kiambu", "lat": -1.1467, "lon": 36.9604},
    "thika_town": {"name": "Thika Town", "county": "Kiambu", "lat": -1.0333, "lon": 37.0667},

    # Machakos County
    "kangundo": {"name": "Kangundo", "county": "Machakos", "lat": -1.3000, "lon": 37.3500},
    "kathiani": {"name": "Kathiani", "county": "Machakos", "lat": -1.4333, "lon": 37.4000},
    "machakos_town": {"name": "Machakos Town", "county": "Machakos", "lat": -1.5177, "lon": 37.2634},
    "masinga": {"name": "Masinga", "county": "Machakos", "lat": -0.9667, "lon": 37.6000},
    "matungulu": {"name": "Matungulu", "county": "Machakos", "lat": -1.2167, "lon": 37.2667},
    "mavoko": {"name": "Mavoko", "county": "Machakos", "lat": -1.4384, "lon": 36.9602},
    "mwala": {"name": "Mwala", "county": "Machakos", "lat": -1.5500, "lon": 37.4500},
    "yatta": {"name": "Yatta", "county": "Machakos", "lat": -1.1500, "lon": 37.6333},

    # Meru County
    "buuri": {"name": "Buuri", "county": "Meru", "lat": 0.1500, "lon": 37.4833},
    "igembe_central": {"name": "Igembe Central", "county": "Meru", "lat": 0.2833, "lon": 37.9167},
    "igembe_north": {"name": "Igembe North", "county": "Meru", "lat": 0.4333, "lon": 37.9667},
    "igembe_south": {"name": "Igembe South", "county": "Meru", "lat": 0.2167, "lon": 37.9000},
    "imenti_central": {"name": "Imenti Central", "county": "Meru", "lat": -0.0667, "lon": 37.6000},
    "imenti_north": {"name": "Imenti North", "county": "Meru", "lat": 0.0500, "lon": 37.6500},
    "imenti_south": {"name": "Imenti South", "county": "Meru", "lat": -0.1333, "lon": 37.6500},
    "tigania_east": {"name": "Tigania East", "county": "Meru", "lat": 0.2500, "lon": 37.7833},
    "tigania_west": {"name": "Tigania West", "county": "Meru", "lat": 0.1833, "lon": 37.6833},

    # Kakamega County
    "butere": {"name": "Butere", "county": "Kakamega", "lat": 0.2083, "lon": 34.4889},
    "ikolomani": {"name": "Ikolomani", "county": "Kakamega", "lat": 0.2167, "lon": 34.7333},
    "khwisero": {"name": "Khwisero", "county": "Kakamega", "lat": 0.1833, "lon": 34.5500},
    "likuyani": {"name": "Likuyani", "county": "Kakamega", "lat": 0.7000, "lon": 35.1333},
    "lugari": {"name": "Lugari", "county": "Kakamega", "lat": 0.6333, "lon": 34.9833},
    "lurambi": {"name": "Lurambi", "county": "Kakamega", "lat": 0.2849, "lon": 34.7519},
    "malava": {"name": "Malava", "county": "Kakamega", "lat": 0.4500, "lon": 34.8500},
    "matungu": {"name": "Matungu", "county": "Kakamega", "lat": 0.3500, "lon": 34.4667},
    "mumias_east": {"name": "Mumias East", "county": "Kakamega", "lat": 0.3333, "lon": 34.5500},
    "mumias_west": {"name": "Mumias West", "county": "Kakamega", "lat": 0.3353, "lon": 34.4864},
    "navakholo": {"name": "Navakholo", "county": "Kakamega", "lat": 0.4167, "lon": 34.6667},
    "shinyalu": {"name": "Shinyalu", "county": "Kakamega", "lat": 0.2167, "lon": 34.8167},

    # Kilifi County
    "ganze": {"name": "Ganze", "county": "Kilifi", "lat": -3.4500, "lon": 39.7333},
    "kaloleni": {"name": "Kaloleni", "county": "Kilifi", "lat": -3.8000, "lon": 39.6500},
    "kilifi_north": {"name": "Kilifi North", "county": "Kilifi", "lat": -3.6307, "lon": 39.8499},
    "kilifi_south": {"name": "Kilifi South", "county": "Kilifi", "lat": -3.8833, "lon": 39.8000},
    "magarini": {"name": "Magarini", "county": "Kilifi", "lat": -2.9833, "lon": 40.0167},
    "malindi_constituency": {"name": "Malindi", "county": "Kilifi", "lat": -3.2176, "lon": 40.1164},
    "rabai": {"name": "Rabai", "county": "Kilifi", "lat": -3.9333, "lon": 39.5667},

    # Garissa County
    "garissa_township": {"name": "Garissa Township", "county": "Garissa", "lat": -0.4530, "lon": 39.6460},
    "balambala": {"name": "Balambala", "county": "Garissa", "lat": -0.0500, "lon": 39.0833},
    "lagdera": {"name": "Lagdera", "county": "Garissa", "lat": 0.3500, "lon": 39.7500},
    "dadaab": {"name": "Dadaab", "county": "Garissa", "lat": 0.0833, "lon": 40.3000},
    "fafi": {"name": "Fafi", "county": "Garissa", "lat": -0.6000, "lon": 40.2333},
    "ijara": {"name": "Ijara", "county": "Garissa", "lat": -1.6000, "lon": 40.5167},

    # Nyeri County
    "kieni": {"name": "Kieni", "county": "Nyeri", "lat": -0.2833, "lon": 36.9833},
    "mathira": {"name": "Mathira", "county": "Nyeri", "lat": -0.4667, "lon": 37.1333},
    "mukurweini": {"name": "Mukurweini", "county": "Nyeri", "lat": -0.5667, "lon": 37.0500},
    "nyeri_town": {"name": "Nyeri Town", "county": "Nyeri", "lat": -0.4167, "lon": 36.9500},
    "othaya": {"name": "Othaya", "county": "Nyeri", "lat": -0.5472, "lon": 36.9458},
    "tetu": {"name": "Tetu", "county": "Nyeri", "lat": -0.4333, "lon": 36.8833},

    # Kericho County
    "ainamoi": {"name": "Ainamoi", "county": "Kericho", "lat": -0.3677, "lon": 35.2831},
    "belgut": {"name": "Belgut", "county": "Kericho", "lat": -0.4833, "lon": 35.2667},
    "bureti": {"name": "Bureti", "county": "Kericho", "lat": -0.5500, "lon": 35.1500},
    "kipkelion_east": {"name": "Kipkelion East", "county": "Kericho", "lat": -0.2167, "lon": 35.5333},
    "kipkelion_west": {"name": "Kipkelion West", "county": "Kericho", "lat": -0.2333, "lon": 35.3833},
    "sigowet_soin": {"name": "Sigowet–Soin", "county": "Kericho", "lat": -0.3500, "lon": 35.1333},

    # Trans Nzoia County
    "cherangany": {"name": "Cherangany", "county": "Trans Nzoia", "lat": 1.0500, "lon": 35.2333},
    "endebess": {"name": "Endebess", "county": "Trans Nzoia", "lat": 1.0833, "lon": 34.8500},
    "kwanza": {"name": "Kwanza", "county": "Trans Nzoia", "lat": 1.1667, "lon": 34.9833},
    "saboti": {"name": "Saboti", "county": "Trans Nzoia", "lat": 1.0157, "lon": 35.0066},
    "kiminini": {"name": "Kiminini", "county": "Trans Nzoia", "lat": 0.8833, "lon": 34.9167},

    # Kisii County
    "bobasi": {"name": "Bobasi", "county": "Kisii", "lat": -0.8167, "lon": 34.7833},
    "bonchari": {"name": "Bonchari", "county": "Kisii", "lat": -0.7333, "lon": 34.6833},
    "bomachoge_borabu": {"name": "Bomachoge Borabu", "county": "Kisii", "lat": -0.8667, "lon": 34.8167},
    "bomachoge_chache": {"name": "Bomachoge Chache", "county": "Kisii", "lat": -0.7833, "lon": 34.7333},
    "kitutu_chache_north": {"name": "Kitutu Chache North", "county": "Kisii", "lat": -0.5333, "lon": 34.8333},
    "kitutu_chache_south": {"name": "Kitutu Chache South", "county": "Kisii", "lat": -0.6818, "lon": 34.7667},
    "nyaribari_chache": {"name": "Nyaribari Chache", "county": "Kisii", "lat": -0.7000, "lon": 34.8000},
    "nyaribari_masaba": {"name": "Nyaribari Masaba", "county": "Kisii", "lat": -0.7500, "lon": 34.8833},
    "south_mugirango": {"name": "South Mugirango", "county": "Kisii", "lat": -0.8500, "lon": 34.6667},

    # Turkana County
    "loima": {"name": "Loima", "county": "Turkana", "lat": 2.9167, "lon": 35.1333},
    "turkana_central": {"name": "Turkana Central", "county": "Turkana", "lat": 3.1167, "lon": 35.6000},
    "turkana_east": {"name": "Turkana East", "county": "Turkana", "lat": 2.2167, "lon": 36.1500},
    "turkana_north": {"name": "Turkana North", "county": "Turkana", "lat": 4.2500, "lon": 35.8500},
    "turkana_south": {"name": "Turkana South", "county": "Turkana", "lat": 2.1500, "lon": 35.8000},
    "turkana_west": {"name": "Turkana West", "county": "Turkana", "lat": 3.7500, "lon": 34.6000},

    # Mandera County
    "banissa": {"name": "Banissa", "county": "Mandera", "lat": 3.9333, "lon": 40.5667},
    "lafey": {"name": "Lafey", "county": "Mandera", "lat": 3.1500, "lon": 41.8333},
    "mandera_east": {"name": "Mandera East", "county": "Mandera", "lat": 3.9373, "lon": 41.8569},
    "mandera_north": {"name": "Mandera North", "county": "Mandera", "lat": 3.7333, "lon": 41.1333},
    "mandera_south": {"name": "Mandera South", "county": "Mandera", "lat": 2.8500, "lon": 40.8500},
    "mandera_west": {"name": "Mandera West", "county": "Mandera", "lat": 3.4167, "lon": 40.3500},

    # Marsabit County
    "laisamis": {"name": "Laisamis", "county": "Marsabit", "lat": 1.6000, "lon": 37.8000},
    "moyale": {"name": "Moyale", "county": "Marsabit", "lat": 3.5167, "lon": 39.0500},
    "north_horr": {"name": "North Horr", "county": "Marsabit", "lat": 3.3167, "lon": 37.0667},
    "saku": {"name": "Saku", "county": "Marsabit", "lat": 2.3284, "lon": 37.9899},

    # Wajir County
    "eldas": {"name": "Eldas", "county": "Wajir", "lat": 2.3333, "lon": 39.5833},
    "tarbaj": {"name": "Tarbaj", "county": "Wajir", "lat": 2.2000, "lon": 40.1667},
    "wajir_east": {"name": "Wajir East", "county": "Wajir", "lat": 1.7500, "lon": 40.0500},
    "wajir_north": {"name": "Wajir North", "county": "Wajir", "lat": 3.0333, "lon": 39.6333},
    "wajir_south": {"name": "Wajir South", "county": "Wajir", "lat": 1.1667, "lon": 40.2500},
    "wajir_west": {"name": "Wajir West", "county": "Wajir", "lat": 1.7500, "lon": 39.5333},

    # West Pokot County
    "kapenguria": {"name": "Kapenguria", "county": "West Pokot", "lat": 1.2333, "lon": 35.1167},
    "kacheliba": {"name": "Kacheliba", "county": "West Pokot", "lat": 1.5167, "lon": 35.0000},
    "pokot_south": {"name": "Pokot South", "county": "West Pokot", "lat": 1.1667, "lon": 35.4000},
    "sigor": {"name": "Sigor", "county": "West Pokot", "lat": 1.4833, "lon": 35.4667},

    # Samburu County
    "samburu_east": {"name": "Samburu East", "county": "Samburu", "lat": 0.9833, "lon": 37.3333},
    "samburu_north": {"name": "Samburu North", "county": "Samburu", "lat": 1.8333, "lon": 36.9500},
    "samburu_west": {"name": "Samburu West", "county": "Samburu", "lat": 1.2167, "lon": 36.9500},

    # Elgeyo-Marakwet County
    "keiyo_north": {"name": "Keiyo North", "county": "Elgeyo-Marakwet", "lat": 0.6721, "lon": 35.5350},
    "keiyo_south": {"name": "Keiyo South", "county": "Elgeyo-Marakwet", "lat": 0.4000, "lon": 35.5500},
    "marakwet_east": {"name": "Marakwet East", "county": "Elgeyo-Marakwet", "lat": 1.1167, "lon": 35.6167},
    "marakwet_west": {"name": "Marakwet West", "county": "Elgeyo-Marakwet", "lat": 0.9167, "lon": 35.4833},

    # Nandi County
    "aldai": {"name": "Aldai", "county": "Nandi", "lat": 0.0833, "lon": 35.0167},
    "chesumei": {"name": "Chesumei", "county": "Nandi", "lat": 0.2667, "lon": 35.1000},
    "emgwen": {"name": "Emgwen", "county": "Nandi", "lat": 0.1836, "lon": 35.1269},
    "mosop": {"name": "Mosop", "county": "Nandi", "lat": 0.4167, "lon": 35.1500},
    "nandi_hills": {"name": "Nandi Hills", "county": "Nandi", "lat": 0.1000, "lon": 35.1833},
    "tindiret": {"name": "Tindiret", "county": "Nandi", "lat": 0.0000, "lon": 35.2667},

    # Baringo County
    "baringo_central": {"name": "Baringo Central", "county": "Baringo", "lat": 0.4905, "lon": 35.7441},
    "baringo_north": {"name": "Baringo North", "county": "Baringo", "lat": 0.7833, "lon": 35.8000},
    "baringo_south": {"name": "Baringo South", "county": "Baringo", "lat": 0.4833, "lon": 36.0000},
    "eldama_ravine": {"name": "Eldama Ravine", "county": "Baringo", "lat": 0.0500, "lon": 35.7333},
    "mogotio": {"name": "Mogotio", "county": "Baringo", "lat": 0.0333, "lon": 35.9667},
    "tiaty": {"name": "Tiaty", "county": "Baringo", "lat": 1.1333, "lon": 36.0833},

    # Laikipia County
    "laikipia_east": {"name": "Laikipia East", "county": "Laikipia", "lat": 0.0167, "lon": 37.0667},
    "laikipia_north": {"name": "Laikipia North", "county": "Laikipia", "lat": 0.4667, "lon": 36.9500},
    "laikipia_west": {"name": "Laikipia West", "county": "Laikipia", "lat": 0.3606, "lon": 36.7820},

    # Narok County
    "narok_east": {"name": "Narok East", "county": "Narok", "lat": -1.0333, "lon": 36.1667},
    "narok_north": {"name": "Narok North", "county": "Narok", "lat": -1.0833, "lon": 35.8667},
    "narok_south": {"name": "Narok South", "county": "Narok", "lat": -1.2500, "lon": 35.8333},
    "narok_west": {"name": "Narok West", "county": "Narok", "lat": -1.1667, "lon": 35.3333},
    "kilgoris": {"name": "Kilgoris", "county": "Narok", "lat": -1.0000, "lon": 34.8833},
    "emurua_dikirr": {"name": "Emurua Dikirr", "county": "Narok", "lat": -0.8833, "lon": 35.3833},

    # Kajiado County
    "kajiado_central": {"name": "Kajiado Central", "county": "Kajiado", "lat": -1.8524, "lon": 36.7768},
    "kajiado_east": {"name": "Kajiado East", "county": "Kajiado", "lat": -1.8167, "lon": 37.0333},
    "kajiado_north": {"name": "Kajiado North", "county": "Kajiado", "lat": -1.3833, "lon": 36.6500},
    "kajiado_south": {"name": "Kajiado South", "county": "Kajiado", "lat": -2.5000, "lon": 37.4833},
    "kajiado_west": {"name": "Kajiado West", "county": "Kajiado", "lat": -1.7167, "lon": 36.3333},

    # Bomet County
    "bomet_central": {"name": "Bomet Central", "county": "Bomet", "lat": -0.7813, "lon": 35.3416},
    "bomet_east": {"name": "Bomet East", "county": "Bomet", "lat": -0.8333, "lon": 35.4167},
    "chepalungu": {"name": "Chepalungu", "county": "Bomet", "lat": -0.8833, "lon": 35.2333},
    "konoin": {"name": "Konoin", "county": "Bomet", "lat": -0.6167, "lon": 35.2667},
    "sotik": {"name": "Sotik", "county": "Bomet", "lat": -0.6833, "lon": 35.1167},

    # Nyandarua County
    "kinangop": {"name": "Kinangop", "county": "Nyandarua", "lat": -0.7500, "lon": 36.6333},
    "kipipiri": {"name": "Kipipiri", "county": "Nyandarua", "lat": -0.4500, "lon": 36.5333},
    "ndaragua": {"name": "Ndaragua", "county": "Nyandarua", "lat": -0.0167, "lon": 36.5667},
    "ol_kalou": {"name": "Ol Kalou", "county": "Nyandarua", "lat": -0.1804, "lon": 36.5230},
    "ol_jorok": {"name": "Ol Jorok", "county": "Nyandarua", "lat": -0.1333, "lon": 36.3667},

    # Kirinyaga County
    "gichugu": {"name": "Gichugu", "county": "Kirinyaga", "lat": -0.4500, "lon": 37.3333},
    "kirinyaga_central": {"name": "Kirinyaga Central", "county": "Kirinyaga", "lat": -0.4989, "lon": 37.2803},
    "mwea": {"name": "Mwea", "county": "Kirinyaga", "lat": -0.7167, "lon": 37.3500},
    "ndia": {"name": "Ndia", "county": "Kirinyaga", "lat": -0.5333, "lon": 37.1667},

    # Murang'a County
    "gatanga": {"name": "Gatanga", "county": "Murang'a", "lat": -0.9833, "lon": 37.0333},
    "kandara": {"name": "Kandara", "county": "Murang'a", "lat": -0.9000, "lon": 37.0000},
    "kangema": {"name": "Kangema", "county": "Murang'a", "lat": -0.6833, "lon": 36.9667},
    "kigumo": {"name": "Kigumo", "county": "Murang'a", "lat": -0.8333, "lon": 36.9667},
    "kiharu": {"name": "Kiharu", "county": "Murang'a", "lat": -0.7210, "lon": 37.1526},
    "maragua": {"name": "Maragua", "county": "Murang'a", "lat": -0.7833, "lon": 37.1333},
    "mathioya": {"name": "Mathioya", "county": "Murang'a", "lat": -0.6167, "lon": 36.9833},

    # Kitui County
    "kitui_central": {"name": "Kitui Central", "county": "Kitui", "lat": -1.3670, "lon": 38.0106},
    "kitui_east": {"name": "Kitui East", "county": "Kitui", "lat": -1.4167, "lon": 38.3833},
    "kitui_rural": {"name": "Kitui Rural", "county": "Kitui", "lat": -1.5000, "lon": 37.9167},
    "kitui_south": {"name": "Kitui South", "county": "Kitui", "lat": -2.0000, "lon": 38.2500},
    "mwingi_central": {"name": "Mwingi Central", "county": "Kitui", "lat": -0.9333, "lon": 38.0667},
    "mwingi_north": {"name": "Mwingi North", "county": "Kitui", "lat": -0.4667, "lon": 38.1500},
    "mwingi_west": {"name": "Mwingi West", "county": "Kitui", "lat": -0.9167, "lon": 37.8833},
    "kitui_west": {"name": "Kitui West", "county": "Kitui", "lat": -1.2500, "lon": 37.8667},

    # Makueni County
    "kaiti": {"name": "Kaiti", "county": "Makueni", "lat": -1.7500, "lon": 37.4500},
    "kibwezi_east": {"name": "Kibwezi East", "county": "Makueni", "lat": -2.4167, "lon": 38.1667},
    "kibwezi_west": {"name": "Kibwezi West", "county": "Makueni", "lat": -2.4167, "lon": 37.9667},
    "kilome": {"name": "Kilome", "county": "Makueni", "lat": -1.8000, "lon": 37.2000},
    "makueni_constituency": {"name": "Makueni", "county": "Makueni", "lat": -1.8037, "lon": 37.6203},
    "mbooni": {"name": "Mbooni", "county": "Makueni", "lat": -1.6333, "lon": 37.4500},

    # Kwale County
    "kinango": {"name": "Kinango", "county": "Kwale", "lat": -4.1333, "lon": 39.3167},
    "lunga_lunga": {"name": "Lunga Lunga", "county": "Kwale", "lat": -4.5500, "lon": 39.1167},
    "matuga": {"name": "Matuga", "county": "Kwale", "lat": -4.1737, "lon": 39.4521},
    "msambweni": {"name": "Msambweni", "county": "Kwale", "lat": -4.4667, "lon": 39.4833},

    # Taita-Taveta County
    "mwatate": {"name": "Mwatate", "county": "Taita-Taveta", "lat": -3.5000, "lon": 38.3833},
    "taveta": {"name": "Taveta", "county": "Taita-Taveta", "lat": -3.4000, "lon": 37.6833},
    "voi": {"name": "Voi", "county": "Taita-Taveta", "lat": -3.3961, "lon": 38.5561},
    "wundanyi": {"name": "Wundanyi", "county": "Taita-Taveta", "lat": -3.3167, "lon": 38.3500},

    # Tana River County
    "bura": {"name": "Bura", "county": "Tana River", "lat": -1.1833, "lon": 39.9167},
    "galole": {"name": "Galole", "county": "Tana River", "lat": -1.5000, "lon": 39.5000},
    "garsen": {"name": "Garsen", "county": "Tana River", "lat": -2.2667, "lon": 40.1167},

    # Lamu County
    "lamu_east": {"name": "Lamu East", "county": "Lamu", "lat": -2.1333, "lon": 41.0500},
    "lamu_west": {"name": "Lamu West", "county": "Lamu", "lat": -2.2686, "lon": 40.9006},

    # Tharaka-Nithi County
    "chuka_igambangombe": {"name": "Chuka/Igambang'ombe", "county": "Tharaka-Nithi", "lat": -0.3333, "lon": 37.6500},
    "maara": {"name": "Maara", "county": "Tharaka-Nithi", "lat": -0.2333, "lon": 37.6000},
    "tharaka": {"name": "Tharaka", "county": "Tharaka-Nithi", "lat": -0.3000, "lon": 37.9000},

    # Bungoma County
    "bumula": {"name": "Bumula", "county": "Bungoma", "lat": 0.5167, "lon": 34.4333},
    "kabuchai": {"name": "Kabuchai", "county": "Bungoma", "lat": 0.6500, "lon": 34.5167},
    "kanduyi": {"name": "Kanduyi", "county": "Bungoma", "lat": 0.5635, "lon": 34.5606},
    "kimilili": {"name": "Kimilili", "county": "Bungoma", "lat": 0.7833, "lon": 34.7167},
    "mt_elgon": {"name": "Mt. Elgon", "county": "Bungoma", "lat": 0.8667, "lon": 34.5500},
    "sirisia": {"name": "Sirisia", "county": "Bungoma", "lat": 0.7167, "lon": 34.4500},
    "tongaren": {"name": "Tongaren", "county": "Bungoma", "lat": 0.8333, "lon": 35.0167},
    "webuye_east": {"name": "Webuye East", "county": "Bungoma", "lat": 0.6000, "lon": 34.7833},
    "webuye_west": {"name": "Webuye West", "county": "Bungoma", "lat": 0.6167, "lon": 34.7000},

    # Busia County
    "budalangi": {"name": "Budalangi", "county": "Busia", "lat": 0.1500, "lon": 34.0000},
    "butula": {"name": "Butula", "county": "Busia", "lat": 0.3500, "lon": 34.2500},
    "funyula": {"name": "Funyula", "county": "Busia", "lat": 0.2500, "lon": 34.1167},
    "nambale": {"name": "Nambale", "county": "Busia", "lat": 0.4500, "lon": 34.2500},
    "teso_north": {"name": "Teso North", "county": "Busia", "lat": 0.6667, "lon": 34.2833},
    "teso_south": {"name": "Teso South", "county": "Busia", "lat": 0.5333, "lon": 34.2333},
    "matayos": {"name": "Matayos", "county": "Busia", "lat": 0.4608, "lon": 34.1115},

    # Siaya County
    "alego_usonga": {"name": "Alego Usonga", "county": "Siaya", "lat": -0.0607, "lon": 34.2874},
    "bondo": {"name": "Bondo", "county": "Siaya", "lat": -0.2386, "lon": 34.2694},
    "gem": {"name": "Gem", "county": "Siaya", "lat": 0.0000, "lon": 34.4500},
    "rarieda": {"name": "Rarieda", "county": "Siaya", "lat": -0.3167, "lon": 34.3667},
    "ugenya": {"name": "Ugenya", "county": "Siaya", "lat": 0.2000, "lon": 34.2667},
    "ugunja": {"name": "Ugunja", "county": "Siaya", "lat": 0.1667, "lon": 34.3000},

    # Homa Bay County
    "homa_bay_town": {"name": "Homa Bay Town", "county": "Homa Bay", "lat": -0.5273, "lon": 34.4571},
    "kabondo_kasipul": {"name": "Kabondo Kasipul", "county": "Homa Bay", "lat": -0.4167, "lon": 34.8500},
    "karachuonyo": {"name": "Karachuonyo", "county": "Homa Bay", "lat": -0.3833, "lon": 34.6167},
    "kasipul": {"name": "Kasipul", "county": "Homa Bay", "lat": -0.4667, "lon": 34.7833},
    "mbita": {"name": "Mbita", "county": "Homa Bay", "lat": -0.4333, "lon": 34.2000},
    "ndhiwa": {"name": "Ndhiwa", "county": "Homa Bay", "lat": -0.7333, "lon": 34.3667},
    "rangwe": {"name": "Rangwe", "county": "Homa Bay", "lat": -0.6167, "lon": 34.5167},
    "suba_north": {"name": "Suba North", "county": "Homa Bay", "lat": -0.5000, "lon": 34.1500},
    "suba_south": {"name": "Suba South", "county": "Homa Bay", "lat": -0.6833, "lon": 34.1000},

    # Migori County
    "awendo": {"name": "Awendo", "county": "Migori", "lat": -0.9000, "lon": 34.5333},
    "kuria_east": {"name": "Kuria East", "county": "Migori", "lat": -1.2667, "lon": 34.6833},
    "kuria_west": {"name": "Kuria West", "county": "Migori", "lat": -1.2500, "lon": 34.5000},
    "nyatike": {"name": "Nyatike", "county": "Migori", "lat": -0.9667, "lon": 34.1500},
    "rongo": {"name": "Rongo", "county": "Migori", "lat": -0.7667, "lon": 34.6000},
    "suna_east": {"name": "Suna East", "county": "Migori", "lat": -1.0634, "lon": 34.4731},
    "suna_west": {"name": "Suna West", "county": "Migori", "lat": -1.1000, "lon": 34.4167},
    "uriri": {"name": "Uriri", "county": "Migori", "lat": -0.9667, "lon": 34.4500},

    # Nyamira County
    "borabu": {"name": "Borabu", "county": "Nyamira", "lat": -0.6833, "lon": 35.0333},
    "kitutu_masaba": {"name": "Kitutu Masaba", "county": "Nyamira", "lat": -0.6167, "lon": 34.9500},
    "north_mugirango": {"name": "North Mugirango", "county": "Nyamira", "lat": -0.4500, "lon": 35.0000},
    "west_mugirango": {"name": "West Mugirango", "county": "Nyamira", "lat": -0.5667, "lon": 34.9333},

    # Vihiga County
    "emuhaya": {"name": "Emuhaya", "county": "Vihiga", "lat": 0.0500, "lon": 34.6333},
    "hamisi": {"name": "Hamisi", "county": "Vihiga", "lat": 0.0500, "lon": 34.8000},
    "luanda": {"name": "Luanda", "county": "Vihiga", "lat": 0.0167, "lon": 34.5833},
    "sabatia": {"name": "Sabatia", "county": "Vihiga", "lat": 0.1167, "lon": 34.7667},
    "vihiga_constituency": {"name": "Vihiga", "county": "Vihiga", "lat": 0.0833, "lon": 34.7167},

    # Isiolo County
    "isiolo_north": {"name": "Isiolo North", "county": "Isiolo", "lat": 0.3546, "lon": 37.5820},
    "isiolo_south": {"name": "Isiolo South", "county": "Isiolo", "lat": 0.1667, "lon": 38.2500},
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


LOCATION_ALIASES = {
    "nairobi": "starehe",
    "mombasa": "mvita",
    "kisumu": "kisumu_central",
    "nakuru": "nakuru_city_east",
    "eldoret": "kapseret",
}


def resolve_location_key(location: str) -> Optional[str]:
    """Resolve a location name, display name, county, or alias to a table key."""
    normalized = location.strip().lower().replace("'", "").replace("-", "_")
    if normalized in KENYA_LOCATIONS:
        return normalized
    if normalized in LOCATION_ALIASES:
        return LOCATION_ALIASES[normalized]

    for key, details in KENYA_LOCATIONS.items():
        display_name = details["name"].lower().replace("'", "").replace("-", "_")
        if normalized in {display_name, details["county"].lower().replace(" ", "_")}:
            return key
    return None


def resolve_location_from_coordinates(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """Return the nearest configured Kenyan location for GPS coordinates."""
    try:
        latitude = float(lat)
        longitude = float(lon)
    except (TypeError, ValueError):
        return None

    closest_key = None
    min_distance = float("inf")
    for key, details in KENYA_LOCATIONS.items():
        distance = ((latitude - details["lat"]) ** 2 + (longitude - details["lon"]) ** 2) ** 0.5
        if distance < min_distance:
            min_distance = distance
            closest_key = key

    if closest_key is None:
        return None
    return {"key": closest_key, **KENYA_LOCATIONS[closest_key]}


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
    for location_key in list(KENYA_LOCATIONS) + list(LOCATION_ALIASES):
        if location_key in query_lower:
            return resolve_location_key(location_key)
    
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
            resolved_key = resolve_location_key(location)
            if resolved_key:
                return resolved_key
    
    # Default to Nairobi if no location found
    if any(word in query_lower for word in ["weather", "hali", "mvua", "jua", "kiasi"]):
        return LOCATION_ALIASES["nairobi"]
    
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
    location_key = resolve_location_key(location)
    if location_key:
        coords = KENYA_LOCATIONS[location_key]
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
    location_key = resolve_location_key(location)
    if location_key:
        coords = KENYA_LOCATIONS[location_key]
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
