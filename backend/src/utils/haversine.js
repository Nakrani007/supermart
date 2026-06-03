// Haversine formula — great-circle distance between two lat/lng points in km.
// Used to enforce the store's delivery radius.

const TO_RAD = Math.PI / 180;

/**
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} distance in kilometres
 */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R    = 6371; // Earth mean radius km
  const dLat = (lat2 - lat1) * TO_RAD;
  const dLng = (lng2 - lng1) * TO_RAD;
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * TO_RAD) * Math.cos(lat2 * TO_RAD) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
