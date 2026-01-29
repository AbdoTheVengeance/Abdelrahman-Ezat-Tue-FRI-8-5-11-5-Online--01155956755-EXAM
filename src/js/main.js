// global state
const AppState = {
  // current selections
  selectedCountry: {
    code: "EG",
    name: "Egypt",
    flag: "https://flagcdn.com/w80/eg.png",
    capital: "Cairo",
  },
  selectedCity: "Cairo",
  selectedYear: new Date().getFullYear(),

  // cached data
  countries: [],
  holidays: [],
  events: [],
  weather: null,
  exchangeRates: null,

  // saved plans
  savedPlans: JSON.parse(localStorage.getItem("wanderlust_plans")) || [],

  // APIs
  apis: {
    nagerBase: "https://date.nager.at/api/v3",
    restCountries: "https://restcountries.com/v3.1",
    openMeteo: "https://api.open-meteo.com/v1",
    sunriseSunset: "https://api.sunrise-sunset.org/json",
    exchangeRate: "https://api.exchangerate-api.com/v4/latest/USD",
  },

  // initialization
  init() {
    this.updateStats();
    this.loadExchangeRates();
    this.setupEventListeners();
    this.updateDateTime();

    // start clock
    setInterval(() => this.updateDateTime(), 1000);
  },

  // saving plans to localStorage
  saveToStorage() {
    localStorage.setItem("wanderlust_plans", JSON.stringify(this.savedPlans));
    this.updatePlansCounter();
  },

  // add a new plan
  addPlan(type, data) {
    const plan = {
      id: Date.now(),
      type: type,
      data: data,
      savedAt: new Date().toISOString(),
      country: this.selectedCountry.code,
      city: this.selectedCity,
    };

    this.savedPlans.push(plan);
    this.saveToStorage();
    this.showToast(
      `${type.charAt(0).toUpperCase() + type.slice(1)} saved to your plans!`,
      "success",
    );
  },

  // remove a plan
  removePlan(id) {
    this.savedPlans = this.savedPlans.filter((plan) => plan.id !== id);
    this.saveToStorage();
  },

  // clear all plans
  clearAllPlans() {
    this.savedPlans = [];
    this.saveToStorage();
    this.showToast("All plans cleared!", "info");
  },

  // plans counter
  updatePlansCounter() {
    const count = this.savedPlans.length;
    const badge = document.getElementById("plans-count");
    badge.textContent = count;
    badge.classList.toggle("hidden", count === 0);

    // filter counts
    document.getElementById("filter-all-count").textContent = count;
    document.getElementById("filter-holiday-count").textContent =
      this.savedPlans.filter((p) => p.type === "holiday").length;
    document.getElementById("filter-event-count").textContent =
      this.savedPlans.filter((p) => p.type === "event").length;
    document.getElementById("filter-lw-count").textContent =
      this.savedPlans.filter((p) => p.type === "longweekend").length;
  },

  // dashboard stats
  updateStats() {
    document.getElementById("stat-saved").textContent = this.savedPlans.length;
  },

  // toast message
  showToast(message, type = "info") {
    const toastContainer = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
            <div class="toast-content">
                <i class="fa-solid fa-circle-${type === "success" ? "check" : type === "error" ? "exclamation" : "info"}"></i>
                <span>${message}</span>
            </div>
            <button class="toast-close">&times;</button>
        `;

    toastContainer.appendChild(toast);

    // auto remove
    setTimeout(() => {
      toast.classList.add("fade-out");
      setTimeout(() => toast.remove(), 300);
    }, 3000);

    // close button
    toast.querySelector(".toast-close").addEventListener("click", () => {
      toast.classList.add("fade-out");
      setTimeout(() => toast.remove(), 300);
    });
  },

  // update date and time
  updateDateTime() {
    const now = new Date();
    const options = {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };

    const dateTimeStr =
      now.toLocaleDateString("en-US", options) +
      " " +
      now.toLocaleTimeString("en-US", {
        hour12: true,
        hour: "2-digit",
        minute: "2-digit",
      });

    document.getElementById("current-datetime").textContent = dateTimeStr;

    // local time
    const egyptTime = now.toLocaleTimeString("en-US", {
      timeZone: "Africa/Cairo",
      hour12: true,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    document.getElementById("country-local-time").textContent = egyptTime;
  },

  // exchange rates
  async loadExchangeRates() {
    try {
      const response = await fetch(this.apis.exchangeRate);
      const data = await response.json();
      this.exchangeRates = data.rates;
      this.populateCurrencyDropdowns();
    } catch (error) {
      console.log("Using fallback exchange rates");
      this.exchangeRates = {
        USD: 1,
        EGP: 30.9,
        EUR: 0.92,
        GBP: 0.79,
        JPY: 148.5,
        AED: 3.6725,
        SAR: 3.75,
        CAD: 1.35,
        INR: 83.1,
      };
      this.populateCurrencyDropdowns();
    }
  },

  // currency dropdowns
  populateCurrencyDropdowns() {
    const currencyNames = {
      USD: "US Dollar",
      EUR: "Euro",
      GBP: "British Pound",
      JPY: "Japanese Yen",
      EGP: "Egyptian Pound",
      AED: "UAE Dirham",
      SAR: "Saudi Riyal",
      CAD: "Canadian Dollar",
      INR: "Indian Rupee",
    };

    const fromSelect = document.getElementById("currency-from");
    const toSelect = document.getElementById("currency-to");

    // clear existing options except first
    while (fromSelect.options.length > 1) fromSelect.remove(1);
    while (toSelect.options.length > 1) toSelect.remove(1);

    // add options
    Object.entries(currencyNames).forEach(([code, name]) => {
      const fromOption = document.createElement("option");
      fromOption.value = code;
      fromOption.textContent = `${code} - ${name}`;
      fromSelect.appendChild(fromOption.cloneNode(true));

      const toOption = fromOption.cloneNode(true);
      toSelect.appendChild(toOption);
    });

    // default values
    fromSelect.value = "USD";
    toSelect.value = "EGP";
  },

  // setup all event listeners
  setupEventListeners() {
    this.setupNavigation();
    this.setupDashboard();
    this.setupSaveButtons();
    this.setupCurrencyConverter();
    this.setupPlansPage();

    // buy ticket
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("a.btn-buy-ticket");
      if (!btn) return;

      e.preventDefault();

      const card = btn.closest(".event-card");
      const title = card?.querySelector("h3")?.textContent?.trim() || "event";
      const location =
        card?.querySelector(".event-location")?.textContent?.trim() || "";
      const city = this.selectedCity || "";
      const country = this.selectedCountry?.name || "";

      const q = encodeURIComponent(
        `${title} ${location} ${city} ${country} tickets`
          .replace(/\s+/g, " ")
          .trim(),
      );

      window.open(
        `https://www.google.com/search?q=${q}`,
        "_blank",
        "noopener,noreferrer",
      );
    });
  },
};

