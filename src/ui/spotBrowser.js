(function () {
  const { spotBrowserCountLabel, spotMatchesFilters } = window.PokerGtoSpotFilters;

  function createSpotBrowser({ select, count, cards, streetFilter, textureFilter, onSelect }) {
    let presets = {};
    const filters = { street: "all", texture: "all" };

    function updateActive(selectedPreset) {
      cards.querySelectorAll(".spot-card").forEach((button) => {
        button.classList.toggle("active", button.dataset.preset === selectedPreset);
      });
    }

    function renderOptions() {
      select.innerHTML = '<option value="">Custom spot</option>';
      Object.entries(presets).forEach(([key, preset]) => {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = preset.name;
        select.appendChild(option);
      });
    }

    function renderCards() {
      cards.innerHTML = "";
      if (!Object.keys(presets).length) {
        count.textContent = "0 spots";
        return;
      }

      const filteredPresets = Object.entries(presets).filter(([, preset]) => spotMatchesFilters(preset, filters));
      count.textContent = spotBrowserCountLabel(filteredPresets.length, filters);
      filteredPresets.forEach(([key, preset]) => {
        const button = document.createElement("button");
        button.className = "spot-card";
        button.type = "button";
        button.dataset.preset = key;
        button.innerHTML = `
          <span>${preset.street}</span>
          <strong>${preset.spot}</strong>
          <small>${preset.texture}</small>
          <b>${preset.stack}bb stack / ${preset.pot}bb pot</b>
        `;
        button.addEventListener("click", () => {
          select.value = key;
          onSelect(key);
        });
        cards.appendChild(button);
      });
      updateActive(select.value);
    }

    function setPresets(nextPresets) {
      presets = nextPresets;
      renderOptions();
      renderCards();
    }

    function updateFilters() {
      filters.street = streetFilter.value;
      filters.texture = textureFilter.value;
      renderCards();
    }

    select.addEventListener("change", () => onSelect(select.value));
    streetFilter.addEventListener("change", updateFilters);
    textureFilter.addEventListener("change", updateFilters);

    return { renderCards, setPresets, updateActive };
  }

  window.PokerGtoSpotBrowser = {
    createSpotBrowser,
  };
})();
