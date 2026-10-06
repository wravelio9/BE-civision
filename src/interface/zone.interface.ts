// Interface/tipe untuk src/service/zone.service.ts

export type LngLat = [number, number]; // [lng, lat] mengikuti standar GeoJSON/Leaflet

export interface ZoneInput {
  name: string;
  points: LngLat[];
}

export type ZoneValidationError =
  | "name_required"
  | "too_few_points"
  | "self_intersecting"
  | "max_zones_reached";