// navigation system
AppState.setupNavigation = function () {
  // sidebar navigation
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const view = item.getAttribute("data-view");
      this.navigateToView(view);
    });
  });

  // mobile menu
  document.getElementById("mobile-menu-btn").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("mobile-open");
    document.getElementById("sidebar-overlay").classList.toggle("hidden");
  });

  // sidebar overlay
  document.getElementById("sidebar-overlay").addEventListener("click", () => {
    document.getElementById("sidebar").classList.remove("mobile-open");
    document.getElementById("sidebar-overlay").classList.add("hidden");
  });

  // start exploring button
  document
    .getElementById("start-exploring-btn")
    ?.addEventListener("click", () => {
      this.navigateToView("dashboard");
    });

  // clear all plans button
  document
    .getElementById("clear-all-plans-btn")
    ?.addEventListener("click", () => {
      Swal.fire({
        title: "Clear All Plans?",
        text: "This will remove all your saved plans. This action cannot be undone.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes, clear all!",
      }).then((result) => {
        if (result.isConfirmed) {
          this.clearAllPlans();
          this.renderPlans();
        }
      });
    });

  // plan filters
  document.querySelectorAll(".plan-filter").forEach((filter) => {
    filter.addEventListener("click", () => {
      document
        .querySelectorAll(".plan-filter")
        .forEach((f) => f.classList.remove("active"));
      filter.classList.add("active");
      const filterType = filter.getAttribute("data-filter");
      this.renderPlans(filterType);
    });
  });
};

// navigate to a specific view
AppState.navigateToView = function (view) {
  // hide all views
  document
    .querySelectorAll(".view")
    .forEach((v) => v.classList.remove("active"));

  // show target view
  const targetView = document.getElementById(`${view}-view`);
  if (targetView) {
    targetView.classList.add("active");

    // sidebar active state
    document
      .querySelectorAll(".nav-item")
      .forEach((item) => item.classList.remove("active"));
    document.querySelector(`[data-view="${view}"]`).classList.add("active");

    // page title
    this.updatePageTitle(view);

    // view specific data
    this.loadViewData(view);

    // close mobile menu if open
    document.getElementById("sidebar").classList.remove("mobile-open");
    document.getElementById("sidebar-overlay").classList.add("hidden");

    // update url
    window.history.pushState({ view }, "", `/${view}`);
  }
};

// change page title based on view
AppState.updatePageTitle = function (view) {
  const titles = {
    dashboard: "Dashboard",
    holidays: "Public Holidays",
    events: "Events Explorer",
    weather: "Weather Forecast",
    "long-weekends": "Long Weekends",
    currency: "Currency Converter",
    "sun-times": "Sunrise & Sunset",
    "my-plans": "My Saved Plans",
  };

  const pageTitle = document.getElementById("page-title");
  const pageSubtitle = document.getElementById("page-subtitle");

  if (titles[view]) {
    pageTitle.textContent = titles[view];

    // subtitles
    const subtitles = {
      dashboard: "Welcome back! Ready to plan your next adventure?",
      holidays: `Browse public holidays for ${this.selectedCountry.name} and plan your trips around them`,
      events: `Discover concerts, sports, theatre and more in ${this.selectedCity}`,
      weather: `Check 7-day weather forecasts for ${this.selectedCity}`,
      "long-weekends":
        "Find holidays near weekends - perfect for planning mini-trips!",
      currency: "Convert between currencies with live exchange rates",
      "sun-times":
        "Plan your activities around golden hour - perfect for photographers",
      "my-plans":
        "Your saved holidays, events, and trip ideas all in one place",
    };

    pageSubtitle.textContent = subtitles[view] || "";
  }
};

// data for specific views
AppState.loadViewData = async function (view) {
  switch (view) {
    case "holidays":
      await this.loadHolidays();
      break;
    case "events":
      await this.loadEvents();
      break;
    case "weather":
      await this.loadWeather();
      break;
    case "my-plans":
      this.renderPlans();
      break;
  }
};

// dashbpard
AppState.setupDashboard = function () {
  const searchBtn = document.getElementById("global-search-btn");
  const countrySelect = document.getElementById("global-country");
  const citySelect = document.getElementById("global-city");
  const yearSelect = document.getElementById("global-year");
  const clearBtn = document.getElementById("clear-selection-btn");

  // explore button
  searchBtn.addEventListener("click", () => this.handleCountrySearch());

  // clear selection
  clearBtn.addEventListener("click", () => {
    countrySelect.value = "";
    citySelect.value = "";
    this.selectedCountry = null;
    this.selectedCity = null;
    document.getElementById("selected-destination").classList.add("hidden");
    document
      .getElementById("dashboard-country-info-section")
      .classList.add("hidden");
  });

  // enter key on search
  countrySelect.addEventListener("keypress", (e) => {
    if (e.key === "Enter") this.handleCountrySearch();
  });

  // countries on startup
  this.loadCountries();

  // current year in dropdown
  const currentYear = new Date().getFullYear();
  yearSelect.value = currentYear;
  this.selectedYear = currentYear;
};

