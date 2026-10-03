const cache = new Map();

const ADDRESS_KEYS = [
  "amenity",
  "building",
  "university",
  "college",
  "suburb",
  "neighbourhood",
  "village",
  "town",
  "city",
  "state",
  "country",
];

export function geocodeCacheKey(latitude, longitude) {
  return `${Number(latitude).toFixed(3)},${Number(longitude).toFixed(3)}`;
}

function formatAddress(data) {
  const address = data?.address || {};
  const parts = [];
  for (const key of ADDRESS_KEYS) {
    const value = address[key];
    if (value && !parts.includes(value)) {
      parts.push(value);
    }
  }
  if (parts.length > 0) {
    return parts.slice(0, 3).join(", ");
  }
  if (data?.display_name) {
    return data.display_name
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 3)
      .join(", ");
  }
  return null;
}

export async function reverseGeocode(latitude, longitude) {
  if (latitude == null || longitude == null || Number.isNaN(Number(latitude)) || Number.isNaN(Number(longitude))) {
    return "Location unavailable";
  }

  const key = geocodeCacheKey(latitude, longitude);
  const cached = cache.get(key);
  if (typeof cached === "string") {
    return cached;
  }
  if (cached) {
    return cached;
  }

  const request = (async () => {
    try {
      const params = new URLSearchParams({
        lat: String(latitude),
        lon: String(longitude),
        format: "json",
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        return "Location unavailable";
      }
      const data = await response.json();
      return formatAddress(data) || "Location unavailable";
    } catch {
      return "Location unavailable";
    }
  })();

  cache.set(key, request);
  const name = await request;
  cache.set(key, name);
  return name;
}
