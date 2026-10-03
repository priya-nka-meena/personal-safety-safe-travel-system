import { useEffect, useState } from "react";
import { reverseGeocode } from "../../utils/reverseGeocode";

const LocationName = ({ latitude, longitude }) => {
  const [label, setLabel] = useState("…");
  const roundedLat = latitude == null ? null : Number(latitude).toFixed(3);
  const roundedLon = longitude == null ? null : Number(longitude).toFixed(3);

  useEffect(() => {
    let cancelled = false;

    if (roundedLat == null || roundedLon == null) {
      setLabel("Location unavailable");
      return undefined;
    }

    reverseGeocode(roundedLat, roundedLon).then((name) => {
      if (!cancelled) {
        setLabel(name);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [roundedLat, roundedLon]);

  return label;
};

export default LocationName;