// available countries
AppState.loadCountries = async function () {
  try {
    this.showLoading("Loading countries...");
    const response = await fetch(`${this.apis.nagerBase}/AvailableCountries`);
    const countries = await response.json();
    this.countries = countries;

    const select = document.getElementById("global-country");

    // clear existing options except first
    while (select.options.length > 1) select.remove(1);

    // add countries
    countries.forEach((country) => {
      const option = document.createElement("option");
      option.value = country.countryCode;
      option.textContent = `${this.getFlagEmoji(country.countryCode)} ${country.name}`;
      select.appendChild(option);
    });

    // set egypt as default
    select.value = "EG";

    this.hideLoading();
  } catch (error) {
    console.error("Error loading countries:", error);
    this.hideLoading();
    this.showToast("Failed to load countries. Using default data.", "error");
  }
};

// get flag emoji from country code
AppState.getFlagEmoji = function (countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
};

// location helpers
AppState.geocodeCity = async function (cityName, countryCode) {
  // open-meteo geocoding endpoint
  const url =
    `https://geocoding-api.open-meteo.com/v1/search` +
    `?name=${encodeURIComponent(cityName)}` +
    `&count=1&language=en&format=json` +
    `&country_code=${encodeURIComponent(countryCode)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding failed");

  const data = await res.json();
  const hit = data?.results?.[0];
  if (!hit) throw new Error("No geocoding results");

  return {
    name: hit.name,
    latitude: hit.latitude,
    longitude: hit.longitude,
    timezone: hit.timezone,
  };
};

// header text updater
AppState.updateViewHeaders = function () {
  // events header
  const eventsP = document.querySelector("#events-view .view-header-content p");
  if (eventsP) {
    eventsP.textContent = `Discover concerts, sports, theatre and more in ${this.selectedCity || "your city"}`;
  }

  const weatherP = document.querySelector(
    "#weather-view .view-header-content p",
  );
  if (weatherP) {
    weatherP.textContent = `Check 7-day weather forecasts for ${this.selectedCity || "your city"}`;
  }

  const sunP = document.querySelector("#sun-times-view .view-header-content p");
  if (sunP) {
    sunP.textContent = `Plan your activities around golden hour in ${this.selectedCity || "your city"}`;
  }
};

// events
AppState.loadEvents = async function () {
  const container = document.getElementById("events-content");
  if (!this.selectedCountry) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fa-solid fa-ticket"></i></div>
        <h3>Select a Country First</h3>
        <p>Please go to the Dashboard and select a country to view events.</p>
        <button class="btn-primary" onclick="AppState.navigateToView('dashboard')">
          <i class="fa-solid fa-compass"></i> Go to Dashboard
        </button>
      </div>
    `;
    return;
  }

  // mock events
  const city = this.selectedCity || this.selectedCountry.capital || "City";
  const categories = [
    "Music",
    "Sports",
    "Arts",
    "Festival",
    "Comedy",
    "Nightlife",
  ];
  const venues = [
    `${city} Opera House`,
    `${city} Stadium`,
    `${city} Cultural Center`,
    `${city} Downtown Arena`,
    `${city} Grand Theatre`,
    `${city} Open Air Park`,
  ];

  const baseDate = new Date();
  this.events = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + (i + 5) * 3);

    const title = `${categories[i]} Night in ${city}`;
    return {
      id: `${this.selectedCountry.code}-${city}-${i}`,
      title,
      category: categories[i],
      dateText: d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      locationText: `${venues[i]}, ${city}`,
      ticketUrl: `https://www.google.com/search?q=${encodeURIComponent(title + " tickets")}`,
      imageUrl: [
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=400&fit=crop",
        "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=400&fit=crop",
        "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&h=400&fit=crop",
        "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&h=400&fit=crop",
        "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=400&fit=crop",
        "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=400&fit=crop",
      ][i],
    };
  });

  this.renderEvents();
};

