(function () {
  function spotMatchesTextureFilter(texture, filter) {
    if (filter === "all") return true;
    const value = texture.toLowerCase();
    if (filter === "monotone") return value.includes("monotone");
    if (filter === "paired") return value.includes("paired") || value.includes("pairing");
    if (filter === "flush") return value.includes("flush");
    if (filter === "connected") return value.includes("connected");
    if (filter === "dry") return value.includes("dry") || value.includes("brick") || value.includes("blank");
    if (filter === "wet") return value.includes("wet");
    return false;
  }

  function spotMatchesFilters(preset, filters) {
    const streetMatches = filters.street === "all" || preset.street === filters.street;
    const textureMatches = spotMatchesTextureFilter(preset.texture, filters.texture);
    return streetMatches && textureMatches;
  }

  function spotBrowserCountLabel(count, filters) {
    if (filters.street !== "all" && filters.texture === "all") return `${count} ${filters.street} spots`;
    return `${count} spots`;
  }

  window.PokerGtoSpotFilters = {
    spotBrowserCountLabel,
    spotMatchesFilters,
    spotMatchesTextureFilter,
  };
})();
