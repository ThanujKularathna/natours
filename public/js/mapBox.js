/* eslint-disable */

export const displayMap = (locations) => {
  const mapBoxKey = document.getElementById('map').dataset.mapboxkey;
  mapboxgl.accessToken = mapBoxKey;

  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/thanuj11/cmaaytd3t00jv01sd2ttp6jut',
    scrollZoom: false,
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    //add marker
    const el = document.createElement('div');
    el.className = 'marker';

    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    //add popup
    new mapboxgl.Popup({ offset: 30 })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });
};