AppState.renderEvents = function () {
  const container = document.getElementById("events-content");
  if (!this.events?.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fa-solid fa-ticket"></i></div>
        <h3>No Events Found</h3>
        <p>No events found for ${this.selectedCity}.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = this.events
    .map((ev) => {
      const isSaved = this.savedPlans.some(
        (p) => p.type === "event" && p.data.title === ev.title,
      );

      return `
        <div class="event-card" data-ticket-url="${ev.ticketUrl}">
          <div class="event-card-image">
            <img src="${ev.imageUrl}" alt="${ev.title}">
            <span class="event-card-category">${ev.category}</span>
            <button class="event-card-save"><i class="${isSaved ? "fa-solid" : "fa-regular"} fa-heart"></i></button>
          </div>
          <div class="event-card-body">
            <h3>${ev.title}</h3>
            <div class="event-card-info">
              <div><i class="fa-regular fa-calendar"></i>${ev.dateText}</div>
              <div><i class="fa-solid fa-location-dot"></i>${ev.locationText}</div>
            </div>
            <div class="event-card-footer">
              <button class="btn-event"><i class="${isSaved ? "fa-solid" : "fa-regular"} fa-heart"></i> ${isSaved ? "Saved" : "Save"}</button>
              <a href="${ev.ticketUrl}" class="btn-buy-ticket" target="_blank" rel="noopener noreferrer">
                <i class="fa-solid fa-ticket"></i> Buy Tickets
              </a>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
};

// country search handler
AppState.handleCountrySearch = async function () {
  const countryCode = document.getElementById("global-country").value;
  const year = document.getElementById("global-year").value;

  if (!countryCode) {
    this.showToast("Please select a country first!", "error");
    return;
  }

  const chosen = this.countries.find((c) => c.countryCode === countryCode);

  // normalize shape so the rest of the app doesn't explode
  this.selectedCountry = {
    code: countryCode,
    name: chosen?.name || countryCode,
    flag: `https://flagcdn.com/w80/${countryCode.toLowerCase()}.png`,
    capital: null,
    timezone: null,
  };

  this.selectedYear = parseInt(year);

  // show selection UI
  const selectionDisplay = document.getElementById("selected-destination");
  selectionDisplay.classList.remove("hidden");

  document.getElementById("selected-country-flag").src =
    this.selectedCountry.flag;
  document.getElementById("selected-country-name").textContent =
    this.selectedCountry.name;

  // country info visibility
  document
    .getElementById("dashboard-country-info-section")
    .classList.remove("hidden");

  // load country details
  await this.loadCountryInfo();

  // force capital every time
  const citySelect = document.getElementById("global-city");
  const capital = this.selectedCountry.capital || "Capital";
  this.selectedCity = capital;

  // update options
  if (citySelect) {
    citySelect.innerHTML = "";
    const opt = document.createElement("option");
    opt.value = capital;
    opt.textContent = capital;
    citySelect.appendChild(opt);
    citySelect.value = capital;
  }

  document.getElementById("selected-city-name").textContent =
    ` • ${this.selectedCity}`;

  // update view headers + badges + reload current view data
  this.updateViewHeaders();
  this.updateAllViews();
};

// country information
AppState.loadCountryInfo = async function () {
  try {
    this.showLoading("Loading country information...");

    const code =
      this.selectedCountry?.code || this.selectedCountry?.countryCode;
    if (!code) throw new Error("Missing country code");

    const response = await fetch(`${this.apis.restCountries}/alpha/${code}`);
    const data = await response.json();
    const country = Array.isArray(data) ? data[0] : data;

    if (!country) throw new Error("No country data returned");

    // compute values
    const capital = country.capital?.[0] || "N/A";

    const details = {
      capital: capital,
      population: country.population?.toLocaleString() || "N/A",
      area:
        country.area != null ? `${country.area.toLocaleString()} km²` : "N/A",
      continent: country.continents?.[0] || "N/A",
      "calling code": country.idd?.root
        ? country.idd.root + (country.idd?.suffixes?.[0] || "")
        : "N/A",
      "driving side": country.car?.side || "N/A",
      "week starts": country.startOfWeek || "Monday",
    };

    // save capital
    this.selectedCountry.capital = capital;

    const latlng = country.capitalInfo?.latlng || country.latlng || null;
    if (latlng && latlng.length >= 2) {
      this.selectedCountry.lat = latlng[0];
      this.selectedCountry.lon = latlng[1];
    }

    // capital is default
    if (!this.selectedCity) {
      this.selectedCity = capital !== "N/A" ? capital : "";
      const cityBadge = document.getElementById("selected-city-name");
      if (cityBadge)
        cityBadge.textContent = this.selectedCity
          ? ` • ${this.selectedCity}`
          : "";
    }

    //  update City dropdown
    const citySelect = document.getElementById("global-city");
    if (citySelect) {
      const current = this.selectedCity;
      citySelect.innerHTML = "";

      // Capital option
      if (capital && capital !== "N/A") {
        const opt = document.createElement("option");
        opt.value = capital;
        opt.textContent = `${capital} (Capital)`;
        citySelect.appendChild(opt);
      }

      if (current && current !== capital) {
        const opt2 = document.createElement("option");
        opt2.value = current;
        opt2.textContent = current;
        citySelect.appendChild(opt2);
      }

      if (citySelect.options.length === 0) {
        const opt0 = document.createElement("option");
        opt0.value = "";
        opt0.textContent = "N/A";
        citySelect.appendChild(opt0);
      }

      // set selection
      citySelect.value = current || capital || "";
    }

    // update dashboard country card
    const infoSection = document.getElementById("dashboard-country-info");
    if (!infoSection) return;

    // Header fields
    const bigFlag = infoSection.querySelector(".dashboard-country-flag");
    if (bigFlag)
      bigFlag.src = `https://flagcdn.com/w160/${code.toLowerCase()}.png`;

    const h3 = infoSection.querySelector("h3");
    if (h3) h3.textContent = country.name?.common || this.selectedCountry.name;

    const official = infoSection.querySelector(".official-name");
    if (official) official.textContent = country.name?.official || "";

    const region = infoSection.querySelector(".region");
    if (region) {
      const reg = country.region || "N/A";
      const sub = country.subregion || "N/A";
      region.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${reg} • ${sub}`;
    }

    // Details grid
    const detailCards = infoSection.querySelectorAll(
      ".dashboard-country-detail",
    );
    detailCards.forEach((card) => {
      const label = card
        .querySelector(".label")
        ?.textContent?.trim()
        ?.toLowerCase();
      const valueEl = card.querySelector(".value");
      if (!label || !valueEl) return;

      if (details[label] != null) valueEl.textContent = details[label];
    });

    // Currency
    const currency = country.currencies
      ? Object.entries(country.currencies)[0]
      : null;
    const currencyText = currency
      ? `${currency[1].name} (${currency[0]} ${currency[1].symbol || ""})`.trim()
      : "N/A";

    // Languages
    const languages = country.languages
      ? Object.values(country.languages).join(", ")
      : "N/A";

    const extraTagsGroups = infoSection.querySelectorAll(".extra-tags");
    if (extraTagsGroups[0])
      extraTagsGroups[0].innerHTML = `<span class="extra-tag">${currencyText}</span>`;
    if (extraTagsGroups[1])
      extraTagsGroups[1].innerHTML = `<span class="extra-tag">${languages}</span>`;

    this.hideLoading();
  } catch (error) {
    console.error("Error loading country info:", error);
    this.hideLoading();
    this.showToast(
      "Failed to load country info (using existing card).",
      "error",
    );
    // Store capital + timezone for
    this.selectedCountry.capital = details.capital;
    this.selectedCountry.timezone = country.timezones?.[0] || null;
  }
};

// holidays count for stats
AppState.loadHolidaysCount = async function () {
  try {
    const response = await fetch(
      `${this.apis.nagerBase}/PublicHolidays/${this.selectedYear}/${this.selectedCountry.code}`,
    );
    const holidays = await response.json();
    document.getElementById("stat-holidays").textContent = holidays.length;
  } catch (error) {
    console.error("Error loading holidays count:", error);
  }
};

// update all views after country change
AppState.updateAllViews = function () {
  // update selection badges in all views
  document.querySelectorAll(".current-selection-badge").forEach((badge) => {
    const flag = badge.querySelector(".selection-flag");
    const countrySpan = badge.querySelector(
      "span:not(.selection-year):not(.selection-city)",
    );
    const yearSpan = badge.querySelector(".selection-year");
    const citySpan = badge.querySelector(".selection-city");

    if (flag)
      flag.src = `https://flagcdn.com/w40/${this.selectedCountry.code.toLowerCase()}.png`;
    if (countrySpan) countrySpan.textContent = this.selectedCountry.name;
    if (yearSpan) yearSpan.textContent = this.selectedYear;
    if (citySpan) citySpan.textContent = ` • ${this.selectedCity}`;
  });

  // update stats
  document.getElementById("stat-countries").textContent = this.countries.length;
  this.updateStats();

  // load data for current view
  const currentView = document
    .querySelector(".view.active")
    .id.replace("-view", "");
  this.loadViewData(currentView);
};

// holydays page
AppState.loadHolidays = async function () {
  if (!this.selectedCountry) {
    document.getElementById("holidays-content").innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fa-solid fa-globe"></i></div>
                <h3>Select a Country First</h3>
                <p>Please go to the Dashboard and select a country to view holidays.</p>
                <button class="btn-primary" onclick="AppState.navigateToView('dashboard')">
                    <i class="fa-solid fa-compass"></i> Go to Dashboard
                </button>
            </div>
        `;
    return;
  }

  try {
    this.showLoading("Loading holidays...");

    const response = await fetch(
      `${this.apis.nagerBase}/PublicHolidays/${this.selectedYear}/${this.selectedCountry.code}`,
    );
    this.holidays = await response.json();

    this.renderHolidays();
    this.hideLoading();
  } catch (error) {
    console.error("Error loading holidays:", error);
    this.hideLoading();

    // showing mock data on error
    this.holidays = this.getMockHolidays();
    this.renderHolidays();
    this.showToast("Using sample holiday data", "info");
  }
};

// render holidays
AppState.renderHolidays = function () {
  const container = document.getElementById("holidays-content");

  if (!this.holidays || this.holidays.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fa-solid fa-calendar-xmark"></i></div>
                <h3>No Holidays Found</h3>
                <p>No public holidays found for ${this.selectedCountry.name} in ${this.selectedYear}.</p>
            </div>
        `;
    return;
  }

  container.innerHTML = this.holidays
    .map((holiday) => {
      const date = new Date(holiday.date);
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      const isSaved = this.savedPlans.some(
        (plan) => plan.type === "holiday" && plan.data.date === holiday.date,
      );

      return `
            <div class="holiday-card">
                <div class="holiday-card-header">
                    <div class="holiday-date-box">
                        <span class="day">${date.getDate()}</span>
                        <span class="month">${monthNames[date.getMonth()]}</span>
                    </div>
                    <button class="holiday-action-btn" data-holiday='${JSON.stringify(holiday)}'>
                        <i class="${isSaved ? "fa-solid" : "fa-regular"} fa-heart"></i>
                    </button>
                </div>
                <h3>${holiday.localName}</h3>
                <p class="holiday-name">${holiday.name}</p>
                <div class="holiday-card-footer">
                    <span class="holiday-day-badge">
                        <i class="fa-regular fa-calendar"></i> ${dayNames[date.getDay()]}
                    </span>
                    <span class="holiday-type-badge">${holiday.types?.[0] || "Public"}</span>
                </div>
            </div>
        `;
    })
    .join("");

  // listeners to save buttons
  container.querySelectorAll(".holiday-action-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const holiday = JSON.parse(btn.getAttribute("data-holiday"));
      this.saveHoliday(holiday, btn);
    });
  });
};

