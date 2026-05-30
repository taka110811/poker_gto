(function () {
  async function loadPreflopSpots(sourceUrl = "./data/preflop_spots.json") {
    const response = await fetch(sourceUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return Object.fromEntries(data.spots.map((spot) => [spot.id, spot]));
  }

  window.PokerGtoPreflopSpots = {
    loadPreflopSpots,
  };
})();
