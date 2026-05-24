(function () {
  async function loadSpotPresets(sourceUrl = "./data/spot_presets.json") {
    const response = await fetch(sourceUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return Object.fromEntries(data.spots.map((preset) => [preset.id, preset]));
  }

  window.PokerGtoSpotPresets = {
    loadSpotPresets,
  };
})();
