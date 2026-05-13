export interface RideEvent {
  key: string;
  pickup_datetime: string;
  pickup_zone: string;
  pickup_hour: number;
  pickup_dow: number;
  pickup_month: number;
  passenger_count: number;
  fare_amount: number;
  trip_distance_km: number;
  trip_distance_manhattan_km: number;
}

export interface ZoneStat {
  pickup_zone: string;
  total_rides: number;
  avg_fare: number;
  total_revenue: number;
  avg_distance_km: number;
  avg_passengers: number;
}

export interface HourStat {
  pickup_hour: number;
  total_rides: number;
  avg_fare: number;
  total_revenue: number;
  avg_distance_km: number;
  avg_fare_per_km: number;
}

export interface Prediction {
  trip_distance_km: number;
  pickup_hour: number;
  pickup_dow: number;
  passenger_count: number;
  pickup_zone_enc: number;
  fare_amount_actual: number;
  fare_amount_predicted: number;
  abs_error: number;
}

export interface OverviewStat {
  total_rides: number;
  avg_fare: number;
  median_fare: number;
  total_revenue: number;
  avg_distance_km: number;
  fare_per_km: number;
  avg_passenger_count: number;
  airport_trips_pct: number;
  rush_hour_pct: number;
  night_shift_pct: number;
  weekend_pct: number;
}

export interface MonthStat {
  pickup_year: number;
  pickup_month: number;
  total_rides: number;
  avg_fare: number;
  total_revenue: number;
  avg_distance_km: number;
  airport_trips: number;
  weekend_trips: number;
  night_shift_trips: number;
}

export interface DowStat {
  pickup_dow: number;
  total_rides: number;
  avg_fare: number;
  total_revenue: number;
  avg_distance_km: number;
  airport_trips: number;
  rush_hour_trips: number;
  night_shift_trips: number;
}

export interface Filters {
  startDate: string;
  endDate: string;
  zone: string;
}