// mock holidays for fallback
AppState.getMockHolidays = function () {
  const year = this.selectedYear;
  return [
    {
      date: `${year}-01-01`,
      localName: "New Year's Day",
      name: "New Year's Day",
      countryCode: this.selectedCountry.code,
      fixed: true,
      global: true,
      types: ["Public"],
    },
    {
      date: `${year}-05-01`,
      localName: "Labour Day",
      name: "International Workers' Day",
      countryCode: this.selectedCountry.code,
      fixed: true,
      global: true,
      types: ["Public"],
    },
    {
      date: `${year}-12-25`,
      localName: "Christmas Day",
      name: "Christmas Day",
      countryCode: this.selectedCountry.code,
      fixed: true,
      global: true,
      types: ["Public"],
    },
  ];
};

// weather page
AppState.loadWeather = async function () {
  if (!this.selectedCountry) {
    document.getElementById("weather-content").innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fa-solid fa-cloud-sun"></i></div>
        <h3>Select a City First</h3>
        <p>Please go to the Dashboard and select a country to view weather.</p>
        <button class="btn-primary" onclick="AppState.navigateToView('dashboard')">
          <i class="fa-solid fa-compass"></i> Go to Dashboard
        </button>
      </div>
    `;
    return;
  }

  try {
    this.showLoading("Loading weather...");

    const city = this.selectedCity || this.selectedCountry.capital || "Capital";
    const geo = await this.geocodeCity(city, this.selectedCountry.code);

    // save timezone
    this.selectedCountry.timezone =
      geo.timezone || this.selectedCountry.timezone;

    const response = await fetch(
      `${this.apis.openMeteo}/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}` +
        `&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m` +
        `&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset` +
        `&timezone=auto`,
    );

    this.weather = await response.json();
    this.renderWeather();
    this.hideLoading();
  } catch (error) {
    console.error("Error loading weather:", error);
    this.hideLoading();
    this.weather = this.getMockWeather();
    this.renderWeather();
    this.showToast("Using sample weather data", "info");
  }
};

// render weather
AppState.renderWeather = function () {
  const weather = this.weather;
  const container = document.getElementById("weather-content");

  if (!weather) return;

  // mapping codes to icons
  const weatherIcons = {
    0: "fa-solid fa-sun",
    1: "fa-solid fa-cloud-sun",
    2: "fa-solid fa-cloud",
    3: "fa-solid fa-cloud",
    45: "fa-solid fa-smog",
    48: "fa-solid fa-smog",
    51: "fa-solid fa-cloud-rain",
    53: "fa-solid fa-cloud-rain",
    55: "fa-solid fa-cloud-rain",
    61: "fa-solid fa-cloud-rain",
    63: "fa-solid fa-cloud-showers-heavy",
    65: "fa-solid fa-cloud-showers-heavy",
    71: "fa-solid fa-snowflake",
    73: "fa-solid fa-snowflake",
    75: "fa-solid fa-snowflake",
    80: "fa-solid fa-cloud-showers-heavy",
    81: "fa-solid fa-cloud-showers-heavy",
    82: "fa-solid fa-cloud-showers-heavy",
    95: "fa-solid fa-bolt",
    96: "fa-solid fa-bolt",
    99: "fa-solid fa-bolt",
  };

  const current = weather.current;
  const daily = weather.daily;

  // current weather
  const currentIcon = weatherIcons[current.weather_code] || "fa-solid fa-cloud";
  const currentTemp = Math.round(current.temperature_2m);

  // hourly forecast
  const hourlyHTML = Array.from({ length: 8 }, (_, i) => {
    const hour = (new Date().getHours() + i) % 24;
    const temp = currentTemp + Math.floor(Math.random() * 3) - 1;
    return `
            <div class="hourly-item ${i === 0 ? "now" : ""}">
                <span class="hourly-time">${i === 0 ? "Now" : `${hour}:00`}</span>
                <div class="hourly-icon"><i class="${currentIcon}"></i></div>
                <span class="hourly-temp">${temp}°</span>
            </div>
        `;
  }).join("");

  // 7 days forecast
  const forecastHTML = daily.time
    .map((date, i) => {
      const day = new Date(date);
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      const isToday = i === 0;
      const maxTemp = Math.round(daily.temperature_2m_max[i]);
      const minTemp = Math.round(daily.temperature_2m_min[i]);

      return `
            <div class="forecast-day ${isToday ? "today" : ""}">
                <div class="forecast-day-name">
                    <span class="day-label">${isToday ? "Today" : dayNames[day.getDay()]}</span>
                    <span class="day-date">${day.getDate()} ${monthNames[day.getMonth()]}</span>
                </div>
                <div class="forecast-icon"><i class="${currentIcon}"></i></div>
                <div class="forecast-temps">
                    <span class="temp-max">${maxTemp}°</span>
                    <span class="temp-min">${minTemp}°</span>
                </div>
                <div class="forecast-precip"></div>
            </div>
        `;
    })
    .join("");

  container.innerHTML = `
        <!-- Current Weather Hero -->
        <div class="weather-hero-card weather-sunny">
            <div class="weather-location">
                <i class="fa-solid fa-location-dot"></i>
                <span>${this.selectedCity}</span>
                <span class="weather-time">${new Date().toLocaleDateString(
                  "en-US",
                  {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  },
                )}</span>
            </div>
            <div class="weather-hero-main">
                <div class="weather-hero-left">
                    <div class="weather-hero-icon"><i class="${currentIcon}"></i></div>
                    <div class="weather-hero-temp">
                        <span class="temp-value">${currentTemp}</span>
                        <span class="temp-unit">°C</span>
                    </div>
                </div>
                <div class="weather-hero-right">
                    <div class="weather-condition">Clear sky</div>
                    <div class="weather-feels">Feels like ${currentTemp - 1}°C</div>
                    <div class="weather-high-low">
                        <span class="high"><i class="fa-solid fa-arrow-up"></i> ${Math.round(daily.temperature_2m_max[0])}°</span>
                        <span class="low"><i class="fa-solid fa-arrow-down"></i> ${Math.round(daily.temperature_2m_min[0])}°</span>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Weather Details Grid -->
        <div class="weather-details-grid">
            <div class="weather-detail-card">
                <div class="detail-icon humidity"><i class="fa-solid fa-droplet"></i></div>
                <div class="detail-info">
                    <span class="detail-label">Humidity</span>
                    <span class="detail-value">${current.relative_humidity_2m}%</span>
                </div>
            </div>
            <div class="weather-detail-card">
                <div class="detail-icon wind"><i class="fa-solid fa-wind"></i></div>
                <div class="detail-info">
                    <span class="detail-label">Wind</span>
                    <span class="detail-value">${current.wind_speed_10m} km/h</span>
                </div>
            </div>
            <div class="weather-detail-card">
                <div class="detail-icon uv"><i class="fa-solid fa-sun"></i></div>
                <div class="detail-info">
                    <span class="detail-label">UV Index</span>
                    <span class="detail-value">6</span>
                </div>
            </div>
            <div class="weather-detail-card">
                <div class="detail-icon precip"><i class="fa-solid fa-cloud-rain"></i></div>
                <div class="detail-info">
                    <span class="detail-label">Precipitation</span>
                    <span class="detail-value">0%</span>
                </div>
            </div>
        </div>
        
        <!-- Hourly Forecast -->
        <div class="weather-section">
            <h3 class="weather-section-title"><i class="fa-solid fa-clock"></i> Hourly Forecast</h3>
            <div class="hourly-scroll">
                ${hourlyHTML}
            </div>
        </div>
        
        <!-- 7-Day Forecast -->
        <div class="weather-section">
            <h3 class="weather-section-title"><i class="fa-solid fa-calendar-week"></i> 7-Day Forecast</h3>
            <div class="forecast-list">
                ${forecastHTML}
            </div>
        </div>
    `;
};

// mock weather data
AppState.getMockWeather = function () {
  const now = new Date();
  const dates = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() + i);
    dates.push(date.toISOString().split("T")[0]);
  }

  return {
    current: {
      temperature_2m: 22,
      weather_code: 0,
      relative_humidity_2m: 45,
      wind_speed_10m: 15,
    },
    daily: {
      time: dates,
      temperature_2m_max: [25, 24, 23, 21, 22, 24, 25],
      temperature_2m_min: [12, 11, 12, 10, 11, 12, 13],
      sunrise: dates.map(() => "06:42"),
      sunset: dates.map(() => "17:24"),
    },
  };
};

// saving functionality
AppState.setupSaveButtons = function () {
  // delegation for all save buttons
  document.addEventListener("click", (e) => {
    // holiday save buttons
    if (e.target.closest(".holiday-action-btn")) {
      const btn = e.target.closest(".holiday-action-btn");
      const holidayData = btn.getAttribute("data-holiday");

      if (holidayData) {
        const holiday = JSON.parse(holidayData);
        this.saveHoliday(holiday, btn);
      }
    }

    // event save buttons
    if (e.target.closest(".event-card-save, .btn-event")) {
      const card = e.target.closest(".event-card");
      this.saveEvent(card);
    }

    // long weekend save buttons
    if (e.target.closest(".lw-card .holiday-action-btn")) {
      const card = e.target.closest(".lw-card");
      this.saveLongWeekend(card);
    }
  });
};

// save a holiday
AppState.saveHoliday = function (holiday, button) {
  const isSaved = this.savedPlans.some(
    (plan) => plan.type === "holiday" && plan.data.date === holiday.date,
  );

  if (isSaved) {
    // remove from saved
    this.savedPlans = this.savedPlans.filter(
      (plan) => !(plan.type === "holiday" && plan.data.date === holiday.date),
    );
    this.saveToStorage();

    if (button) {
      button.innerHTML = '<i class="fa-regular fa-heart"></i>';
    }

    this.showToast("Holiday removed from plans", "info");
  } else {
    // add to saved
    this.addPlan("holiday", {
      name: holiday.name,
      localName: holiday.localName,
      date: holiday.date,
      country: this.selectedCountry.name,
    });

    if (button) {
      button.innerHTML = '<i class="fa-solid fa-heart"></i>';
    }
  }

  this.updatePlansCounter();
};

// save an event
AppState.saveEvent = function (eventCard) {
  const eventTitle = eventCard.querySelector("h3").textContent;
  const eventDate = eventCard.querySelector(
    ".event-card-info div:nth-child(1)",
  ).textContent;
  const eventLocation = eventCard.querySelector(
    ".event-card-info div:nth-child(2)",
  ).textContent;

  const isSaved = this.savedPlans.some(
    (plan) => plan.type === "event" && plan.data.title === eventTitle,
  );

  if (isSaved) {
    // remove
    this.savedPlans = this.savedPlans.filter(
      (plan) => !(plan.type === "event" && plan.data.title === eventTitle),
    );
    this.saveToStorage();

    const saveBtn = eventCard.querySelector(".event-card-save, .btn-event");
    if (saveBtn) {
      saveBtn.innerHTML = '<i class="fa-regular fa-heart"></i>';
      if (saveBtn.classList.contains("btn-event")) {
        saveBtn.innerHTML = '<i class="fa-regular fa-heart"></i> Save';
      }
    }

    this.showToast("Event removed from plans", "info");
  } else {
    // add
    this.addPlan("event", {
      title: eventTitle,
      date: eventDate,
      location: eventLocation,
      category:
        eventCard.querySelector(".event-card-category")?.textContent ||
        "General",
    });

    const saveBtn = eventCard.querySelector(".event-card-save, .btn-event");
    if (saveBtn) {
      saveBtn.innerHTML = '<i class="fa-solid fa-heart"></i>';
      if (saveBtn.classList.contains("btn-event")) {
        saveBtn.innerHTML = '<i class="fa-solid fa-heart"></i> Saved';
      }
    }
  }

  this.updatePlansCounter();
};

// save a long weekend
AppState.saveLongWeekend = function (lwCard) {
  const title = lwCard.querySelector("h3").textContent;
  const dates = lwCard.querySelector(".lw-dates").textContent;

  const isSaved = this.savedPlans.some(
    (plan) => plan.type === "longweekend" && plan.data.title === title,
  );

  if (isSaved) {
    // remove
    this.savedPlans = this.savedPlans.filter(
      (plan) => !(plan.type === "longweekend" && plan.data.title === title),
    );
    this.saveToStorage();

    const saveBtn = lwCard.querySelector(".holiday-action-btn");
    if (saveBtn) {
      saveBtn.innerHTML = '<i class="fa-regular fa-heart"></i>';
    }

    this.showToast("Long weekend removed from plans", "info");
  } else {
    // add
    this.addPlan("longweekend", {
      title: title,
      dates: dates,
      duration: lwCard.querySelector(".lw-badge").textContent,
    });

    const saveBtn = lwCard.querySelector(".holiday-action-btn");
    if (saveBtn) {
      saveBtn.innerHTML = '<i class="fa-solid fa-heart"></i>';
    }
  }

  this.updatePlansCounter();
};

// currency converter
AppState.setupCurrencyConverter = function () {
  const convertBtn = document.getElementById("convert-btn");
  const swapBtn = document.getElementById("swap-currencies-btn");
  const amountInput = document.getElementById("currency-amount");

  // convert button
  convertBtn.addEventListener("click", () => this.convertCurrency());

  // swap currencies
  swapBtn.addEventListener("click", () => this.swapCurrencies());

  // enter key on amount input
  amountInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") this.convertCurrency();
  });

  // quick convert cards
  document
    .getElementById("popular-currencies")
    ?.addEventListener("click", (e) => {
      const card = e.target.closest(".popular-currency-card");
      if (card) {
        const code = card.querySelector(".code").textContent;
        this.setCurrencyTo(code);
      }
    });

  // initial conversion
  this.convertCurrency();
};

// convert currency
AppState.convertCurrency = function () {
  const fromCurrency = document.getElementById("currency-from").value;
  const toCurrency = document.getElementById("currency-to").value;
  const amount =
    parseFloat(document.getElementById("currency-amount").value) || 0;

  if (!this.exchangeRates) {
    this.showToast("Exchange rates not loaded yet", "error");
    return;
  }

  // convert to USD first, then to target currency
  const amountInUSD = amount / this.exchangeRates[fromCurrency];
  const convertedAmount = amountInUSD * this.exchangeRates[toCurrency];

  // update display
  const resultDiv = document.getElementById("currency-result");
  const rate =
    this.exchangeRates[toCurrency] / this.exchangeRates[fromCurrency];

  resultDiv.innerHTML = `
        <div class="conversion-display">
            <div class="conversion-from">
                <span class="amount">${amount.toFixed(2)}</span>
                <span class="currency-code">${fromCurrency}</span>
            </div>
            <div class="conversion-equals"><i class="fa-solid fa-equals"></i></div>
            <div class="conversion-to">
                <span class="amount">${convertedAmount.toFixed(2)}</span>
                <span class="currency-code">${toCurrency}</span>
            </div>
        </div>
        <div class="exchange-rate-info">
            <p>1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency}</p>
            <small>Last updated: ${new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}</small>
        </div>
    `;

  // update quick convert cards
  this.updateQuickConvertCards(fromCurrency, amount);
};

// swap currencies
AppState.swapCurrencies = function () {
  const fromSelect = document.getElementById("currency-from");
  const toSelect = document.getElementById("currency-to");

  const temp = fromSelect.value;
  fromSelect.value = toSelect.value;
  toSelect.value = temp;

  this.convertCurrency();
};

// set target currency
AppState.setCurrencyTo = function (currencyCode) {
  document.getElementById("currency-to").value = currencyCode;
  this.convertCurrency();
};

// update quick convert cards
AppState.updateQuickConvertCards = function (baseCurrency, amount) {
  const cards = document.querySelectorAll(".popular-currency-card");
  const baseRate = this.exchangeRates[baseCurrency];

  cards.forEach((card) => {
    const code = card.querySelector(".code").textContent;
    if (code !== baseCurrency) {
      const rate = this.exchangeRates[code] / baseRate;
      card.querySelector(".rate").textContent = rate.toFixed(4);
    } else {
      card.querySelector(".rate").textContent = "1.0000";
    }
  });
};

// my plans
AppState.renderPlans = function (filter = "all") {
  const container = document.getElementById("plans-content");

  let plansToShow = this.savedPlans;
  if (filter !== "all") {
    plansToShow = this.savedPlans.filter((plan) => plan.type === filter);
  }

  if (plansToShow.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fa-solid fa-${
                      filter === "all"
                        ? "heart-crack"
                        : filter === "holiday"
                          ? "calendar-xmark"
                          : filter === "event"
                            ? "ticket"
                            : "umbrella-beach"
                    }"></i>
                </div>
                <h3>No ${filter === "all" ? "Saved" : filter.charAt(0).toUpperCase() + filter.slice(1)} Plans Yet</h3>
                <p>Start exploring and save ${filter === "all" ? "holidays, events, or long weekends" : filter + "s"} you like!</p>
                <button class="btn-primary" onclick="AppState.navigateToView('${filter === "all" ? "dashboard" : filter + "s"}')">
                    <i class="fa-solid fa-compass"></i> Start Exploring
                </button>
            </div>
        `;
    return;
  }

  container.innerHTML = plansToShow
    .map((plan) => this.renderPlanCard(plan))
    .join("");

  // add delete buttons functionality
  container.querySelectorAll(".plan-delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const planId = parseInt(btn.getAttribute("data-plan-id"));
      this.deletePlan(planId);
    });
  });
};

