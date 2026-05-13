{% macro manhattan_km(lat1, lon1, lat2, lon2) %}
  (ABS({{ lat2 }} - {{ lat1 }}) + ABS({{ lon2 }} - {{ lon1 }})) * 111.32
{% endmacro %}
