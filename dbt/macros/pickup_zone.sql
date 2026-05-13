{% macro pickup_zone(lon, lat) %}
  CASE
    WHEN {{ lon }} BETWEEN -73.83 AND -73.74 AND {{ lat }} BETWEEN 40.62 AND 40.67 THEN 'jfk'
    WHEN {{ lon }} BETWEEN -73.89 AND -73.85 AND {{ lat }} BETWEEN 40.76 AND 40.79 THEN 'lga'
    WHEN {{ lon }} BETWEEN -74.20 AND -74.16 AND {{ lat }} BETWEEN 40.67 AND 40.71 THEN 'ewr'
    WHEN {{ lon }} BETWEEN -74.02 AND -73.93 AND {{ lat }} BETWEEN 40.70 AND 40.88 THEN 'manhattan'
    WHEN {{ lon }} BETWEEN -74.05 AND -73.83 AND {{ lat }} BETWEEN 40.57 AND 40.74 THEN 'brooklyn'
    ELSE 'other'
  END
{% endmacro %}