// render a single plan card
AppState.renderPlanCard = function (plan) {
  const date = new Date(plan.savedAt);
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  let cardContent = "";

  switch (plan.type) {
    case "holiday":
      cardContent = `
                <div class="plan-icon"><i class="fa-solid fa-calendar-days"></i></div>
                <div class="plan-content">
                    <h3>${plan.data.name}</h3>
                    <p class="plan-desc">${plan.data.localName}</p>
                    <div class="plan-meta">
                        <span><i class="fa-solid fa-calendar"></i> ${plan.data.date}</span>
                        <span><i class="fa-solid fa-flag"></i> ${plan.data.country}</span>
                    </div>
                </div>
            `;
      break;

    case "event":
      cardContent = `
                <div class="plan-icon"><i class="fa-solid fa-ticket"></i></div>
                <div class="plan-content">
                    <h3>${plan.data.title}</h3>
                    <p class="plan-desc">${plan.data.location}</p>
                    <div class="plan-meta">
                        <span><i class="fa-solid fa-calendar"></i> ${plan.data.date}</span>
                        <span><i class="fa-solid fa-tag"></i> ${plan.data.category}</span>
                    </div>
                </div>
            `;
      break;

    case "longweekend":
      cardContent = `
                <div class="plan-icon"><i class="fa-solid fa-umbrella-beach"></i></div>
                <div class="plan-content">
                    <h3>${plan.data.title}</h3>
                    <p class="plan-desc">${plan.data.dates}</p>
                    <div class="plan-meta">
                        <span><i class="fa-solid fa-clock"></i> ${plan.data.duration}</span>
                        <span><i class="fa-solid fa-location-dot"></i> ${plan.city}</span>
                    </div>
                </div>
            `;
      break;

    default:
      cardContent = `
                <div class="plan-icon"><i class="fa-solid fa-heart"></i></div>
                <div class="plan-content">
                    <h3>Saved Plan</h3>
                    <p class="plan-desc">Saved on ${formattedDate}</p>
                </div>
            `;
  }

  return `
        <div class="plan-card plan-${plan.type}">
            ${cardContent}
            <button class="plan-delete-btn" data-plan-id="${plan.id}">
                <i class="fa-solid fa-trash"></i>
            </button>
            <div class="plan-saved-date">
                <i class="fa-regular fa-clock"></i> ${formattedDate}
            </div>
        </div>
    `;
};

// delete a single plan
AppState.deletePlan = function (planId) {
  Swal.fire({
    title: "Delete Plan?",
    text: "Are you sure you want to delete this plan?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Yes, delete it!",
  }).then((result) => {
    if (result.isConfirmed) {
      this.removePlan(planId);
      this.renderPlans();
      this.showToast("Plan deleted successfully", "success");
    }
  });
};

// utiility functions
AppState.showLoading = function (message = "Loading...") {
  const overlay = document.getElementById("loading-overlay");
  const text = document.getElementById("loading-text");

  text.textContent = message;
  overlay.classList.remove("hidden");
};

AppState.hideLoading = function () {
  const overlay = document.getElementById("loading-overlay");
  overlay.classList.add("hidden");
};

// initialization
// Wait for dom to load
document.addEventListener("DOMContentLoaded", () => {
  // initialize the app
  AppState.init();

  // browser back/forward buttons handler
  window.addEventListener("popstate", (event) => {
    if (event.state && event.state.view) {
      AppState.navigateToView(event.state.view);
    }
  });

  // url based on current view
  const currentView = document
    .querySelector(".view.active")
    .id.replace("-view", "");
  window.history.replaceState({ view: currentView }, "", `/${currentView}`);
});

// globally available for onclick handlers
window.AppState = AppState;
